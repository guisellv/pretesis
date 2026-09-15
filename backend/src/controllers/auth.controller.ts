import { Request, Response } from "express";
import { iniciarSesion, registrarUsuario } from "../services/auth.service";

export async function registrar(req: Request, res: Response): Promise<void> {
    const { nombre, correo, clave } = req.body;

    if (!nombre || !correo || !clave) {
        res.status(400).json({ error: "Nombre, correo y contraseña son obligatorios" });
        return;
    }

    try {
        const usuario = await registrarUsuario({ nombre, correo, clave });
        res.status(201).json({ mensaje: "Usuario registrado exitosamente", usuario });
    } catch (error: any) {
        if (error.code === "23505") {
            res.status(400).json({ error: "Este correo ya está registrado" });
            return;
        }

        console.error("Error al registrar usuario:", error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

export async function login(req: Request, res: Response): Promise<void> {
    const { correo, clave } = req.body;

    try {
        const resultado = await iniciarSesion({ correo, clave });

        if (!resultado) {
            res.status(401).json({ error: "Correo o contraseña incorrectos" });
            return;
        }

        res.status(200).json({
            mensaje: "Inicio de sesión exitoso",
            token: resultado.token,
            usuario: resultado.usuario,
        });
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
}
