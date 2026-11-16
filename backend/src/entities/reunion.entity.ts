// Tabla: reuniones
export const MODALIDADES_REUNION = ['online', 'presencial'] as const;

export type ModalidadReunion = (typeof MODALIDADES_REUNION)[number];

export interface Reunion {
    id: number;
    grupo_id: number;
    titulo: string;
    descripcion: string;
    fecha_inicio: Date;
    fecha_fin: Date;
    modalidad: ModalidadReunion;
    plataforma: string | null; // solo online
    enlace: string | null; // solo online
    direccion: string | null; // solo presencial
}
