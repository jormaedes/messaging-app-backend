import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { userRoom } from "./rooms.js";

const OFFLINE_GRACE_MS = 3000;

const connections = new Map<string, number>(); // userId -> nº de sockets ligados
const offlineTimers = new Map<string, NodeJS.Timeout>();

const isOnline = (userId: string) => (connections.get(userId) ?? 0) > 0;

// Utilizadores com quem partilho pelo menos uma conversa
async function getContactIds(userId: string): Promise<string[]> {
	const rows = await prisma.participant.findMany({
		where: {
			userId: { not: userId },
			conversation: { participants: { some: { userId } } },
		},
		select: { userId: true },
		distinct: ["userId"],
	});
	return rows.map((r) => r.userId);
}

async function broadcast(
	io: Server,
	userId: string,
	payload: { online: boolean; lastSeenAt?: Date },
) {
	const contacts = await getContactIds(userId);
	if (contacts.length === 0) return;
	io.to(contacts.map((id) => userRoom(id))).emit("presence:update", { userId, ...payload });
}

export async function handleConnect(io: Server, socket: Socket) {
	const userId: string = socket.data.userId;

	try {
		// Se havia um "offline" agendado (ex.: refresh), cancela-o
		const pending = offlineTimers.get(userId);
		if (pending) {
			clearTimeout(pending);
			offlineTimers.delete(userId);
		}

		const alreadyOnline = isOnline(userId) || pending !== undefined;
		connections.set(userId, (connections.get(userId) ?? 0) + 1);

		// Estado inicial: quais dos meus contactos estão online agora
		const contacts = await getContactIds(userId);
		socket.emit("presence:init", { onlineUserIds: contacts.filter(isOnline) });

		if (!alreadyOnline) await broadcast(io, userId, { online: true });
	} catch (err) {
		console.error("Erro na presença (connect):", err);
	}
}

export function handleDisconnect(io: Server, socket: Socket) {
	const userId: string = socket.data.userId;
	const remaining = (connections.get(userId) ?? 1) - 1;

	if (remaining > 0) {
		connections.set(userId, remaining); // ainda tem outros separadores abertos
		return;
	}
	connections.delete(userId);

	const timer = setTimeout(async () => {
		offlineTimers.delete(userId);
		try {
			const { lastSeenAt } = await prisma.user.update({
				where: { id: userId },
				data: { lastSeenAt: new Date() },
				select: { lastSeenAt: true },
			});
			await broadcast(io, userId, { online: false, lastSeenAt: lastSeenAt ?? undefined });
		} catch (err) {
			console.error("Erro na presença (disconnect):", err);
		}
	}, OFFLINE_GRACE_MS);

	offlineTimers.set(userId, timer);
}