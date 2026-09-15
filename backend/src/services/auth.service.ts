import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { AuthCredentials, RegisterUserData, UserRecord } from "../entities/user.entity";

export async function registrarUsuario(datos: RegisterUserData) {
    const salt = await bcrypt.genSalt(10);
    const claveHash = await bcrypt.hash(datos.clave, salt);

    const result = await pool.query(
        `INSERT INTO users ("nombreCompleto", email, clave, rut, rol)
         VALUES ($1, $2, $3, '00000000-0', 'usuario')
         RETURNING id, "nombreCompleto" AS nombre, email AS correo`,
        [datos.nombre, datos.correo, claveHash]
    );

    return result.rows[0];
}

export async function iniciarSesion(datos: AuthCredentials) {
    const result = await pool.query<UserRecord>(
        "SELECT * FROM users WHERE email = $1",
        [datos.correo]
    );
    const usuario = result.rows[0];

    if (!usuario || !(await bcrypt.compare(datos.clave, usuario.clave))) {
        return null;
    }

    const token = jwt.sign(
        { id: usuario.id },
        process.env.JWT_SECRET || "clave_respaldo",
        { expiresIn: "8h" }
    );

    return {
        token,
        usuario: { id: usuario.id, nombre: usuario.nombreCompleto },
    };
}
