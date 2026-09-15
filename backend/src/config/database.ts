import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("Falta DATABASE_URL en el archivo .env");
}

export const pool = new Pool({ connectionString: databaseUrl });
