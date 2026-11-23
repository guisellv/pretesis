import api from './api';

export type Grupo = {
    id: number;
    nombre: string;
    codigo_acceso: string;
    creado_en: string;
    actualizado_en: string;
    rol: string; // rol del usuario con sesión en este grupo
    cantidad_integrantes: number;
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

// El código de acceso lo genera el backend
export async function crearGrupo(nombre: string) {
    const { data } = await api.post<CrearGrupoResponse>('/grupos', { nombre });

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

export type Integrante = {
    id: number;
    nombre: string;
    rol: string;
};

export type RolIntegrante = 'Integrante' | 'Secretaria';

type ListarIntegrantesResponse = {
    integrantes: Integrante[];
};

export async function listarIntegrantes(grupoId: number) {
    const { data } = await api.get<ListarIntegrantesResponse>(`/grupos/${grupoId}/integrantes`);

    return data.integrantes;
}

export async function actualizarRolIntegrante(grupoId: number, usuarioId: number, rol: RolIntegrante) {
    const { data } = await api.put<{ integrante: Integrante }>(
        `/grupos/${grupoId}/integrantes/${usuarioId}/rol`,
        { rol }
    );

    return data.integrante;
}

export async function actualizarGrupo(grupoId: number, nombre: string) {
    const { data } = await api.put<{ grupo: Grupo }>(`/grupos/${grupoId}`, { nombre });

    return data.grupo;
}

export async function eliminarGrupo(grupoId: number) {
    await api.delete(`/grupos/${grupoId}`);
}
