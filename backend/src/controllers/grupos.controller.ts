import { Response } from 'express';
import { pool } from '../config/database';
import { Grupo, RolGrupo } from '../entities';
import { generarCodigoGrupo, largoParaIntento } from '../helpers/codigoGrupo.helper';
import { AuthenticatedRequest } from '../middleware';
import { ActualizarRolDatos, CrearGrupoDatos, UnirseGrupoDatos } from '../validations';

const MAX_INTENTOS_CODIGO = 15;

export async function listarGrupos(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const result = await pool.query<Grupo & { rol: RolGrupo }>(
            `SELECT g.id, g.nombre, g.codigo_acceso, ug.rol
             FROM grupos g
             INNER JOIN usuarios_grupos ug ON ug.grupo_id = g.id
             WHERE ug.usuario_id = $1
             ORDER BY g.id`,
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

                const result = await client.query<Grupo>(
                    `INSERT INTO grupos (nombre, codigo_acceso)
                     VALUES ($1, $2)
                     RETURNING id, nombre, codigo_acceso`,
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
                    grupo: { ...result.rows[0], rol: 'Administrador' }
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

        return res.status(200).json({
            mensaje: `Te has unido exitosamente a: ${grupo.nombre}`,
            grupo: {
                id: grupo.id,
                nombre: grupo.nombre,
                codigo_acceso,
                rol: 'Integrante'
            }
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

        return res.status(200).json({ integrante: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar el rol del integrante:', error);
        return res.status(500).json({ error: 'No se pudo actualizar el rol del integrante' });
    }
}
