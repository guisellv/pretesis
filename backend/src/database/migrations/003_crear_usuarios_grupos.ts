import { Migracion } from './tipos';

export const migracion: Migracion = {
    nombre: '003_crear_usuarios_grupos',
    up: `
        CREATE TABLE IF NOT EXISTS usuarios_grupos (
            usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
            rol VARCHAR(50) NOT NULL DEFAULT 'Integrante',
            PRIMARY KEY (usuario_id, grupo_id)
        );
    `,
};
