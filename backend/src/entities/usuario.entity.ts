// Tabla: users
export interface Usuario {
    id: number;
    nombreCompleto: string;
    email: string;
    clave: string; // hash bcrypt, nunca se devuelve al cliente
    rut: string | null;
    rol: string;
}

// Datos del usuario que sí se pueden enviar al cliente
export type UsuarioPublico = Pick<Usuario, 'id'> & { nombre: string };
