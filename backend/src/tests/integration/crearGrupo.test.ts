import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { pool } from '../../config/database';
import { crearUsuario, generarCodigo, limpiarUsuarios, UsuarioPrueba } from './utils';

let admin: UsuarioPrueba;

describe('POST /api/grupos - Prueba de Integración', () => {
    beforeAll(async () => {
        admin = await crearUsuario('Admin Prueba', 'crear_grupo');
    });

    afterAll(async () => {
        await limpiarUsuarios([admin.correo]);
        await pool.end();
    });

    it('debe rechazar con 401 si no se envía el token', async () => {
        const response = await request(app)
            .post('/api/grupos')
            .send({ nombre: 'Grupo de Prueba', codigo_acceso: generarCodigo(), usuario_id: admin.id });

        
        expect(response.statusCode).toBe(401);
    });

    it('debe crear el grupo con el token del usuario', async () => {
        const codigo = generarCodigo();

        const response = await request(app)
            .post('/api/grupos')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ nombre: 'Grupo de Prueba', codigo_acceso: codigo, usuario_id: admin.id });

        
        expect(response.statusCode).toBe(201);
        expect(response.body.grupo).toMatchObject({ nombre: 'Grupo de Prueba', codigo_acceso: codigo });
        expect(response.body.grupo).toHaveProperty('id');
    });
});
