import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(userId: string): string {
    return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: '7d' });
}

export function verifyToken(token: string) {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || !payload.sub) {
        throw new Error('Token inválido');
    }
    return payload.sub;
}