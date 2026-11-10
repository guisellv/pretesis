import { Response } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware';
import { tituloValido } from '../helpers/titulo.helper';

const ERROR_TITULO = 'El título de la reunión debe tener al menos una letra, no puede ser solo números';

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

const COLUMNAS_REUNION = 'id, grupo_id, titulo, descripcion, fecha_inicio, fecha_fin, modalidad, plataforma, enlace, direccion';

type DatosModalidad = {
    modalidad: 'online' | 'presencial';
    plataforma: string | null;
    enlace: string | null;
    direccion: string | null;
};

// Valida la modalidad y deja solo los datos que corresponden a ella
function validarModalidad(body: any): { datos?: DatosModalidad; error?: string } {
    const modalidad = typeof body.modalidad === 'string' ? body.modalidad.trim().toLowerCase() : '';

    if (modalidad === 'online') {
        const plataforma = typeof body.plataforma === 'string' ? body.plataforma.trim() : '';
        const enlace = typeof body.enlace === 'string' ? body.enlace.trim() : '';

        if (!plataforma || !enlace) {
            return { error: 'Para una reunión online indica la plataforma y el enlace' };
        }

        try {
            const url = new URL(enlace);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
        } catch {
            return { error: 'El enlace de la reunión no es válido (debe comenzar con http:// o https://)' };
        }

        return { datos: { modalidad, plataforma, enlace, direccion: null } };
    }

    if (modalidad === 'presencial') {
        const direccion = typeof body.direccion === 'string' ? body.direccion.trim() : '';

        if (!direccion) {
            return { error: 'Para una reunión presencial indica la dirección' };
        }

        return { datos: { modalidad, plataforma: null, enlace: null, direccion } };
    }

    return { error: 'Selecciona si la reunión es online o presencial' };
}

// fecha_inicio llega como "YYYY-MM-DDTHH:MM" en hora local (sin zona horaria)
function esFechaPasada(fechaInicio: string): boolean {
    const coincidencia = fechaInicio.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!coincidencia) return false;

    const [, anio, mes, dia, horas, minutos] = coincidencia.map(Number);
    const inicio = new Date(anio, mes - 1, dia, horas, minutos);

    // Se compara contra el minuto actual para permitir crear una reunión "ahora mismo"
    const ahora = new Date();
    ahora.setSeconds(0, 0);

    return inicio.getTime() < ahora.getTime();
}

// Reuniones del mismo grupo cuyo horario se cruza con [inicio, fin)
async function buscarChoques(grupoId: number, inicio: string, fin: string, excluirId: number | null) {
    const result = await pool.query(
        `SELECT id, titulo, fecha_inicio, fecha_fin
         FROM reuniones
         WHERE grupo_id = $1
           AND ($4::int IS NULL OR id <> $4)
           AND fecha_inicio < $3::timestamp
           AND fecha_fin > $2::timestamp
         ORDER BY fecha_inicio`,
        [grupoId, inicio, fin, excluirId]
    );

    return result.rows;
}

