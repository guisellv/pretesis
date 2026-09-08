import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import path from "path";

// 1. Cargar variables de entorno (asume que tu .env está en la raíz del proyecto)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3000;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("Falta DATABASE_URL en el archivo .env");
}

// 2. Crear el Pool de PostgreSQL (NO usamos pool.end() para que quede abierto para las rutas)
export const pool = new Pool({ connectionString: databaseUrl });

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Rutas de prueba para tu avance
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'success', message: 'API de Agenda Comunitaria funcionando' });
});

// 5. Función principal: Conecta a BD y luego levanta el servidor
async function iniciarServidor() {
    try {
        // Probamos que la base de datos responda antes de abrir el puerto
        const result = await pool.query("SELECT NOW() AS current_time");
        console.log("Conexión a PostgreSQL exitosa:", result.rows[0].current_time);

        // Si la conexión es exitosa, levantamos la API de Express
        app.listen(PORT, () => {
            console.log(`Servidor de Agenda Comunitaria ejecutándose en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("No se pudo conectar a PostgreSQL:", error);
        process.exitCode = 1;
    }
}

iniciarServidor();