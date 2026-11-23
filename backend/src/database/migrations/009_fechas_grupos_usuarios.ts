import { Migracion } from './tipos';

// Fechas de creación y modificación para mostrarlas en las tablas de Grupos y Usuarios.
// Los registros que ya existían quedan con la fecha en que se aplicó esta migración.
// users.rol puede ser 'usuario' (por defecto) o 'admin' (administrador del sistema, gestiona usuarios).
export const migracion: Migracion = {
    nombre: '009_fechas_grupos_usuarios',
    up: `
        ALTER TABLE grupos
            ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT NOW();

        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NOT NULL DEFAULT NOW();
    `,
};
