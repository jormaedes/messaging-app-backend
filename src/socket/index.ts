import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { verifyToken } from "../lib/jwt.js";
import { userRoom } from "./rooms.js";
import { handleConnect, handleDisconnect } from "./presence.js";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
    const server = new Server(httpServer, {
        cors: { origin: env.CLIENT_URL, credentials: true },
    });

    server.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (typeof token !== "string") throw new Error("Token em falta");
            socket.data.userId = verifyToken(token);
            next();
        } catch {
            next(new Error("Unauthorized"));
        }
    });

    server.on("connection", (socket) => {
        socket.join(userRoom(socket.data.userId));
        void handleConnect(server, socket);
        socket.on("disconnect", () => handleDisconnect(server, socket));
    });

    io = server;
    return server;
}

export function getIO() {
    if (!io)
        throw new Error("Socket.IO não foi inicializado");
    return io;
}