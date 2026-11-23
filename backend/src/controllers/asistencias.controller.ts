import { Response } from 'express';
import { pool } from '../config/database';
import { EstadoAsistencia, RolGrupo } from '../entities';
import { AuthenticatedRequest } from '../middleware';
import { ConfirmarAsistenciaDatos } from '../validations';

// requireMiembro ya verificó que el usuario pertenece al grupo de la reunión (ver routes/reuniones.routes.ts)

type IntegranteAsistencia = { id: number; nombre: string; rol: RolGrupo; estado: EstadoAsistencia | null };

// Todos los integrantes del grupo con su respuesta (null = todavía no responde)
async function asistenciaDeReunion(reunionId: number, grupoId: number) {
    const result = await pool.query<IntegranteAsistencia>(
        `SELECT u.id, u."nombreCompleto" AS nombre, ug.rol, a.estado
         FROM usuarios_grupos ug
         INNER JOIN users u ON u.id = ug.usuario_id
         LEFT JOIN asistencias a ON a.reunion_id = $1 AND a.usuario_id = ug.usuario_id
         WHERE ug.grupo_id = $2
         ORDER BY CASE a.estado WHEN 'asistire' THEN 0 WHEN 'no_asistire' THEN 1 ELSE 2 END, u."nombreCompleto"`,
        [reunionId, grupoId]
    );

    return result.rows;
}

export async function obtenerAsistencia(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const integrantes = await asistenciaDeReunion(Number(req.params.id), req.grupo!.id);
        return res.status(200).json({ integrantes });
    } catch (error) {
        console.error('Error al obtener asistencia:', error);
        return res.status(500).json({ error: 'No se pudo cargar la asistencia' });
    }
}

export async function confirmarAsistencia(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const reunionId = Number(req.params.id);
        const { estado } = req.body as ConfirmarAsistenciaDatos;

        const reunion = await pool.query<{ fecha_inicio: Date }>('SELECT fecha_inicio FROM reuniones WHERE id = $1', [reunionId]);

        // fecha_inicio se guarda en hora local; pg la convierte a Date con la misma zona horaria del servidor
        if (new Date(reunion.rows[0].fecha_inicio).getTime() < Date.now()) {
            return res.status(400).json({ error: 'La reunión ya comenzó, ya no se puede cambiar la asistencia' });
        }

        await pool.query(
            `INSERT INTO asistencias (reunion_id, usuario_id, estado, actualizado_en)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (reunion_id, usuario_id)
             DO UPDATE SET estado = EXCLUDED.estado, actualizado_en = NOW()`,
            [reunionId, req.user!.id, estado]
        );

        const integrantes = await asistenciaDeReunion(reunionId, req.grupo!.id);
        return res.status(200).json({ integrantes });
    } catch (error) {
        console.error('Error al confirmar asistencia:', error);
        return res.status(500).json({ error: 'No se pudo guardar tu asistencia' });
    }
}
