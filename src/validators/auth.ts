import { body } from "express-validator";

export const signupValidator = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("O username deve ter entre 3 e 20 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("O username só pode ter letras, números e _")
    .toLowerCase(),
  body("email").trim().isEmail().withMessage("Email inválido").toLowerCase(),
  body("password")
    .isLength({ min: 8, max: 72 })
    .withMessage("A password deve ter entre 8 e 72 caracteres"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("As passwords não coincidem"),
];

export const loginValidator = [
  body("email").trim().isEmail().withMessage("Email inválido").toLowerCase(),
  body("password").notEmpty().withMessage("A password é obrigatória"),
];