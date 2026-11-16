import { Migracion } from './tipos';

export const migracion: Migracion = {
    nombre: '007_crear_recuperacion_clave',
    up: `
        CREATE TABLE IF NOT EXISTS recuperacion_clave (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            codigo_hash TEXT NOT NULL,
            expira_en TIMESTAMPTZ NOT NULL,
            intentos INTEGER NOT NULL DEFAULT 0,
            usado BOOLEAN NOT NULL DEFAULT FALSE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `,
};
