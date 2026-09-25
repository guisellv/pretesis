import { Request, Response } from 'express';
import { pool } from '../config/database';

async function esAdministrador(usuarioId: number, grupoId: number): Promise<boolean> {
    const result = await pool.query(
        `SELECT 1
         FROM usuarios_grupos
         WHERE usuario_id = $1 AND grupo_id = $2 AND LOWER(rol) = 'administrador'`,
        [usuarioId, grupoId]
    );

    return (result.rowCount ?? 0) > 0;
}

function calcularFechaFin(fechaInicio: string, fechaFin?: string): string | null {
    if (fechaFin) return fechaFin;

    const coincidencia = fechaInicio.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!coincidencia) return null;

    const [, anio, mes, dia, horas, minutos] = coincidencia;
    const inicio = new Date(Date.UTC(
        Number(anio),
        Number(mes) - 1,
        Number(dia),
        Number(horas),
        Number(minutos),
    ));

    inicio.setUTCHours(inicio.getUTCHours() + 1);

    const pad = (valor: number) => String(valor).padStart(2, '0');
    return `${inicio.getUTCFullYear()}-${pad(inicio.getUTCMonth() + 1)}-${pad(inicio.getUTCDate())}T${pad(inicio.getUTCHours())}:${pad(inicio.getUTCMinutes())}`;
}

export async function listarReuniones(req: Request, res: Response): Promise<any> {
    try {
        const grupoId = Number(req.query.grupo_id);
        const usuarioId = Number(req.query.usuario_id);

        if (!Number.isInteger(grupoId) || !Number.isInteger(usuarioId)) {
            return res.status(400).json({ error: 'El grupo y el usuario son obligatorios' });
        }

        const acceso = await pool.query(
            `SELECT 1 FROM usuarios_grupos WHERE usuario_id = $1 AND grupo_id = $2`,
            [usuarioId, grupoId]
        );

        if (acceso.rowCount === 0) {
            return res.status(403).json({ error: 'No perteneces a este grupo' });
        }

        const result = await pool.query(
            `SELECT id, grupo_id, titulo, descripcion, fecha_inicio, fecha_fin
             FROM reuniones
             WHERE grupo_id = $1
             ORDER BY fecha_inicio`,
            [grupoId]
        );

        return res.status(200).json({ reuniones: result.rows });
    } catch (error) {
        console.error('Error al listar reuniones:', error);
        return res.status(500).json({ error: 'No se pudieron cargar las reuniones' });
    }
}

export async function crearReunion(req: Request, res: Response): Promise<any> {
    try {
        const { grupo_id, usuario_id, titulo, descripcion, fecha_inicio, fecha_fin } = req.body;

        if (!grupo_id || !usuario_id || !titulo || !fecha_inicio) {
            return res.status(400).json({ error: 'Título, fecha, grupo y usuario son obligatorios' });
        }

        const fechaFinCalculada = calcularFechaFin(fecha_inicio, fecha_fin);
        if (!fechaFinCalculada) {
            return res.status(400).json({ error: 'La fecha de inicio no es válida' });
        }

        if (!(await esAdministrador(Number(usuario_id), Number(grupo_id)))) {
            return res.status(403).json({ error: 'Solo el administrador puede crear reuniones' });
        }

        const result = await pool.query(
            `INSERT INTO reuniones (grupo_id, titulo, descripcion, fecha_inicio, fecha_fin)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, grupo_id, titulo, descripcion, fecha_inicio, fecha_fin`,
            [grupo_id, titulo.trim(), descripcion?.trim() || '', fecha_inicio, fechaFinCalculada]
        );

        return res.status(201).json({ reunion: result.rows[0] });
    } catch (error) {
        console.error('Error al crear reunión:', error);
        return res.status(500).json({ error: 'No se pudo crear la reunión' });
    }
}

export async function actualizarReunion(req: Request, res: Response): Promise<any> {
    try {
        const reunionId = Number(req.params.id);
        const { usuario_id, titulo, descripcion, fecha_inicio, fecha_fin } = req.body;

        const reunion = await pool.query(
            'SELECT grupo_id FROM reuniones WHERE id = $1',
            [reunionId]
        );

        if (reunion.rowCount === 0) {
            return res.status(404).json({ error: 'La reunión no existe' });
        }

        if (!(await esAdministrador(Number(usuario_id), reunion.rows[0].grupo_id))) {
            return res.status(403).json({ error: 'Solo el administrador puede editar reuniones' });
        }

        const fechaFinCalculada = calcularFechaFin(fecha_inicio, fecha_fin);
        if (!fechaFinCalculada) {
            return res.status(400).json({ error: 'La fecha de inicio no es válida' });
        }

        const result = await pool.query(
            `UPDATE reuniones
             SET titulo = $1, descripcion = $2, fecha_inicio = $3, fecha_fin = $4
             WHERE id = $5
             RETURNING id, grupo_id, titulo, descripcion, fecha_inicio, fecha_fin`,
            [titulo.trim(), descripcion?.trim() || '', fecha_inicio, fechaFinCalculada, reunionId]
        );

        return res.status(200).json({ reunion: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar reunión:', error);
        return res.status(500).json({ error: 'No se pudo actualizar la reunión' });
    }
}

export async function eliminarReunion(req: Request, res: Response): Promise<any> {
    try {
        const reunionId = Number(req.params.id);
        const usuarioId = Number(req.query.usuario_id);

        const reunion = await pool.query(
            'SELECT grupo_id FROM reuniones WHERE id = $1',
            [reunionId]
        );

        if (reunion.rowCount === 0) {
            return res.status(404).json({ error: 'La reunión no existe' });
        }

        if (!(await esAdministrador(usuarioId, reunion.rows[0].grupo_id))) {
            return res.status(403).json({ error: 'Solo el administrador puede eliminar reuniones' });
        }

        await pool.query('DELETE FROM reuniones WHERE id = $1', [reunionId]);
        return res.status(204).send();
    } catch (error) {
        console.error('Error al eliminar reunión:', error);
        return res.status(500).json({ error: 'No se pudo eliminar la reunión' });
    }
}