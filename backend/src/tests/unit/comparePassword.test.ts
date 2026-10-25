import { describe, expect, it } from 'vitest';
import { comparePassword, encryptPassword } from '../../helpers/bcrypt.helper';

describe('comparePassword - Pruebas Unitarias', () => {
    it('debe retornar true cuando la contraseña coincide con el hash', async () => {
        const password = 'Password123!';
        const hash = await encryptPassword(password);

        const isValid = await comparePassword(password, hash);

        expect(isValid).toBe(true);
    });

    it('debe retornar false si la contraseña es incorrecta', async () => {
        const hash = await encryptPassword('Password123!');

        const isValid = await comparePassword('WrongPassword', hash);

        expect(isValid).toBe(false);
    });

    it('debe distinguir mayúsculas de minúsculas', async () => {
        const hash = await encryptPassword('Password123!');

        const isValid = await comparePassword('password123!', hash);


        expect(isValid).toBe(false);
    });
});
