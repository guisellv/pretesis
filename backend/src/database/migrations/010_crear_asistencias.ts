import { Migracion } from './tipos';

// Confirmación de asistencia: cada integrante indica si asistirá o no a una reunión.
// Si no hay fila, el integrante todavía no responde.
export const migracion: Migracion = {
    nombre: '010_crear_asistencias',
    up: `
        CREATE TABLE IF NOT EXISTS asistencias (
            reunion_id INTEGER NOT NULL REFERENCES reuniones(id) ON DELETE CASCADE,
            usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            estado VARCHAR(15) NOT NULL CHECK (estado IN ('asistire', 'no_asistire')),
            actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
            PRIMARY KEY (reunion_id, usuario_id)
        );
    `,
};
