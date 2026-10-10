import type { RequestHandler } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { userLite } from "../lib/selects.js";
import { getIO, userRoom } from "../socket/index.js"

const conversationInclude = {
    participants: { include: { user: { select: userLite } } },
} as const;

async function isParticipant(userId: string, conversationId: string) {
    const participant = await prisma.participant.findUnique({
        where: { userId_conversationId: { userId, conversationId } },
    });
    return participant !== null;
}

// Abre (ou devolve) a conversa privada entre eu e outro utilizador
export const openDirect: RequestHandler = async (req, res) => {
    const me: string = res.locals.userId;
    const { userId: otherId } = matchedData(req);

    if (otherId === me) {
        res.status(400).json({ message: "Não podes iniciar uma conversa contigo próprio" });
        return;
    }

    const other = await prisma.user.findUnique({ where: { id: otherId } });
    if (!other) {
        res.status(404).json({ message: "Utilizador não encontrado" });
        return;
    }

    const directKey = [me, otherId].sort().join(":");

    const existing = await prisma.conversation.findUnique({
        where: { directKey },
        include: conversationInclude,
    });
    if (existing) {
        res.json({ conversation: existing });
        return;
    }

    try {
        const conversation = await prisma.conversation.create({
            data: {
                directKey,
                participants: { create: [{ userId: me }, { userId: otherId }] },
            },
            include: conversationInclude,
        });
        res.status(201).json({ conversation });
    } catch (err) {
        // Os dois utilizadores criaram ao mesmo tempo: a base de dados rejeitou o segundo
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            const conversation = await prisma.conversation.findUnique({
                where: { directKey },
                include: conversationInclude,
            });
            res.json({ conversation });
            return;
        }
        throw err;
    }
};

export const listConversations: RequestHandler = async (_req, res) => {
    const me: string = res.locals.userId;

    const conversations = await prisma.conversation.findMany({
        where: { participants: { some: { userId: me } } },
        orderBy: { updatedAt: "desc" },
        include: {
            ...conversationInclude,
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
    });

    res.json({
        conversations: conversations.map(({ messages, ...conversation }) => ({
            ...conversation,
            lastMessage: messages[0] ?? null,
        })),
    });
};

export const listMessages: RequestHandler = async (req, res) => {
    const me: string = res.locals.userId;
    const { id: conversationId, cursor, limit = 30 } = matchedData(req);

    if (!(await isParticipant(me, conversationId))) {
        res.status(404).json({ message: "Conversa não encontrada" });
        return;
    }

    const rows = await prisma.message.findMany({
        where: { conversationId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1, // pedimos mais uma para saber se há página seguinte
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { sender: { select: userLite } },
    });

    const hasMore = rows.length > limit;
    const messages = hasMore ? rows.slice(0, limit) : rows;

    res.json({
        messages, // da mais recente para a mais antiga
        nextCursor: hasMore ? messages[messages.length - 1].id : null,
    });
};

export const sendMessage: RequestHandler = async (req, res) => {
    const me: string = res.locals.userId;
    const { id: conversationId, content } = matchedData(req);

    if (!(await isParticipant(me, conversationId))) {
        res.status(404).json({ message: "Conversa não encontrada" });
        return;
    }

    const [message] = await prisma.$transaction([
        prisma.message.create({
            data: { content, senderId: me, conversationId },
            include: { sender: { select: userLite } },
        }),
        prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }, // sobe a conversa na lista
        }),
    ]);

    const participants = await prisma.participant.findMany({
        where: { conversationId },
        select: { userId: true }
    });

    // Emite para todos participantes, incluindo o proprio remetente
    getIO()
        .to(participants.map((p) => userRoom(p.userId)))
        .emit("message:new", message);

    res.status(201).json({ message });
};