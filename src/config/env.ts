import "dotenv/config";

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Variável de ambiente em falta: ${name}`);
    return value;
}

export const env = {
    PORT: Number(process.env.PORT) || 4000,
    DATABASE_URL: required("DATABASE_URL"),
    JWT_SECRET: required("JWT_SECRET"),
    CLIENT_URL: required("CLIENT_URL"),
};