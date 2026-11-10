import api from './api';

export type Reunion = {
    id: number;
    grupo_id: number;
    titulo: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
    modalidad: Modalidad;
    plataforma: string | null; // solo online
    enlace: string | null; // solo online
    direccion: string | null; // solo presencial
};

export type Modalidad = 'online' | 'presencial';

// Reunión del grupo con la que se cruza el horario (respuesta 409 del backend)
export type ChoqueReunion = Pick<Reunion, 'id' | 'titulo' | 'fecha_inicio' | 'fecha_fin'>;

type OpcionesGuardado = {
    // true = guardar aunque el horario choque con otra reunión
    confirmarChoque?: boolean;
};

type ReunionesResponse = { reuniones: Reunion[] };
type ReunionResponse = { reunion: Reunion };

export async function listarReuniones(grupoId: number, usuarioId: number) {
    const { data } = await api.get<ReunionesResponse>('/reuniones', {
        params: { grupo_id: grupoId, usuario_id: usuarioId },
    });
    return data.reuniones;
}

export async function crearReunion(
    reunion: Omit<Reunion, 'id'>,
    usuarioId: number,
    { confirmarChoque = false }: OpcionesGuardado = {}
) {
    const { data } = await api.post<ReunionResponse>('/reuniones', {
        ...reunion,
        usuario_id: usuarioId,
        confirmar_choque: confirmarChoque,
    });
    return data.reunion;
}

export async function actualizarReunion(
    reunion: Reunion,
    usuarioId: number,
    { confirmarChoque = false }: OpcionesGuardado = {}
) {
    const { data } = await api.put<ReunionResponse>(`/reuniones/${reunion.id}`, {
        ...reunion,
        usuario_id: usuarioId,
        confirmar_choque: confirmarChoque,
    });
    return data.reunion;
}

export type FormularioActa = {
    reunion_id: number;
    contenido: string;
    actualizado_en: string;
};

export type CambioFormulario = {
    id: number;
    accion: 'creó' | 'modificó';
    fecha: string;
    usuario_id: number | null;
    usuario_nombre: string;
    contenido: string; // texto del formulario tal como quedó en este cambio
};

type FormularioActaResponse = {
    formulario: FormularioActa | null;
    historial: CambioFormulario[];
};

export async function obtenerFormularioActa(reunionId: number) {
    const { data } = await api.get<FormularioActaResponse>(`/reuniones/${reunionId}/formulario`);
    return data;
}

export async function guardarFormularioActa(reunionId: number, contenido: string) {
    const { data } = await api.put<FormularioActaResponse>(`/reuniones/${reunionId}/formulario`, {
        contenido,
    });
    return data;
}

export async function eliminarReunion(id: number, usuarioId: number) {
    await api.delete(`/reuniones/${id}`, { params: { usuario_id: usuarioId } });
}