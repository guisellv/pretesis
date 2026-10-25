import app from './app';
import { pool } from './config/database';

const PORT = process.env.PORT || 3001;

async function iniciarServidor() {
    try {
        await pool.query('SELECT NOW() AS current_time');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios_grupos (
                usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
                rol VARCHAR(50) NOT NULL DEFAULT 'Lector',
                PRIMARY KEY (usuario_id, grupo_id)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reuniones (
                id SERIAL PRIMARY KEY,
                grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
                titulo VARCHAR(150) NOT NULL,
                descripcion TEXT NOT NULL DEFAULT '',
                fecha_inicio TIMESTAMP NOT NULL,
                fecha_fin TIMESTAMP NOT NULL,
                CONSTRAINT reuniones_fechas_validas CHECK (fecha_fin > fecha_inicio)
            )
        `);
        await pool.query('ALTER TABLE users ALTER COLUMN rut DROP NOT NULL');

        console.log('Conexión a PostgreSQL exitosa');

        app.listen(PORT, () => {
            console.log(
                `Servidor ejecutándose en http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error('No se pudo conectar a PostgreSQL:', error);
        process.exitCode = 1;
    }
}

iniciarServidor();