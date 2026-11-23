import api from './api';

export type RolSistema = 'usuario' | 'admin';

export type UsuarioSistema = {
    id: number;
    nombre: string;
    correo: string;
    rol: RolSistema;
    creado_en: string;
    actualizado_en: string;
    cantidad_grupos: number;
};

export type UsuarioDetalle = UsuarioSistema & {
    grupos: { id: number; nombre: string; rol: string }[];
};

export type DatosUsuario = {
    nombre: string;
    correo: string;
    rol: RolSistema;
    clave: string; // al modificar, vacía = mantener la actual
};

// Datos del usuario con sesión iniciada
export async function obtenerUsuarioActual() {
    const { data } = await api.get<{ usuario: UsuarioSistema }>('/usuarios/yo');
    return data.usuario;
}

export async function listarUsuarios() {
    const { data } = await api.get<{ usuarios: UsuarioSistema[] }>('/usuarios');
    return data.usuarios;
}

export async function verUsuario(id: number) {
    const { data } = await api.get<{ usuario: UsuarioDetalle }>(`/usuarios/${id}`);
    return data.usuario;
}

export async function crearUsuario(datos: DatosUsuario) {
    const { data } = await api.post<{ usuario: UsuarioSistema }>('/usuarios', datos);
    return data.usuario;
}

export async function actualizarUsuario(id: number, datos: DatosUsuario) {
    const { data } = await api.put<{ usuario: UsuarioSistema }>(`/usuarios/${id}`, datos);
    return data.usuario;
}

export async function eliminarUsuario(id: number) {
    await api.delete(`/usuarios/${id}`);
}
