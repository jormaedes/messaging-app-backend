import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyToken } from '../lib/jwt.js'

let io: Server | null = null;

// Nome da room privada de cada utilizador;
export const userRoom = (userId: string) => `user:${userId}`;

export function initSocket(httpServer: HttpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: env.CLIENT_URL, credentials: true
        }
    });

    // Corre uma vez por ligação, antes do evento "connection"
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (typeof token !== 'string')
                throw new Error("Token em falta");
            socket.data.userId = verifyToken(token);
            next();
        }
        catch {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(userRoom(socket.data.userId));
    })

    return io;
}

export function getIO() {
    if(!io)
        throw new Error('Socket.IO não foi inicializado');
    return io;
}
