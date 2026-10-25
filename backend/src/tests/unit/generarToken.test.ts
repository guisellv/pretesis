import { beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { generarToken } from '../../helpers/jwt.helper';

const SECRET = 'secreto_de_prueba';

describe('generarToken - Pruebas Unitarias', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = SECRET;
    });

    it('debe generar un token con el id del usuario', () => {
        const token = generarToken(7);
        const payload = jwt.verify(token, SECRET) as jwt.JwtPayload;
        
        expect(token).toBeDefined();
        expect(payload.id).toBe(7);
    });

    it('debe generar un token que expire en 8 horas', () => {
        const token = generarToken(7);
        const payload = jwt.verify(token, SECRET) as jwt.JwtPayload;

        expect(payload.exp! - payload.iat!).toBe(8 * 60 * 60);
    });

    it('no deberia verificarse con otra clave secreta', () => {
        const token = generarToken(7);

        expect(() => jwt.verify(token, 'otra_clave')).toThrow();
    });
});
