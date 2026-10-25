import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { obtenerSecreto } from '../helpers/jwt.helper';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
    };
}

export function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Response | void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Token no proporcionado'
        });
    }

    const token = authHeader.split(' ')[1];
    const secreto = obtenerSecreto();

    try {
        const decoded = jwt.verify(token, secreto) as { id: number };

        req.user = { id: decoded.id };
        next();
    } catch {
        return res.status(401).json({
            error: 'Token inválido o expirado'
        });
    }
}
