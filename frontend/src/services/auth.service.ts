import api from './api';

export type Usuario = {
    id: number;
    nombre: string;
};

type LoginResponse = {
    token: string;
    usuario: Usuario;
};

export async function iniciarSesion(correo: string, clave: string) {
    const { data } = await api.post<LoginResponse>('/auth/login', { correo, clave });
    return data;
}

export async function registrarUsuario(nombre: string, correo: string, clave: string) {
    await api.post('/auth/registro', { nombre, correo, clave });
}

export async function solicitarRecuperacion(correo: string) {
    const { data } = await api.post<{ mensaje: string }>('/auth/recuperar', { correo });
    return data;
}

export async function restablecerClave(correo: string, codigo: string, nuevaClave: string) {
    const { data } = await api.post<{ mensaje: string }>('/auth/restablecer', { correo, codigo, nuevaClave });
    return data;
}