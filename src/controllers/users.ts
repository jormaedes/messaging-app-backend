import type { RequestHandler } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { userLite } from "../lib/selects.js";
import { Prisma } from "../generated/prisma/client.js";
import { userSelf } from "../lib/selects.js";

export const updateMe: RequestHandler = async (req, res) => {
    // No Express 5, req.body é undefined se o pedido não trouxer corpo JSON
    const body = req.body ?? {};

    // Whitelist: só estes três campos podem ser alterados por esta rota
    const { displayName, bio, avatarUrl } = body as {
        displayName?: string | null;
        bio?: string | null;
        avatarUrl?: string | null;
    };

    if (displayName === undefined && bio === undefined && avatarUrl === undefined) {
        res.status(400).json({ message: "Nenhum campo para actualizar" });
        return;
    }

    try {
        const user = await prisma.user.update({
            where: { id: res.locals.userId },
            data: {
                displayName,
                bio: bio === "" ? null : bio, // bio vazia = sem bio
                avatarUrl,
            },
            select: userSelf,
        });
        res.json({ user });
    } catch (err) {
        // Token válido de um utilizador que entretanto foi apagado
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
            res.status(404).json({ message: "Utilizador não encontrado" });
            return;
        }
        throw err;
    }
};

export const searchUsers: RequestHandler = async (_req, res) => {
    const { search } = matchedData(_req);

    const users = await prisma.user.findMany({
        where: {
            username: { contains: search, mode: "insensitive" },
            id: { not: res.locals.userId }, // não me mostrar a mim próprio
        },
        select: userLite,
        take: 20,
        orderBy: { username: "asc" },
    });

    res.json({ users });
};