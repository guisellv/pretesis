// Tabla: users
// rol: 'usuario' (por defecto) o 'admin' (administrador del sistema: puede gestionar usuarios)
export const ROLES_SISTEMA = ['usuario', 'admin'] as const;

export type RolSistema = (typeof ROLES_SISTEMA)[number];

export interface Usuario {
    id: number;
    nombreCompleto: string;
    email: string;
    clave: string; // hash bcrypt, nunca se devuelve al cliente
    rut: string | null;
    rol: RolSistema;
    creado_en: Date;
    actualizado_en: Date;
}

// Datos del usuario que sí se pueden enviar al cliente
export type UsuarioPublico = Pick<Usuario, 'id'> & { nombre: string };
