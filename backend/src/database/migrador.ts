import { pool } from '../config/database';
import { migraciones } from './migrations';

// Aplica, en orden, las migraciones que aún no se han ejecutado en la base de datos.
// Cada una corre en su propia transacción: si falla, no queda a medias.
export async function ejecutarMigraciones(): Promise<void> {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS migraciones (
            nombre VARCHAR(100) PRIMARY KEY,
            ejecutada_en TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

    const result = await pool.query<{ nombre: string }>('SELECT nombre FROM migraciones');
    const aplicadas = new Set(result.rows.map((fila) => fila.nombre));

    for (const migracion of migraciones) {
        if (aplicadas.has(migracion.nombre)) continue;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            await client.query(migracion.up);
            await client.query('INSERT INTO migraciones (nombre) VALUES ($1)', [migracion.nombre]);
            await client.query('COMMIT');
            console.log(`Migración aplicada: ${migracion.nombre}`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Falló la migración ${migracion.nombre}: ${(error as Error).message}`);
        } finally {
            client.release();
        }
    }
}

// Permite ejecutar las migraciones por separado con: npm run migrate
if (require.main === module) {
    ejecutarMigraciones()
        .then(() => console.log('Migraciones al día'))
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        })
        .finally(() => pool.end());
}
