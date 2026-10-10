import { Router } from "express";
import {
    openDirect,
    listConversations,
    listMessages,
    sendMessage,
    markAsRead,
} from "../controllers/conversations.js";
import {
    conversationIdValidator,
    directConversationValidator,
    listMessagesValidator,
    sendMessageValidator,
} from "../validators/conversations.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.use(requireAuth); // tudo aqui exige login

router.get("/", listConversations);
router.post("/direct", directConversationValidator, validate, openDirect);
router.post("/:id/read", conversationIdValidator, validate, markAsRead);
router.get("/:id/messages", listMessagesValidator, validate, listMessages);
router.post("/:id/messages", sendMessageValidator, validate, sendMessage);

export default router;