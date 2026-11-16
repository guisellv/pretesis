import { Request, Response } from 'express';
import { randomInt } from 'crypto';
import { comparePassword, encryptPassword } from '../helpers/bcrypt.helper';
import { enviarCodigoRecuperacion } from '../helpers/mail.helper';
import { generarToken } from '../helpers/jwt.helper';
import { pool } from '../config/database';
import { RecuperacionClave, Usuario } from '../entities';
import { LoginDatos, RegistroDatos, RestablecerClaveDatos, SolicitarRecuperacionDatos } from '../validations';

// Los datos que llegan ya están validados por src/validations/auth.validation.ts

export async function registrarUsuario(req: Request, res: Response): Promise<any> {
    try {
        const { nombre, correo, clave } = req.body as RegistroDatos;

        const claveHash = await encryptPassword(clave);

        const result = await pool.query(
            `INSERT INTO users ("nombreCompleto", email, clave, rol)
             VALUES ($1, $2, $3, 'usuario')
             RETURNING id, "nombreCompleto" AS nombre, email AS correo`,
            [nombre, correo, claveHash]
        );

        return res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: result.rows[0]
        });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({
                error: 'Este correo ya está registrado'
            });
        }

        console.error('Error al registrar usuario:', error);

        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
}

const MINUTOS_VIGENCIA_CODIGO = 15;
const MAX_INTENTOS_CODIGO = 5;

function generarCodigoRecuperacion(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function solicitarRecuperacion(req: Request, res: Response): Promise<any> {
    try {
        const { correo } = req.body as SolicitarRecuperacionDatos;

        const result = await pool.query<Pick<Usuario, 'id' | 'email'>>('SELECT id, email FROM users WHERE email = $1', [correo]);
        const usuario = result.rows[0];

        // Se responde igual exista o no el correo, para no revelar qué cuentas existen.
        const respuestaGenerica = {
            mensaje: 'Si el correo está registrado, te enviamos un código para recuperar la contraseña'
        };

        if (!usuario) {
            return res.status(200).json(respuestaGenerica);
        }

        const codigo = generarCodigoRecuperacion();
        const codigoHash = await encryptPassword(codigo);

        await pool.query(
            'UPDATE recuperacion_clave SET usado = TRUE WHERE usuario_id = $1 AND usado = FALSE',
            [usuario.id]
        );
        await pool.query(
            `INSERT INTO recuperacion_clave (usuario_id, codigo_hash, expira_en)
             VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
            [usuario.id, codigoHash, String(MINUTOS_VIGENCIA_CODIGO)]
        );

        await enviarCodigoRecuperacion(usuario.email, codigo);

        return res.status(200).json(respuestaGenerica);
    } catch (error) {
        console.error('Error al solicitar recuperación:', error);
        return res.status(500).json({ error: 'No se pudo enviar el código de recuperación' });
    }
}

export async function restablecerClave(req: Request, res: Response): Promise<any> {
    try {
        const { correo, codigo, nuevaClave } = req.body as RestablecerClaveDatos;

        const result = await pool.query<Pick<RecuperacionClave, 'id' | 'codigo_hash' | 'intentos' | 'usuario_id'>>(
            `SELECT r.id, r.codigo_hash, r.intentos, r.usuario_id
             FROM recuperacion_clave r
             INNER JOIN users u ON u.id = r.usuario_id
             WHERE u.email = $1 AND r.usado = FALSE AND r.expira_en > NOW()
             ORDER BY r.creado_en DESC
             LIMIT 1`,
            [correo]
        );

        const solicitud = result.rows[0];
        const errorCodigo = { error: 'El código es inválido o ya venció' };

        if (!solicitud || solicitud.intentos >= MAX_INTENTOS_CODIGO) {
            return res.status(400).json(errorCodigo);
        }

        const codigoValido = await comparePassword(codigo, solicitud.codigo_hash);

        if (!codigoValido) {
            await pool.query('UPDATE recuperacion_clave SET intentos = intentos + 1 WHERE id = $1', [solicitud.id]);
            return res.status(400).json(errorCodigo);
        }

        const claveHash = await encryptPassword(nuevaClave);

        await pool.query('UPDATE users SET clave = $1 WHERE id = $2', [claveHash, solicitud.usuario_id]);
        await pool.query('UPDATE recuperacion_clave SET usado = TRUE WHERE usuario_id = $1', [solicitud.usuario_id]);

        return res.status(200).json({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        return res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
    }
}

export async function iniciarSesion(req: Request, res: Response): Promise<any> {
    try {
        const { correo, clave } = req.body as LoginDatos;

        const result = await pool.query<Usuario>(
            'SELECT * FROM users WHERE email = $1',
            [correo]
        );

        const usuario = result.rows[0];

        if (!usuario) {
            return res.status(401).json({
                error: 'Correo o contraseña incorrectos'
            });
        }

        const passwordValida = await comparePassword(clave, usuario.clave);

        if (!passwordValida) {
            return res.status(401).json({
                error: 'Correo o contraseña incorrectos'
            });
        }

        const token = generarToken(usuario.id);

        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombreCompleto
            }
        });
    } catch {
        return res.status(500).json({
            error: 'Error al iniciar sesión'
        });
    }
}