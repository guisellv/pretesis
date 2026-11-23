import { Response } from 'express';
import { pool } from '../config/database';
import { Grupo, RolGrupo } from '../entities';
import { generarCodigoGrupo, largoParaIntento } from '../helpers/codigoGrupo.helper';
import {
    correosDelGrupo,
    notificarCambioRol,
    notificarGrupoEliminado,
    notificarGrupoRenombrado,
    notificarNuevoIntegrante,
} from '../helpers/notificaciones.helper';
import { AuthenticatedRequest } from '../middleware';
import { ActualizarGrupoDatos, ActualizarRolDatos, CrearGrupoDatos, UnirseGrupoDatos } from '../validations';

const MAX_INTENTOS_CODIGO = 15;

type GrupoDelUsuario = Grupo & { rol: RolGrupo; cantidad_integrantes: number };

// Datos de un grupo tal como se muestran en la tabla de grupos (incluye el rol del usuario y la cantidad de integrantes)
const SELECT_GRUPO = `
    SELECT g.id, g.nombre, g.codigo_acceso, g.creado_en, g.actualizado_en, ug.rol,
           (SELECT COUNT(*)::int FROM usuarios_grupos x WHERE x.grupo_id = g.id) AS cantidad_integrantes
    FROM grupos g
    INNER JOIN usuarios_grupos ug ON ug.grupo_id = g.id`;

async function obtenerGrupoDelUsuario(grupoId: number, usuarioId: number) {
    const result = await pool.query<GrupoDelUsuario>(
        `${SELECT_GRUPO} WHERE g.id = $1 AND ug.usuario_id = $2`,
        [grupoId, usuarioId]
    );

    return result.rows[0];
}

export async function listarGrupos(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const result = await pool.query<GrupoDelUsuario>(
            `${SELECT_GRUPO} WHERE ug.usuario_id = $1 ORDER BY g.creado_en, g.id`,
            [req.user!.id]
        );

        return res.status(200).json({ grupos: result.rows });
    } catch (error) {
        console.error('Error al listar grupos:', error);
        return res.status(500).json({
            error: 'No se pudieron cargar los grupos'
        });
    }
}

// El código de acceso lo genera el servidor (no el cliente) y se garantiza que sea único:
// si choca con uno existente se genera otro, y si siguen chocando se alarga (ver codigoGrupo.helper.ts).
export async function crearGrupo(req: AuthenticatedRequest, res: Response): Promise<any> {
    const { nombre } = req.body as CrearGrupoDatos;
    const usuarioId = req.user!.id;
    const client = await pool.connect();

    try {
        for (let intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
            const codigo = generarCodigoGrupo(largoParaIntento(intento));

            try {
                await client.query('BEGIN');

                const result = await client.query<Pick<Grupo, 'id'>>(
                    `INSERT INTO grupos (nombre, codigo_acceso)
                     VALUES ($1, $2)
                     RETURNING id`,
                    [nombre, codigo]
                );

                await client.query(
                    `INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol)
                     VALUES ($1, $2, 'Administrador')`,
                    [usuarioId, result.rows[0].id]
                );

                await client.query('COMMIT');

                return res.status(201).json({
                    mensaje: 'Grupo creado exitosamente',
                    grupo: await obtenerGrupoDelUsuario(result.rows[0].id, usuarioId)
                });
            } catch (error: any) {
                await client.query('ROLLBACK');

                // Código repetido: se intenta con otro
                if (error.code === '23505' && error.constraint === 'grupos_codigo_acceso_key') continue;

                throw error;
            }
        }

        return res.status(500).json({
            error: 'No se pudo generar un código único para el grupo. Inténtalo nuevamente'
        });
    } catch (error) {
        console.error('Error al crear grupo:', error);
        return res.status(500).json({
            error: 'No se pudo crear el grupo'
        });
    } finally {
        client.release();
    }
}

