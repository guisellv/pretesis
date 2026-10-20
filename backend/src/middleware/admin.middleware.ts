import { NextFunction, Response } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from './auth.middleware';

export async function requireAdmin(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<Response | void> {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                error: 'No autorizado'
            });
        }

        let grupoId = Number(
            req.body?.grupo_id ?? req.query?.grupo_id ?? req.params?.grupoId
        );

        if (!grupoId && req.params?.id) {
            const reunion = await pool.query(
                'SELECT grupo_id FROM reuniones WHERE id = $1',
                [Number(req.params.id)]
            );

            if (reunion.rowCount === 0) {
                return res.status(404).json({
                    error: 'La reunión no existe'
                });
            }

            grupoId = Number(reunion.rows[0].grupo_id);
        }

        if (!Number.isInteger(grupoId) || grupoId <= 0) {
            return res.status(400).json({
                error: 'No se pudo determinar el grupo'
            });
        }

        const result = await pool.query(
            `SELECT 1
             FROM usuarios_grupos
             WHERE usuario_id = $1 AND grupo_id = $2 AND LOWER(rol) = 'administrador'`,
            [req.user.id, grupoId]
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(403).json({
                error: 'Solo el administrador puede realizar esta acción'
            });
        }

        next();
    } catch (error) {
        console.error('Error en requireAdmin:', error);
        return res.status(500).json({
            error: 'Error al validar permisos'
        });
    }
}
