import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";

export const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.use("/auth", authRoutes);

app.use((_req, res) => {
    res.status(404).json({ message: "Rota não encontrada" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: "Erro interno do servidor" });
};

app.use(errorHandler);