export async function unirseGrupo(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const { codigo_acceso } = req.body as UnirseGrupoDatos;
        const usuarioId = req.user!.id;

        const grupoResult = await pool.query<Pick<Grupo, 'id' | 'nombre'>>(
            'SELECT id, nombre FROM grupos WHERE codigo_acceso = $1',
            [codigo_acceso]
        );

        const grupo = grupoResult.rows[0];

        if (!grupo) {
            return res.status(404).json({
                error: 'Código de acceso inválido'
            });
        }

        await pool.query(
            `INSERT INTO usuarios_grupos
             (usuario_id, grupo_id, rol)
             VALUES ($1, $2, 'Integrante')`,
            [usuarioId, grupo.id]
        );

        notificarNuevoIntegrante(grupo.id, usuarioId);

        return res.status(200).json({
            mensaje: `Te has unido exitosamente a: ${grupo.nombre}`,
            grupo: await obtenerGrupoDelUsuario(grupo.id, usuarioId)
        });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({
                error: 'Ya eres miembro de este grupo'
            });
        }

        if (error.code === '23503') {
            return res.status(400).json({
                error: 'El usuario no existe o el grupo no es válido'
            });
        }

        console.error('Error al unirse al grupo:', error);

        return res.status(500).json({
            error: 'Error al unirse al grupo'
        });
    }
}

// requireAdmin ya verificó que quien hace el cambio es el administrador del grupo
export async function actualizarGrupo(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const { nombre } = req.body as ActualizarGrupoDatos;

        const anterior = await pool.query<{ nombre: string }>('SELECT nombre FROM grupos WHERE id = $1', [req.grupo!.id]);

        await pool.query(
            'UPDATE grupos SET nombre = $1, actualizado_en = NOW() WHERE id = $2',
            [nombre, req.grupo!.id]
        );

        notificarGrupoRenombrado(req.grupo!.id, anterior.rows[0].nombre, nombre, req.user!.id);

        return res.status(200).json({ grupo: await obtenerGrupoDelUsuario(req.grupo!.id, req.user!.id) });
    } catch (error) {
        console.error('Error al actualizar grupo:', error);
        return res.status(500).json({ error: 'No se pudo actualizar el grupo' });
    }
}

// requireAdmin ya verificó que quien elimina es el administrador del grupo.
// Se borran en cascada sus integrantes, reuniones y formularios.
export async function eliminarGrupo(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        // Los correos de los integrantes se leen antes de borrar; después ya no existen
        const para = await correosDelGrupo(req.grupo!.id, req.user!.id);
        const result = await pool.query<{ nombre: string }>('DELETE FROM grupos WHERE id = $1 RETURNING nombre', [req.grupo!.id]);

        if (result.rows[0]) notificarGrupoEliminado(result.rows[0].nombre, para, req.user!.id);

        return res.status(204).send();
    } catch (error) {
        console.error('Error al eliminar grupo:', error);
        return res.status(500).json({ error: 'No se pudo eliminar el grupo' });
    }
}

// requireMiembro ya verificó que el usuario pertenece al grupo
export async function listarIntegrantes(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const result = await pool.query<{ id: number; nombre: string; rol: RolGrupo }>(
            `SELECT u.id, u."nombreCompleto" AS nombre, ug.rol
             FROM usuarios_grupos ug
             INNER JOIN users u ON u.id = ug.usuario_id
             WHERE ug.grupo_id = $1
             ORDER BY LOWER(ug.rol) = 'administrador' DESC, u."nombreCompleto"`,
            [req.grupo!.id]
        );

        return res.status(200).json({ integrantes: result.rows });
    } catch (error) {
        console.error('Error al listar integrantes:', error);
        return res.status(500).json({
            error: 'No se pudieron cargar los integrantes'
        });
    }
}

// requireAdmin ya verificó que quien hace el cambio es el administrador del grupo
export async function actualizarRolIntegrante(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const usuarioId = Number(req.params.usuarioId);
        const { rol } = req.body as ActualizarRolDatos;

        const result = await pool.query<{ id: number; rol: RolGrupo }>(
            `UPDATE usuarios_grupos
             SET rol = $1
             WHERE grupo_id = $2 AND usuario_id = $3 AND LOWER(rol) <> 'administrador'
             RETURNING usuario_id AS id, rol`,
            [rol, req.grupo!.id, usuarioId]
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ error: 'El integrante no existe en este grupo' });
        }

        notificarCambioRol(req.grupo!.id, usuarioId, rol, req.user!.id);

        return res.status(200).json({ integrante: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar el rol del integrante:', error);
        return res.status(500).json({ error: 'No se pudo actualizar el rol del integrante' });
    }
}
