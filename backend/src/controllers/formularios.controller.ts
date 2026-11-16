import { Response } from 'express';
import { pool } from '../config/database';
import { FormularioHistorial, FormularioReunion } from '../entities';
import { AuthenticatedRequest } from '../middleware';
import { GuardarFormularioDatos } from '../validations';

// Los permisos se validan antes de llegar aquí (ver routes/reuniones.routes.ts):
// - requireMiembro: cualquier integrante del grupo puede leer el formulario
// - requireEditorFormulario: solo administrador o secretaria pueden guardarlo
// El contenido ya viene validado por src/validations/formulario.validation.ts

async function listarHistorial(reunionId: number) {
    const result = await pool.query<FormularioHistorial & { usuario_nombre: string }>(
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

        const result = await pool.query<FormularioReunion>(
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
        const { contenido: contenidoLimpio } = req.body as GuardarFormularioDatos;

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

        const result = await client.query<FormularioReunion>(
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
