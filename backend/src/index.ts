import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import path from "path";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const app = express();
const PORT = process.env.PORT || 3001;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("Falta DATABASE_URL en el archivo .env");
}

//  Crear el Pool de PostgreSQL
export const pool = new Pool({ connectionString: databaseUrl });

app.use(cors());
app.use(express.json());

// 4. Ruta base
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'success', message: 'API de Agenda Comunitaria funcionando' });
});


// registro de usuario con correo y contraseña
app.post('/api/auth/registro', async (req: Request, res: Response): Promise<any> => {
    try {
        const { nombre, correo, clave } = req.body;

        if (!nombre || !correo || !clave) {
            return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
        }

        const salt = await bcrypt.genSalt(10);
        const claveHash = await bcrypt.hash(clave, salt);

        const result = await pool.query(
            `INSERT INTO users ("nombreCompleto", email, clave, rut, rol)
             VALUES ($1, $2, $3, '00000000-0', 'usuario')
             RETURNING id, "nombreCompleto" AS nombre, email AS correo`,
            [nombre, correo, claveHash]
        );

        return res.status(201).json({ mensaje: 'Usuario registrado exitosamente', usuario: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') return res.status(400).json({ error: 'Este correo ya está registrado' });
        console.error('Error al registrar usuario:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Login de usuario
app.post('/api/auth/login', async (req: Request, res: Response): Promise<any> => {
    try {
        const { correo, clave } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [correo]);
        const usuario = result.rows[0];

        if (!usuario) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

        const passwordValida = await bcrypt.compare(clave, usuario.clave);
        if (!passwordValida) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

        const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET || 'clave_respaldo', { expiresIn: '8h' });

        return res.status(200).json({ mensaje: 'Inicio de sesión exitoso', token, usuario: { id: usuario.id, nombre: usuario.nombreCompleto } });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Crear un grupo con un código de acceso único
app.post('/api/grupos', async (req: Request, res: Response): Promise<any> => {
    try {
        const { nombre, codigo_acceso } = req.body;

        if (!nombre || !codigo_acceso) {
            return res.status(400).json({ error: 'El nombre y el código del grupo son obligatorios' });
        }

        const result = await pool.query(
            `INSERT INTO grupos (nombre, codigo_acceso)
             VALUES ($1, $2)
             RETURNING id, nombre, codigo_acceso`,
            [nombre.trim(), codigo_acceso]
        );

        return res.status(201).json({ mensaje: 'Grupo creado exitosamente', grupo: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El código del grupo ya existe' });
        }

        console.error('Error al crear grupo:', error.message);
        return res.status(500).json({ error: 'No se pudo crear el grupo' });
    }
});

// Unirse a un grupo mediante código alfanumérico
app.post('/api/grupos/unirse', async (req: Request, res: Response): Promise<any> => {
    try {
        const { usuario_id, codigo_acceso, rol_solicitado } = req.body; 

        const grupoResult = await pool.query('SELECT id, nombre FROM grupos WHERE codigo_acceso = $1', [codigo_acceso]);
        const grupo = grupoResult.rows[0];

        if (!grupo) return res.status(404).json({ error: 'Código de acceso inválido' });

        await pool.query(
            'INSERT INTO usuarios_grupos (usuario_id, grupo_id, rol) VALUES ($1, $2, $3)',
            [usuario_id, grupo.id, rol_solicitado || 'Lector']
        );

        return res.status(200).json({ mensaje: `Te has unido exitosamente a: ${grupo.nombre}` });
    } catch (error: any) {
        if (error.code === '23505') return res.status(400).json({ error: 'Ya eres miembro de este grupo' });
        return res.status(500).json({ error: 'Error al unirse al grupo' });
    }
});


// inicio de servidor

async function iniciarServidor() {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");
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