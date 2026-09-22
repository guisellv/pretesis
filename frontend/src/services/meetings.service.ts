import api from './api';

export type Reunion = {
    id: number;
    grupo_id: number;
    titulo: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
};

type ReunionesResponse = { reuniones: Reunion[] };
type ReunionResponse = { reunion: Reunion };

export async function listarReuniones(grupoId: number, usuarioId: number) {
    const { data } = await api.get<ReunionesResponse>('/reuniones', {
        params: { grupo_id: grupoId, usuario_id: usuarioId },
    });
    return data.reuniones;
}

export async function crearReunion(reunion: Omit<Reunion, 'id'>, usuarioId: number) {
    const { data } = await api.post<ReunionResponse>('/reuniones', {
        ...reunion,
        usuario_id: usuarioId,
    });
    return data.reunion;
}

export async function actualizarReunion(reunion: Reunion, usuarioId: number) {
    const { data } = await api.put<ReunionResponse>(`/reuniones/${reunion.id}`, {
        ...reunion,
        usuario_id: usuarioId,
    });
    return data.reunion;
}

export async function eliminarReunion(id: number, usuarioId: number) {
    await api.delete(`/reuniones/${id}`, { params: { usuario_id: usuarioId } });
}