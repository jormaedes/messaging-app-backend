import type { RequestHandler } from "express";
import { matchedData } from "express-validator";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { signToken } from '../lib/jwt.js';
import { userSelf } from "../lib/selects.js";


export const signup: RequestHandler = async (req, res) => {
    const { username, email, password } = matchedData(req);
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: { username, email, passwordHash },
            select: userSelf,
        });
        res.status(201).json({ token: signToken(user.id), user });
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            res.status(409).json({ message: "Username ou email já está em uso" });
            return;
        }
        throw err;
    }
};

export const login: RequestHandler = async (req, res) => {
    const { email, password } = matchedData(req);

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !valid) {
        res.status(401).json({ message: "Email ou password incorretos" });
        return;
    }

    const { passwordHash, ...safeUser } = user;
    res.json({ token: signToken(user.id), user: safeUser });
};

export const me: RequestHandler = async (_req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: res.locals.userId },
        select: userSelf,
    });
    if (!user) {
        res.status(404).json({ message: "Utilizador não encontrado" });
        return;
    }
    res.json({ user });
};