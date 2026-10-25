import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Response } from 'express';
import { generarToken } from '../../helpers/jwt.helper';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.middleware';

function crearRespuesta() {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

describe('requireAuth - Pruebas Unitarias', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'secreto_de_prueba';
    });

    it('debe responder 401 si no se envía el token', () => {
        const req = { headers: {} } as AuthenticatedRequest;
        const res = crearRespuesta();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token no proporcionado' });
        expect(next).not.toHaveBeenCalled();
    });

    it('debe responder 401 si el token es inválido', () => {
        const req = { headers: { authorization: 'Bearer token-falso' } } as AuthenticatedRequest;
        const res = crearRespuesta();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
        expect(next).not.toHaveBeenCalled();
    });

    it('debe guardar el id del usuario y llamar a next si el token es válido', () => {
        const token = generarToken(7);
        const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
        const res = crearRespuesta();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(req.user).toEqual({ id: 7 });
        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
    });
});
