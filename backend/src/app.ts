import express, { Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/login.routes';
import gruposRoutes from './routes/grupos.routes';
import reunionesRoutes from './routes/reuniones.routes';

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

export default app;
