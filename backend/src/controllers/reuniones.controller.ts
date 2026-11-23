import { Response } from 'express';
import { pool } from '../config/database';
import { Reunion } from '../entities';
import { esFechaPasada } from '../helpers/fecha.helper';
import { notificarReunionCreada, notificarReunionEliminada, notificarReunionModificada } from '../helpers/notificaciones.helper';
import { AuthenticatedRequest } from '../middleware';
import { ActualizarReunionDatos, CrearReunionDatos } from '../validations';

// Los datos que llegan ya están validados por src/validations/reunion.validation.ts
// y los permisos por requireMiembro / requireAdmin (ver routes/reuniones.routes.ts).

const COLUMNAS_REUNION = 'id, grupo_id, titulo, descripcion, fecha_inicio, fecha_fin, modalidad, plataforma, enlace, direccion';

// Reuniones del mismo grupo cuyo horario se cruza con [inicio, fin)
async function buscarChoques(grupoId: number, inicio: string, fin: string, excluirId: number | null) {
    const result = await pool.query<Pick<Reunion, 'id' | 'titulo' | 'fecha_inicio' | 'fecha_fin'>>(
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
        const result = await pool.query<Reunion>(
            `SELECT ${COLUMNAS_REUNION}
             FROM reuniones
             WHERE grupo_id = $1
             ORDER BY fecha_inicio`,
            [req.grupo!.id]
        );

        return res.status(200).json({ reuniones: result.rows });
    } catch (error) {
        console.error('Error al listar reuniones:', error);
        return res.status(500).json({ error: 'No se pudieron cargar las reuniones' });
    }
}

// Reuniones de todos los grupos del usuario, con el nombre del grupo y su rol en él
// (para la tabla de Reuniones y el calendario de Inicio)
export async function listarMisReuniones(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const result = await pool.query<Reunion & { grupo_nombre: string; rol: string }>(
            `SELECT ${COLUMNAS_REUNION.split(', ').map((columna) => `r.${columna}`).join(', ')},
                    g.nombre AS grupo_nombre, ug.rol
             FROM reuniones r
             INNER JOIN grupos g ON g.id = r.grupo_id
             INNER JOIN usuarios_grupos ug ON ug.grupo_id = r.grupo_id
             WHERE ug.usuario_id = $1
             ORDER BY r.fecha_inicio`,
            [req.user!.id]
        );

        return res.status(200).json({ reuniones: result.rows });
    } catch (error) {
        console.error('Error al listar mis reuniones:', error);
        return res.status(500).json({ error: 'No se pudieron cargar las reuniones' });
    }
}

export async function crearReunion(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const datos = req.body as CrearReunionDatos;
        const grupoId = req.grupo!.id;

        if (esFechaPasada(datos.fecha_inicio)) {
            return res.status(400).json({ error: 'No puedes crear una reunión en una fecha u hora que ya pasó' });
        }

        if (!datos.confirmar_choque) {
            const choques = await buscarChoques(grupoId, datos.fecha_inicio, datos.fecha_fin, null);
            if (choques.length > 0) {
                return res.status(409).json({
                    error: 'El horario choca con otra reunión del grupo',
                    choques,
                });
            }
        }

        const result = await pool.query<Reunion>(
            `INSERT INTO reuniones (grupo_id, titulo, descripcion, fecha_inicio, fecha_fin, modalidad, plataforma, enlace, direccion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING ${COLUMNAS_REUNION}`,
            [
                grupoId, datos.titulo, datos.descripcion, datos.fecha_inicio, datos.fecha_fin,
                datos.modalidad, datos.plataforma, datos.enlace, datos.direccion,
            ]
        );

        notificarReunionCreada(result.rows[0], req.user!.id);

        return res.status(201).json({ reunion: result.rows[0] });
    } catch (error) {
        console.error('Error al crear reunión:', error);
        return res.status(500).json({ error: 'No se pudo crear la reunión' });
    }
}

export async function actualizarReunion(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const reunionId = Number(req.params.id);
        const datos = req.body as ActualizarReunionDatos;
        const grupoId = req.grupo!.id;

        const reunion = await pool.query<Reunion & { misma_fecha: boolean }>(
            `SELECT ${COLUMNAS_REUNION}, fecha_inicio = $2::timestamp AS misma_fecha FROM reuniones WHERE id = $1`,
            [reunionId, datos.fecha_inicio]
        );
        const { misma_fecha, ...anterior } = reunion.rows[0];

        // Si no se movió la fecha, se permite editar una reunión que ya pasó (ej. corregir el título)
        if (!misma_fecha) {
            if (esFechaPasada(datos.fecha_inicio)) {
                return res.status(400).json({ error: 'No puedes mover la reunión a una fecha u hora que ya pasó' });
            }

            if (!datos.confirmar_choque) {
                const choques = await buscarChoques(grupoId, datos.fecha_inicio, datos.fecha_fin, reunionId);
                if (choques.length > 0) {
                    return res.status(409).json({
                        error: 'El horario choca con otra reunión del grupo',
                        choques,
                    });
                }
            }
        }

        const result = await pool.query<Reunion>(
            `UPDATE reuniones
             SET titulo = $1, descripcion = $2, fecha_inicio = $3, fecha_fin = $4,
                 modalidad = $5, plataforma = $6, enlace = $7, direccion = $8
             WHERE id = $9
             RETURNING ${COLUMNAS_REUNION}`,
            [
                datos.titulo, datos.descripcion, datos.fecha_inicio, datos.fecha_fin,
                datos.modalidad, datos.plataforma, datos.enlace, datos.direccion,
                reunionId,
            ]
        );

        notificarReunionModificada(anterior, result.rows[0], req.user!.id);

        return res.status(200).json({ reunion: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar reunión:', error);
        return res.status(500).json({ error: 'No se pudo actualizar la reunión' });
    }
}

export async function eliminarReunion(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const result = await pool.query<Reunion>(
            `DELETE FROM reuniones WHERE id = $1 RETURNING ${COLUMNAS_REUNION}`,
            [Number(req.params.id)]
        );

        if (result.rows[0]) notificarReunionEliminada(result.rows[0], req.user!.id);

        return res.status(204).send();
    } catch (error) {
        console.error('Error al eliminar reunión:', error);
        return res.status(500).json({ error: 'No se pudo eliminar la reunión' });
    }
}
