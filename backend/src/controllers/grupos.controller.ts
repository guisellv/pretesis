import { Response } from 'express';
import { pool } from '../config/database';
import { AuthenticatedRequest } from '../middleware';

export async function listarGrupos(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const usuarioId = req.user!.id;

        const result = await pool.query(
            `SELECT g.id, g.nombre, g.codigo_acceso, ug.rol
             FROM grupos g
             INNER JOIN usuarios_grupos ug ON ug.grupo_id = g.id
             WHERE ug.usuario_id = $1
             ORDER BY g.id`,
            [usuarioId]
        );

        return res.status(200).json({ grupos: result.rows });
    } catch (error) {
        console.error('Error al listar grupos:', error);
        return res.status(500).json({
            error: 'No se pudieron cargar los grupos'
        });
    }
}

export async function crearGrupo(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const { nombre, codigo_acceso } = req.body;
        const usuarioId = req.user!.id;

        if (!nombre || !codigo_acceso) {
            return res.status(400).json({
                error: 'El nombre y el código del grupo son obligatorios'
            });
        }

        const result = await pool.query(
            `INSERT INTO grupos (nombre, codigo_acceso)
             VALUES ($1, $2)
             RETURNING id, nombre, codigo_acceso`,
            [nombre.trim(), codigo_acceso]
        );

        await pool.query(
            `INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol)
             VALUES ($1, $2, 'Administrador')`,
            [usuarioId, result.rows[0].id]
        );

        return res.status(201).json({
            mensaje: 'Grupo creado exitosamente',
            grupo: result.rows[0]
        });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({
                error: 'El código del grupo ya existe'
            });
        }

        return res.status(500).json({
            error: 'No se pudo crear el grupo'
        });
    }
}

export async function unirseGrupo(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const { codigo_acceso } = req.body;
        const usuarioId = req.user!.id;

        const grupoResult = await pool.query(
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
             VALUES ($1, $2, 'Lector')`,
            [usuarioId, grupo.id]
        );

        return res.status(200).json({
            mensaje: `Te has unido exitosamente a: ${grupo.nombre}`,
            grupo: {
                id: grupo.id,
                nombre: grupo.nombre,
                codigo_acceso: codigo_acceso
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

export async function listarIntegrantes(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const grupoId = Number(req.params.grupoId);

        if (!Number.isInteger(grupoId)) {
            return res.status(400).json({
                error: 'El grupo es obligatorio'
            });
        }

        const pertenece = await pool.query(
            'SELECT 1 FROM usuarios_grupos WHERE usuario_id = $1 AND grupo_id = $2',
            [req.user?.id, grupoId]
        );

        if ((pertenece.rowCount ?? 0) === 0) {
            return res.status(403).json({
                error: 'No perteneces a este grupo'
            });
        }

        const result = await pool.query(
            `SELECT u.id, u."nombreCompleto" AS nombre, ug.rol
             FROM usuarios_grupos ug
             INNER JOIN users u ON u.id = ug.usuario_id
             WHERE ug.grupo_id = $1
             ORDER BY LOWER(ug.rol) = 'administrador' DESC, u."nombreCompleto"`,
            [grupoId]
        );

        return res.status(200).json({ integrantes: result.rows });
    } catch (error) {
        console.error('Error al listar integrantes:', error);
        return res.status(500).json({
            error: 'No se pudieron cargar los integrantes'
        });
    }
}
