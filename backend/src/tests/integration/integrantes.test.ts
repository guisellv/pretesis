import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { pool } from '../../config/database';
import { crearUsuario, generarCodigo, limpiarUsuarios, UsuarioPrueba } from './utils';

let admin: UsuarioPrueba;
let externo: UsuarioPrueba;
let grupoId: number;

describe('GET /api/grupos/:grupoId/integrantes - Prueba de Integración', () => {
    beforeAll(async () => {
        admin = await crearUsuario('Admin Prueba', 'integrantes_admin');
        externo = await crearUsuario('Externo Prueba', 'integrantes_externo');

        const grupo = await request(app)
            .post('/api/grupos')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({ nombre: 'Grupo de Prueba', codigo_acceso: generarCodigo(), usuario_id: admin.id });

        grupoId = grupo.body.grupo.id;
    });

    afterAll(async () => {
        await limpiarUsuarios([admin.correo, externo.correo]);
        await pool.end();
    });

    it('debe listar al creador del grupo como Administrador', async () => {
        const response = await request(app)
            .get(`/api/grupos/${grupoId}/integrantes`)
            .set('Authorization', `Bearer ${admin.token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.integrantes).toEqual([
            { id: admin.id, nombre: admin.nombre, rol: 'Administrador' },
        ]);
    });

    it('debe rechazar con 403 a un usuario que no es del grupo', async () => {
        const response = await request(app)
            .get(`/api/grupos/${grupoId}/integrantes`)
            .set('Authorization', `Bearer ${externo.token}`);

    
        expect(response.statusCode).toBe(403);
        expect(response.body).toHaveProperty('error', 'No perteneces a este grupo');
    });
});
