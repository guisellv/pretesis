import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { FRONTEND_DIR } from './config/configEnv';
import authRoutes from './routes/login.routes';
import gruposRoutes from './routes/grupos.routes';
import reunionesRoutes from './routes/reuniones.routes';
import usuariosRoutes from './routes/usuarios.routes';

const app = express();

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
app.use('/api/reuniones', reunionesRoutes);
app.use('/api/usuarios', usuariosRoutes);

// En Docker el mismo servidor entrega el frontend compilado.
// Cualquier ruta que no sea /api devuelve index.html para que funcione el router de React.
if (FRONTEND_DIR) {
    app.use(express.static(FRONTEND_DIR));

    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
        res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
    });
}

export default app;
