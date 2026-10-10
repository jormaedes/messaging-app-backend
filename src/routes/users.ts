import { Router } from "express";
import { searchUsers, updateMe } from "../controllers/users.js";
import { searchUsersValidator } from "../validators/conversations.js";
import { updateProfileValidator } from "../validators/users.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/", requireAuth, searchUsersValidator, validate, searchUsers);
router.patch("/me", requireAuth, updateProfileValidator, validate, updateMe);

export default router;