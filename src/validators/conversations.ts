import { body, param, query } from "express-validator";

export const searchUsersValidator = [
    query("search").trim().isLength({ min: 1, max: 30 }).withMessage("Pesquisa inválida"),
];

export const directConversationValidator = [
    body("userId").isUUID().withMessage("userId inválido"),
];

export const conversationIdValidator = [
    param("id").isUUID().withMessage("Id de conversa inválido"),
];

export const listMessagesValidator = [
    ...conversationIdValidator,
    query("cursor").optional().isUUID().withMessage("Cursor inválido"),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const sendMessageValidator = [
    ...conversationIdValidator,
    body("content")
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage("A mensagem deve ter entre 1 e 2000 caracteres"),
];