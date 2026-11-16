import { Migracion } from './tipos';

export const migracion: Migracion = {
    nombre: '001_crear_users',
    up: `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            "nombreCompleto" VARCHAR(150) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            clave TEXT NOT NULL,
            rut VARCHAR(20),
            rol VARCHAR(30) NOT NULL DEFAULT 'usuario'
        );

        ALTER TABLE users ALTER COLUMN rut DROP NOT NULL;
    `,
};
