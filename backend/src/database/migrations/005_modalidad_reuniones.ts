import { Migracion } from './tipos';

// Modalidad de la reunión: online (plataforma + enlace) o presencial (dirección)
export const migracion: Migracion = {
    nombre: '005_modalidad_reuniones',
    up: `
        ALTER TABLE reuniones
            ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20) NOT NULL DEFAULT 'presencial',
            ADD COLUMN IF NOT EXISTS plataforma VARCHAR(100),
            ADD COLUMN IF NOT EXISTS enlace TEXT,
            ADD COLUMN IF NOT EXISTS direccion TEXT;
    `,
};
