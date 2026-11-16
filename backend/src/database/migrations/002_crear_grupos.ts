import { Migracion } from './tipos';

export const migracion: Migracion = {
    nombre: '002_crear_grupos',
    up: `
        CREATE TABLE IF NOT EXISTS grupos (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            codigo_acceso VARCHAR(5) NOT NULL UNIQUE
        );
    `,
};
