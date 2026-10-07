import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const requireAuth: RequestHandler = (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
        res.status(401).json({ message: "Token em falta" });
        return;
    }

    try {
        const payload = jwt.verify(token, env.JWT_SECRET);
        res.locals.userId = typeof payload === "string" ? payload : payload.sub;
        next();
    } catch {
        res.status(401).json({ message: "Token inválido ou expirado" });
    }
};