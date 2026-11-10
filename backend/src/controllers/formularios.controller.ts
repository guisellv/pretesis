import { Response } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware';

type FalloValidacion = { status: number; error: string };

// Roles que pueden crear y modificar el formulario. El resto de integrantes solo lo lee.
const ROLES_EDITORES = ['administrador', 'secretaria'];

async function validarAcceso(
    reunionId: number,
    usuarioId: number,
    necesitaEditar: boolean
): Promise<FalloValidacion | null> {
    if (!Number.isInteger(reunionId) || reunionId <= 0) {
        return { status: 400, error: 'La reunión no es válida' };
    }

    const reunion = await pool.query(
        'SELECT grupo_id FROM reuniones WHERE id = $1',
        [reunionId]
    );

    if (reunion.rowCount === 0) {
        return { status: 404, error: 'La reunión no existe' };
    }

    const miembro = await pool.query(
        `SELECT rol
         FROM usuarios_grupos
         WHERE usuario_id = $1 AND grupo_id = $2`,
        [usuarioId, reunion.rows[0].grupo_id]
    );

    if ((miembro.rowCount ?? 0) === 0) {
        return { status: 403, error: 'No perteneces a este grupo' };
    }

    const rol = String(miembro.rows[0].rol).toLowerCase();
    if (necesitaEditar && !ROLES_EDITORES.includes(rol)) {
        return { status: 403, error: 'Solo el administrador o la secretaria pueden modificar el formulario' };
    }

    return null;
}

async function listarHistorial(reunionId: number) {
    const result = await pool.query(
        `SELECT h.id, h.accion, h.fecha, h.usuario_id, h.contenido,
                COALESCE(u."nombreCompleto", 'Usuario eliminado') AS usuario_nombre
         FROM formularios_historial h
         LEFT JOIN users u ON u.id = h.usuario_id
         WHERE h.reunion_id = $1
         ORDER BY h.fecha DESC, h.id DESC`,
        [reunionId]
    );

    return result.rows;
}

export async function obtenerFormulario(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const reunionId = Number(req.params.id);
        const fallo = await validarAcceso(reunionId, req.user!.id, false);

        if (fallo) {
            return res.status(fallo.status).json({ error: fallo.error });
        }

        const result = await pool.query(
            `SELECT reunion_id, contenido, actualizado_en
             FROM formularios_reunion
             WHERE reunion_id = $1`,
            [reunionId]
        );

        return res.status(200).json({
            formulario: result.rows[0] ?? null,
            historial: await listarHistorial(reunionId),
        });
    } catch (error) {
        console.error('Error al obtener formulario:', error);
        return res.status(500).json({ error: 'No se pudo cargar el formulario' });
    }
}

export async function guardarFormulario(req: AuthenticatedRequest, res: Response): Promise<any> {
    const client = await pool.connect();

    try {
        const reunionId = Number(req.params.id);
        const usuarioId = req.user!.id;
        const { contenido } = req.body;

        const fallo = await validarAcceso(reunionId, usuarioId, true);
        if (fallo) {
            return res.status(fallo.status).json({ error: fallo.error });
        }

        if (typeof contenido !== 'string' || !contenido.trim()) {
            return res.status(400).json({ error: 'El formulario no puede estar vacío' });
        }

        const contenidoLimpio = contenido.trim();

        // Transacción: el formulario y su registro en el historial se guardan juntos o ninguno
        await client.query('BEGIN');

        const anterior = await client.query(
            'SELECT contenido FROM formularios_reunion WHERE reunion_id = $1 FOR UPDATE',
            [reunionId]
        );
        const existia = (anterior.rowCount ?? 0) > 0;

        // Si no cambió nada, no se guarda ni se registra en el historial
        if (existia && anterior.rows[0].contenido === contenidoLimpio) {
            await client.query('ROLLBACK');
            const actual = await pool.query(
                'SELECT reunion_id, contenido, actualizado_en FROM formularios_reunion WHERE reunion_id = $1',
                [reunionId]
            );
            return res.status(200).json({
                formulario: actual.rows[0],
                historial: await listarHistorial(reunionId),
            });
        }

        const result = await client.query(
            `INSERT INTO formularios_reunion (reunion_id, contenido, actualizado_en)
             VALUES ($1, $2, NOW())
             ON CONFLICT (reunion_id)
             DO UPDATE SET contenido = EXCLUDED.contenido, actualizado_en = NOW()
             RETURNING reunion_id, contenido, actualizado_en`,
            [reunionId, contenidoLimpio]
        );

        await client.query(
            `INSERT INTO formularios_historial (reunion_id, usuario_id, accion, contenido)
             VALUES ($1, $2, $3, $4)`,
            [reunionId, usuarioId, existia ? 'modificó' : 'creó', contenidoLimpio]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            formulario: result.rows[0],
            historial: await listarHistorial(reunionId),
        });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error('Error al guardar formulario:', error);
        return res.status(500).json({ error: 'No se pudo guardar el formulario' });
    } finally {
        client.release();
    }
}
