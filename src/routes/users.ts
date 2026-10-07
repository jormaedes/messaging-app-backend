import { Router } from "express";
import { searchUsers } from "../controllers/users.js";
import { searchUsersValidator } from "../validators/conversations.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/", requireAuth, searchUsersValidator, validate, searchUsers);

export default router;