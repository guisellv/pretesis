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
        // Modalidad de la reunión: online (plataforma + enlace) o presencial (dirección)
        await pool.query(`
            ALTER TABLE reuniones
                ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20) NOT NULL DEFAULT 'presencial',
                ADD COLUMN IF NOT EXISTS plataforma VARCHAR(100),
                ADD COLUMN IF NOT EXISTS enlace TEXT,
                ADD COLUMN IF NOT EXISTS direccion TEXT
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS formularios_reunion (
                reunion_id INTEGER PRIMARY KEY REFERENCES reuniones(id) ON DELETE CASCADE,
                contenido TEXT NOT NULL DEFAULT '',
                actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS formularios_historial (
                id SERIAL PRIMARY KEY,
                reunion_id INTEGER NOT NULL REFERENCES reuniones(id) ON DELETE CASCADE,
                usuario_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                accion VARCHAR(20) NOT NULL,
                contenido TEXT NOT NULL,
                fecha TIMESTAMP NOT NULL DEFAULT NOW()
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