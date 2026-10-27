import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { pool } from '../../config/database';
import { correoPrueba, limpiarUsuarios } from './utils';

const usuarioPrueba = {
    nombre: 'Usuario Login',
    correo: correoPrueba('login'),
    clave: 'Password123!',
};

describe('POST /api/auth/login - Prueba de Integración', () => {
    beforeAll(async () => {
        await request(app).post('/api/auth/registro').send(usuarioPrueba);
    });

    afterAll(async () => {
        await limpiarUsuarios([usuarioPrueba.correo]);
        await pool.end();
    });

    it('debe devolver un token con credenciales correctas', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ correo: usuarioPrueba.correo, clave: usuarioPrueba.clave });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.usuario).toHaveProperty('nombre', usuarioPrueba.nombre);
    });

    it('debe rechazar con 401 una contraseña incorrecta', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ correo: usuarioPrueba.correo, clave: 'ClaveIncorrecta' });

        expect(response.statusCode).toBe(401);
        expect(response.body).not.toHaveProperty('token');
    });

    it('debe rechazar con 401 un correo que no existe', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ correo: correoPrueba('no_existe'), clave: usuarioPrueba.clave });

        expect(response.statusCode).toBe(401);
    });
});
