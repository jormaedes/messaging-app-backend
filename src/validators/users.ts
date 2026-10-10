import { body } from "express-validator";

export const updateProfileValidator = [
	body("displayName")
		.optional({ values: "null" })
		.isString().withMessage("Nome inválido").bail()
		.trim()
		.isLength({ min: 1, max: 50 })
		.withMessage("O nome deve ter entre 1 e 50 caracteres"),

	body("bio")
		.optional({ values: "null" })
		.isString().withMessage("Bio inválida").bail()
		.trim()
		.isLength({ max: 160 })
		.withMessage("A bio pode ter no máximo 160 caracteres"),

	body("avatarUrl")
		.optional({ values: "null" })
		.isString().withMessage("URL inválido").bail()
		.trim()
		.isLength({ max: 500 }).withMessage("O URL é demasiado longo").bail()
		.isURL({ protocols: ["http", "https"], require_protocol: true })
		.withMessage("O avatar deve ser um URL http(s) válido"),
];