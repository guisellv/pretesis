import app from './app';
import { PORT } from './config/configEnv';
import { pool } from './config/database';
import { ejecutarMigraciones } from './database/migrador';

async function iniciarServidor() {
    try {
        await pool.query('SELECT NOW() AS current_time');
        console.log('Conexión a PostgreSQL exitosa');

        // La creación y cambios de tablas viven en src/database/migrations
        await ejecutarMigraciones();

        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error);
        process.exitCode = 1;
    }
}

iniciarServidor();