export async function listarReuniones(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const grupoId = Number(req.query.grupo_id);
        const usuarioId = req.user!.id;

        if (!Number.isInteger(grupoId)) {
            return res.status(400).json({ error: 'El grupo es obligatorio' });
        }

        const acceso = await pool.query(
            `SELECT 1 FROM usuarios_grupos WHERE usuario_id = $1 AND grupo_id = $2`,
            [usuarioId, grupoId]
        );

        if (acceso.rowCount === 0) {
            return res.status(403).json({ error: 'No perteneces a este grupo' });
        }

        const result = await pool.query(
            `SELECT ${COLUMNAS_REUNION}
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

export async function crearReunion(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const { grupo_id, titulo, descripcion, fecha_inicio, fecha_fin } = req.body;
        const usuarioId = req.user!.id;

        if (!grupo_id || !titulo || !fecha_inicio) {
            return res.status(400).json({ error: 'Título, fecha y grupo son obligatorios' });
        }

        if (!tituloValido(titulo)) {
            return res.status(400).json({ error: ERROR_TITULO });
        }

        const fechaFinCalculada = calcularFechaFin(fecha_inicio, fecha_fin);
        if (!fechaFinCalculada) {
            return res.status(400).json({ error: 'La fecha de inicio no es válida' });
        }

        const { datos: modalidad, error: errorModalidad } = validarModalidad(req.body);
        if (!modalidad) {
            return res.status(400).json({ error: errorModalidad });
        }

        if (!(await esAdministrador(usuarioId, Number(grupo_id)))) {
            return res.status(403).json({ error: 'Solo el administrador puede crear reuniones' });
        }

        if (esFechaPasada(fecha_inicio)) {
            return res.status(400).json({ error: 'No puedes crear una reunión en una fecha u hora que ya pasó' });
        }

        if (req.body.confirmar_choque !== true) {
            const choques = await buscarChoques(Number(grupo_id), fecha_inicio, fechaFinCalculada, null);
            if (choques.length > 0) {
                return res.status(409).json({
                    error: 'El horario choca con otra reunión del grupo',
                    choques,
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO reuniones (grupo_id, titulo, descripcion, fecha_inicio, fecha_fin, modalidad, plataforma, enlace, direccion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING ${COLUMNAS_REUNION}`,
            [
                grupo_id, titulo.trim(), descripcion?.trim() || '', fecha_inicio, fechaFinCalculada,
                modalidad.modalidad, modalidad.plataforma, modalidad.enlace, modalidad.direccion,
            ]
        );

        return res.status(201).json({ reunion: result.rows[0] });
    } catch (error) {
        console.error('Error al crear reunión:', error);
        return res.status(500).json({ error: 'No se pudo crear la reunión' });
    }
}

export async function actualizarReunion(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const reunionId = Number(req.params.id);
        const { titulo, descripcion, fecha_inicio, fecha_fin } = req.body;
        const usuarioId = req.user!.id;

        if (!titulo || !fecha_inicio) {
            return res.status(400).json({ error: 'Título y fecha son obligatorios' });
        }

        if (!tituloValido(titulo)) {
            return res.status(400).json({ error: ERROR_TITULO });
        }

        const fechaFinCalculada = calcularFechaFin(fecha_inicio, fecha_fin);
        if (!fechaFinCalculada) {
            return res.status(400).json({ error: 'La fecha de inicio no es válida' });
        }

        const reunion = await pool.query(
            `SELECT grupo_id, fecha_inicio = $2::timestamp AS misma_fecha
             FROM reuniones
             WHERE id = $1`,
            [reunionId, fecha_inicio]
        );

        if (reunion.rowCount === 0) {
            return res.status(404).json({ error: 'La reunión no existe' });
        }

        const { grupo_id: grupoId, misma_fecha: mismaFecha } = reunion.rows[0];

        if (!(await esAdministrador(usuarioId, grupoId))) {
            return res.status(403).json({ error: 'Solo el administrador puede editar reuniones' });
        }

        const { datos: modalidad, error: errorModalidad } = validarModalidad(req.body);
        if (!modalidad) {
            return res.status(400).json({ error: errorModalidad });
        }

        // Si no se movió la fecha, se permite editar una reunión que ya pasó (ej. corregir el título)
        if (!mismaFecha) {
            if (esFechaPasada(fecha_inicio)) {
                return res.status(400).json({ error: 'No puedes mover la reunión a una fecha u hora que ya pasó' });
            }

            if (req.body.confirmar_choque !== true) {
                const choques = await buscarChoques(grupoId, fecha_inicio, fechaFinCalculada, reunionId);
                if (choques.length > 0) {
                    return res.status(409).json({
                        error: 'El horario choca con otra reunión del grupo',
                        choques,
                    });
                }
            }
        }

        const result = await pool.query(
            `UPDATE reuniones
             SET titulo = $1, descripcion = $2, fecha_inicio = $3, fecha_fin = $4,
                 modalidad = $5, plataforma = $6, enlace = $7, direccion = $8
             WHERE id = $9
             RETURNING ${COLUMNAS_REUNION}`,
            [
                titulo.trim(), descripcion?.trim() || '', fecha_inicio, fechaFinCalculada,
                modalidad.modalidad, modalidad.plataforma, modalidad.enlace, modalidad.direccion,
                reunionId,
            ]
        );

        return res.status(200).json({ reunion: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar reunión:', error);
        return res.status(500).json({ error: 'No se pudo actualizar la reunión' });
    }
}

export async function eliminarReunion(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const reunionId = Number(req.params.id);
        const usuarioId = req.user!.id;

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