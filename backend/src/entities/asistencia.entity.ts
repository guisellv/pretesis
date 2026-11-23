// Tabla: asistencias (confirmación de asistencia de un integrante a una reunión)
export const ESTADOS_ASISTENCIA = ['asistire', 'no_asistire'] as const;

export type EstadoAsistencia = (typeof ESTADOS_ASISTENCIA)[number];

export interface Asistencia {
    reunion_id: number;
    usuario_id: number;
    estado: EstadoAsistencia;
    actualizado_en: Date;
}
