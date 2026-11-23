import { Response } from 'express';
import { pool } from '../config/database';
import { encryptPassword } from '../helpers/bcrypt.helper';
import { notificarCuentaCreada, notificarCuentaEliminada, notificarCuentaModificada } from '../helpers/notificaciones.helper';
import { AuthenticatedRequest } from '../middleware';
import { ActualizarUsuarioDatos, CrearUsuarioDatos } from '../validations';

// Gestión de usuarios: solo el administrador del sistema (ver requireAdminSistema).
// Nunca se devuelve el hash de la contraseña.

const SELECT_USUARIO = `
    SELECT u.id, u."nombreCompleto" AS nombre, u.email AS correo, u.rol, u.creado_en, u.actualizado_en,
           (SELECT COUNT(*)::int FROM usuarios_grupos ug WHERE ug.usuario_id = u.id) AS cantidad_grupos
    FROM users u`;

async function obtenerUsuario(id: number) {
    const result = await pool.query(`${SELECT_USUARIO} WHERE u.id = $1`, [id]);
    return result.rows[0];
}

// Datos del usuario con sesión iniciada (cualquier usuario). El frontend lo usa para saber si mostrar "Usuarios".
export async function obtenerUsuarioActual(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const usuario = await obtenerUsuario(req.user!.id);

        if (!usuario) {
            return res.status(404).json({ error: 'El usuario no existe' });
        }

        return res.status(200).json({ usuario });
    } catch (error) {
        console.error('Error al obtener el usuario actual:', error);
        return res.status(500).json({ error: 'No se pudo obtener el usuario' });
    }
}

export async function listarUsuarios(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const result = await pool.query(`${SELECT_USUARIO} ORDER BY u.creado_en, u.id`);
        return res.status(200).json({ usuarios: result.rows });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        return res.status(500).json({ error: 'No se pudieron cargar los usuarios' });
    }
}

// Detalle: datos del usuario y los grupos a los que pertenece con su rol en cada uno
export async function verUsuario(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const id = Number(req.params.id);
        const usuario = await obtenerUsuario(id);

        if (!usuario) {
            return res.status(404).json({ error: 'El usuario no existe' });
        }

        const grupos = await pool.query(
            `SELECT g.id, g.nombre, ug.rol
             FROM usuarios_grupos ug
             INNER JOIN grupos g ON g.id = ug.grupo_id
             WHERE ug.usuario_id = $1
             ORDER BY g.nombre`,
            [id]
        );

        return res.status(200).json({ usuario: { ...usuario, grupos: grupos.rows } });
    } catch (error) {
        console.error('Error al ver usuario:', error);
        return res.status(500).json({ error: 'No se pudo cargar el usuario' });
    }
}

export async function crearUsuario(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const { nombre, correo, clave, rol } = req.body as CrearUsuarioDatos;
        const claveHash = await encryptPassword(clave);

        const result = await pool.query<{ id: number }>(
            `INSERT INTO users ("nombreCompleto", email, clave, rol)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [nombre, correo, claveHash, rol]
        );

        notificarCuentaCreada({ nombre, correo, rol }, req.user!.id);

        return res.status(201).json({ usuario: await obtenerUsuario(result.rows[0].id) });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Este correo ya está registrado' });
        }

        console.error('Error al crear usuario:', error);
        return res.status(500).json({ error: 'No se pudo crear el usuario' });
    }
}

export async function actualizarUsuario(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const id = Number(req.params.id);
        const { nombre, correo, rol, clave } = req.body as ActualizarUsuarioDatos;

        // Evita que el administrador se quite a sí mismo el permiso y nadie pueda gestionar usuarios
        if (id === req.user!.id && rol !== 'admin') {
            return res.status(400).json({ error: 'No puedes quitarte a ti mismo el rol de administrador' });
        }

        const anterior = await obtenerUsuario(id);
        const claveHash = clave ? await encryptPassword(clave) : null;

        const result = await pool.query(
            `UPDATE users
             SET "nombreCompleto" = $1, email = $2, rol = $3,
                 clave = COALESCE($4, clave), actualizado_en = NOW()
             WHERE id = $5`,
            [nombre, correo, rol, claveHash, id]
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ error: 'El usuario no existe' });
        }

        if (anterior) notificarCuentaModificada(anterior, { nombre, correo, rol }, Boolean(clave), req.user!.id);

        return res.status(200).json({ usuario: await obtenerUsuario(id) });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Este correo ya está registrado' });
        }

        console.error('Error al actualizar usuario:', error);
        return res.status(500).json({ error: 'No se pudo actualizar el usuario' });
    }
}

export async function eliminarUsuario(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        const id = Number(req.params.id);

        if (id === req.user!.id) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }

        // Si el usuario administra algún grupo, ese grupo quedaría sin administrador
        const administra = await pool.query<{ nombre: string }>(
            `SELECT g.nombre
             FROM usuarios_grupos ug
             INNER JOIN grupos g ON g.id = ug.grupo_id
             WHERE ug.usuario_id = $1 AND LOWER(ug.rol) = 'administrador'
             ORDER BY g.nombre`,
            [id]
        );

        if ((administra.rowCount ?? 0) > 0) {
            const nombres = administra.rows.map((grupo) => grupo.nombre).join(', ');
            return res.status(409).json({
                error: `No se puede eliminar: es administrador de ${nombres}. Primero hay que eliminar esos grupos.`,
            });
        }

        const result = await pool.query<{ nombre: string; correo: string }>(
            'DELETE FROM users WHERE id = $1 RETURNING "nombreCompleto" AS nombre, email AS correo',
            [id]
        );

        if ((result.rowCount ?? 0) === 0) {
            return res.status(404).json({ error: 'El usuario no existe' });
        }

        notificarCuentaEliminada(result.rows[0]);

        return res.status(204).send();
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return res.status(500).json({ error: 'No se pudo eliminar el usuario' });
    }
}
