import type { RequestHandler } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { userLite } from "../lib/selects.js";

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