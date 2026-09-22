import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

export async function registrarUsuario(req: Request, res: Response): Promise<any> {
    try {
        const { nombre, correo, clave } = req.body;

        if (!nombre || !correo || !clave) {
            return res.status(400).json({
                error: 'Nombre, correo y contraseña son obligatorios'
            });
        }

        const claveHash = await bcrypt.hash(clave, 10);

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

export async function iniciarSesion(req: Request, res: Response): Promise<any> {
    try {
        const { correo, clave } = req.body;

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [correo]
        );

        const usuario = result.rows[0];

        if (!usuario) {
            return res.status(401).json({
                error: 'Correo o contraseña incorrectos'
            });
        }

        const passwordValida = await bcrypt.compare(clave, usuario.clave);

        if (!passwordValida) {
            return res.status(401).json({
                error: 'Correo o contraseña incorrectos'
            });
        }

        const token = jwt.sign(
            { id: usuario.id },
            process.env.JWT_SECRET || 'clave_respaldo',
            { expiresIn: '8h' }
        );

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