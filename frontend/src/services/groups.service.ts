import api from './api';

export type Grupo = {
    id: number;
    nombre: string;
    codigo_acceso: string;
    rol?: string;
};

type CrearGrupoResponse = {
    grupo: Grupo;
};

type UnirseGrupoResponse = {
    grupo: Grupo;
};

type ListarGruposResponse = {
    grupos: Grupo[];
};

export async function crearGrupo(nombre: string, codigoAcceso: string, usuarioId: number) {
    const { data } = await api.post<CrearGrupoResponse>('/grupos', {
        nombre,
        codigo_acceso: codigoAcceso,
        usuario_id: usuarioId,
    });

    return data.grupo;
}

export async function unirseGrupo(usuarioId: number, codigoAcceso: string) {
    const { data } = await api.post<UnirseGrupoResponse>('/grupos/unirse', {
        usuario_id: usuarioId,
        codigo_acceso: codigoAcceso.trim().toUpperCase(),
    });

    return data.grupo;
}

export async function listarGrupos(usuarioId: number) {
    const { data } = await api.get<ListarGruposResponse>('/grupos', {
        params: { usuario_id: usuarioId },
    });

    return data.grupos;
}