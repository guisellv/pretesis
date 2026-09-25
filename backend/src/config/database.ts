import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const HOST = process.env.HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USERNAME = process.env.DB_USERNAME;
const PASSWORD = process.env.PASSWORD;
const DATABASE = process.env.DATABASE;

if (!DB_USERNAME || !PASSWORD || !DATABASE) {
    throw new Error("Faltan variables de entorno para la base de datos en el archivo .env");
}

export const pool = new Pool({
    host: HOST,
    port: DB_PORT,
    user: DB_USERNAME,
    password: PASSWORD,
    database: DATABASE,
});
