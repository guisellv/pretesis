import { NextFunction, Request, Response } from 'express';
import { RolGrupo } from '../entities';
import { verificarToken } from '../helpers/jwt.helper';

export interface AuthenticatedRequest extends Request {
    // Lo completa requireAuth
    user?: {
        id: number;
    };
    // Lo completan requireMiembro / requireAdmin / requireEditorFormulario
    grupo?: {
        id: number;
        rol: RolGrupo;
    };
}

// Exige un token JWT válido en el header "Authorization: Bearer <token>".
// Se usa en todas las rutas de /api/grupos y /api/reuniones (ver routes/).
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

    try {
        const decoded = verificarToken(token);

        req.user = { id: decoded.id };
        next();
    } catch {
        return res.status(401).json({
            error: 'Token inválido o expirado'
        });
    }
}
