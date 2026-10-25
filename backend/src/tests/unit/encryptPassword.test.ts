import { describe, expect, it } from 'vitest';
import { encryptPassword } from '../../helpers/bcrypt.helper';

describe('encryptPassword - Pruebas Unitarias', () => {
    it('debe generar un hash distinto a la contraseña original', async () => {
        const password = 'Password123!';
        const hash = await encryptPassword(password);

        
        expect(hash).toBeDefined();
      
        expect(hash).not.toBe(password);
    });

    it('debe generar un hash con formato bcrypt', async () => {
        const hash = await encryptPassword('Password123!');

        expect(hash).toMatch(/^\$2[aby]\$10\$/);
    });

    it('debe generar hashes distintos para la misma contraseña', async () => {
        const password = 'Password123!';

        const hash1 = await encryptPassword(password);
        const hash2 = await encryptPassword(password);


        expect(hash1).not.toBe(hash2);
    });
});
