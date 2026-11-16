import { Migracion } from './tipos';

// El código de acceso de los grupos puede crecer de largo con el tiempo (ver helpers/codigoGrupo.helper.ts).
// Además se corrige el rol por defecto de usuarios_grupos, que en la base original era 'Lector'.
export const migracion: Migracion = {
    nombre: '008_ampliar_codigo_acceso',
    up: `
        ALTER TABLE grupos ALTER COLUMN codigo_acceso TYPE VARCHAR(10);
        ALTER TABLE usuarios_grupos ALTER COLUMN rol SET DEFAULT 'Integrante';
    `,
};
