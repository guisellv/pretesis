import { Request, Response } from 'express';
import { pool } from '../config/database';

export async function listarGrupos(req: Request, res: Response): Promise<any> {
    try {
        const usuarioId = Number(req.query.usuario_id);

        if (!Number.isInteger(usuarioId)) {
            return res.status(400).json({
                error: 'El usuario es obligatorio'
            });
        }

        const result = await pool.query(
            `SELECT g.id, g.nombre, g.codigo_acceso
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

export async function crearGrupo(req: Request, res: Response): Promise<any> {
    try {
        const { nombre, codigo_acceso, usuario_id } = req.body;

        if (!nombre || !codigo_acceso || !usuario_id) {
            return res.status(400).json({
                error: 'El nombre '
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
            [usuario_id, result.rows[0].id]
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

export async function unirseGrupo(req: Request, res: Response): Promise<any> {
    try {
        const { usuario_id, codigo_acceso, rol_solicitado } = req.body;

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
             VALUES ($1, $2, $3)`,
            [usuario_id, grupo.id, rol_solicitado || 'Lector']
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