import type { RequestHandler } from "express";
import { verifyToken } from '../lib/jwt.js'
import { env } from "../config/env.js";

export const requireAuth: RequestHandler = (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
        res.status(401).json({ message: "Token em falta" });
        return;
    }

    try {
        res.locals.userId = verifyToken(token)
        next();
    } catch {
        res.status(401).json({ message: "Token inválido ou expirado" });
    }
};