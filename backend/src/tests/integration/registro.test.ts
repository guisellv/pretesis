import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { pool } from '../../config/database';
import { correoPrueba, limpiarUsuarios } from './utils';

const usuarioPrueba = {
    nombre: 'Usuario Prueba',
    correo: correoPrueba('registro'),
    clave: 'Password123!',
};

describe('POST /api/auth/registro - Prueba de Integración', () => {
    afterAll(async () => {
        await limpiarUsuarios([usuarioPrueba.correo]);
        await pool.end();
    });

    it('debe rechazar con 400 si faltan datos', async () => {
        const response = await request(app)
            .post('/api/auth/registro')
            .send({ correo: usuarioPrueba.correo });

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('debe crear el usuario sin devolver la contraseña', async () => {
        const response = await request(app)
            .post('/api/auth/registro')
            .send(usuarioPrueba);

        expect(response.statusCode).toBe(201);
        expect(response.body.usuario).toMatchObject({
            nombre: usuarioPrueba.nombre,
            correo: usuarioPrueba.correo,
        });
        expect(response.body.usuario).not.toHaveProperty('clave');
    });

    it('debe rechazar con 400 un correo ya registrado', async () => {
        const response = await request(app)
            .post('/api/auth/registro')
            .send(usuarioPrueba);

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('error', 'Este correo ya está registrado');
    });
});
