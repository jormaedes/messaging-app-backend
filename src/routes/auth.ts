import { Router } from "express";
import { signup, login, me } from "../controllers/auth.js";
import { signupValidator, loginValidator } from "../validators/auth.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.post("/signup", signupValidator, validate, signup);
router.post("/login", loginValidator, validate, login);
router.get("/me", requireAuth, me);

export default router;