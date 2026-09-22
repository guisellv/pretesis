import express, { Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/login.routes';
import gruposRoutes from './routes/grupos.routes';
import { pool } from './config/database';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'success',
        message: 'API de Agenda Comunitaria funcionando'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/grupos', gruposRoutes);

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