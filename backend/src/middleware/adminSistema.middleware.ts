import { NextFunction, Response } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from './auth.middleware';

// Solo el administrador del sistema (users.rol = 'admin'). Se usa en /api/usuarios (gestión de usuarios).
// Es distinto del administrador de un grupo, que solo manda dentro de su grupo.
export async function requireAdminSistema(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        const result = await pool.query<{ rol: string }>('SELECT rol FROM users WHERE id = $1', [req.user!.id]);

        if (result.rows[0]?.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo el administrador del sistema puede gestionar usuarios' });
        }

        next();
    } catch (error) {
        console.error('Error al validar administrador del sistema:', error);
        return res.status(500).json({ error: 'Error al validar permisos' });
    }
}
