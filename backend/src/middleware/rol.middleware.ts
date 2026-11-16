import { NextFunction, Response } from 'express';
import { pool } from '../config/database';
import { RolGrupo } from '../entities';
import { AuthenticatedRequest } from './auth.middleware';

type Fallo = { status: number; error: string };

// Averigua de qué grupo se trata la petición, en este orden:
// 1. params.grupoId (integrantes)
// 2. params.id: se busca el grupo de esa reunión (editar/eliminar reunión, formulario).
//    Va antes que body/query para que nadie pueda mandar el grupo_id de otro grupo y editar una reunión ajena.
// 3. body.grupo_id (crear reunión) o query.grupo_id (listar reuniones)
async function resolverGrupoId(req: AuthenticatedRequest): Promise<number | Fallo> {
    if (req.params?.grupoId) return Number(req.params.grupoId);

    if (req.params?.id) {
        const reunion = await pool.query<{ grupo_id: number }>(
            'SELECT grupo_id FROM reuniones WHERE id = $1',
            [Number(req.params.id)]
        );

        if (reunion.rowCount === 0) {
            return { status: 404, error: 'La reunión no existe' };
        }

        return Number(reunion.rows[0].grupo_id);
    }

    const grupoId = Number(req.body?.grupo_id ?? req.query?.grupo_id);
    if (grupoId) return grupoId;

    return { status: 400, error: 'No se pudo determinar el grupo' };
}

// Crea un middleware que deja pasar solo a los integrantes del grupo con alguno de los roles indicados.
// Con roles = null basta con pertenecer al grupo. Deja en req.grupo el id y el rol del usuario.
export function requireRol(roles: RolGrupo[] | null, mensaje: string) {
    // Los roles vienen de constantes del código (no del cliente), por eso se pueden poner en el SQL
    const filtroRol = roles
        ? ` AND LOWER(rol) IN (${roles.map((rol) => `'${rol.toLowerCase()}'`).join(', ')})`
        : '';

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ error: 'No autorizado' });
            }

            const grupoId = await resolverGrupoId(req);

            if (typeof grupoId !== 'number') {
                return res.status(grupoId.status).json({ error: grupoId.error });
            }

            if (!Number.isInteger(grupoId) || grupoId <= 0) {
                return res.status(400).json({ error: 'No se pudo determinar el grupo' });
            }

            const result = await pool.query<{ rol: RolGrupo }>(
                `SELECT rol
                 FROM usuarios_grupos
                 WHERE usuario_id = $1 AND grupo_id = $2${filtroRol}`,
                [req.user.id, grupoId]
            );

            if ((result.rowCount ?? 0) === 0) {
                return res.status(403).json({ error: mensaje });
            }

            req.grupo = { id: grupoId, rol: result.rows[0].rol };
            next();
        } catch (error) {
            console.error('Error al validar permisos:', error);
            return res.status(500).json({ error: 'Error al validar permisos' });
        }
    };
}

// Cualquier integrante del grupo (para ver reuniones, integrantes y formularios)
export const requireMiembro = requireRol(null, 'No perteneces a este grupo');

// Administrador o secretaria (para crear y modificar el formulario/acta de una reunión)
export const requireEditorFormulario = requireRol(
    ['Administrador', 'Secretaria'],
    'Solo el administrador o la secretaria pueden modificar el formulario'
);
