import dotenv from 'dotenv';
import path from 'path';

// Único lugar donde se leen las variables de entorno del backend.
// El resto del código importa estas constantes en vez de usar process.env directamente.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function obligatoria(nombre: string): string {
    const valor = process.env[nombre];

    if (!valor) {
        throw new Error(`Falta la variable de entorno ${nombre} en el archivo .env`);
    }

    return valor;
}

function opcional(nombre: string, valorPorDefecto = ''): string {
    return process.env[nombre] || valorPorDefecto;
}

// Servidor
export const PORT = Number(opcional('PORT', '3001'));

// Carpeta con el frontend compilado. Solo se usa en Docker, donde Express sirve también el frontend.
export const FRONTEND_DIR = opcional('FRONTEND_DIR');

// Base de datos (PostgreSQL)
export const DB_HOST = opcional('HOST', 'localhost');
export const DB_PORT = Number(opcional('DB_PORT', '5432'));
export const DB_USERNAME = obligatoria('DB_USERNAME');
export const DB_PASSWORD = obligatoria('PASSWORD');
export const DB_DATABASE = obligatoria('DATABASE');

// Autenticación
export const JWT_SECRET = obligatoria('JWT_SECRET');
export const JWT_EXPIRES_IN = '8h';

// Dirección de la aplicación. Si se configura, los correos de aviso incluyen un botón para entrar.
export const APP_URL = opcional('APP_URL');

// Correo (SMTP). Si no se configuran, los códigos de recuperación y los avisos se muestran en la consola.
export const SMTP_HOST = opcional('SMTP_HOST');
export const SMTP_PORT = Number(opcional('SMTP_PORT', '587'));
export const SMTP_USER = opcional('SMTP_USER');
export const SMTP_PASS = opcional('SMTP_PASS');
export const SMTP_FROM = opcional('SMTP_FROM', SMTP_USER);
export const SMTP_CONFIGURADO = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
