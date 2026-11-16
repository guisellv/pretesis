import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/configEnv';

export function generarToken(id: number): string {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verificarToken(token: string): { id: number } {
    return jwt.verify(token, JWT_SECRET) as { id: number };
}
