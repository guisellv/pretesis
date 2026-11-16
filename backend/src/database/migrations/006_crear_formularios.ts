import { Migracion } from './tipos';

export const migracion: Migracion = {
    nombre: '006_crear_formularios',
    up: `
        CREATE TABLE IF NOT EXISTS formularios_reunion (
            reunion_id INTEGER PRIMARY KEY REFERENCES reuniones(id) ON DELETE CASCADE,
            contenido TEXT NOT NULL DEFAULT '',
            actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS formularios_historial (
            id SERIAL PRIMARY KEY,
            reunion_id INTEGER NOT NULL REFERENCES reuniones(id) ON DELETE CASCADE,
            usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            accion VARCHAR(20) NOT NULL,
            contenido TEXT NOT NULL,
            fecha TIMESTAMP NOT NULL DEFAULT NOW()
        );
    `,
};
