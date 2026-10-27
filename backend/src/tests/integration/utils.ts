import request from 'supertest';
import app from '../../app';
import { pool } from '../../config/database';

export type UsuarioPrueba = {
    id: number;
    nombre: string;
    correo: string;
    clave: string;
    token: string;
};


export function correoPrueba(alias: string): string {
    return `prueba_${alias}_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.cl`;
}

export function generarCodigo(): string {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length: 5 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
}

export async function crearUsuario(nombre: string, alias: string): Promise<UsuarioPrueba> {
    const correo = correoPrueba(alias);
    const clave = 'Password123!';

    await request(app).post('/api/auth/registro').send({ nombre, correo, clave });
    const login = await request(app).post('/api/auth/login').send({ correo, clave });

    return { id: login.body.usuario.id, nombre, correo, clave, token: login.body.token };
}


export async function limpiarUsuarios(correos: string[]): Promise<void> {
    await pool.query(
        `DELETE FROM grupos WHERE id IN (
            SELECT ug.grupo_id
            FROM usuarios_grupos ug
            INNER JOIN users u ON u.id = ug.usuario_id
            WHERE u.email = ANY($1) AND LOWER(ug.rol) = 'administrador'
        )`,
        [correos]
    );
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [correos]);
}
