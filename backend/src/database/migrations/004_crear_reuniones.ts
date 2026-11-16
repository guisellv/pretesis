import { Migracion } from './tipos';

export const migracion: Migracion = {
    nombre: '004_crear_reuniones',
    up: `
        CREATE TABLE IF NOT EXISTS reuniones (
            id SERIAL PRIMARY KEY,
            grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
            titulo VARCHAR(150) NOT NULL,
            descripcion TEXT NOT NULL DEFAULT '',
            fecha_inicio TIMESTAMP NOT NULL,
            fecha_fin TIMESTAMP NOT NULL,
            CONSTRAINT reuniones_fechas_validas CHECK (fecha_fin > fecha_inicio)
        );
    `,
};
