import express from "express";
import cors from "cors";
import { pool } from "./config/database";
import authRoutes from "./routes/auth.routes";
import groupRoutes from "./routes/group.routes";
import healthRoutes from "./routes/health.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/grupos", groupRoutes);


// inicio de servidor

async function iniciarServidor() {
    try {
        await pool.query("SELECT NOW() AS current_time");
        console.log("Conexión a PostgreSQL exitosa");

        app.listen(PORT, () => {
            console.log(`Servidor de Agenda Comunitaria ejecutándose en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("No se pudo conectar a PostgreSQL:", error);
        process.exitCode = 1;
    }
}

iniciarServidor();