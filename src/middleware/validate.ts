import type { RequestHandler } from "express";
import { validationResult } from "express-validator";

export const validate: RequestHandler = (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
        next();
        return;
    }
    res.status(400).json({
        errors: result.array({ onlyFirstError: true }).map((e) => ({
            field: e.type === "field" ? e.path : undefined,
            message: e.msg,
        })),
    });
};