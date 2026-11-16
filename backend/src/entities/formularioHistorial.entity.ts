// Tabla: formularios_historial (trazabilidad de cada cambio del acta)
export type AccionHistorial = 'creó' | 'modificó';

export interface FormularioHistorial {
    id: number;
    reunion_id: number;
    usuario_id: number | null; // null si el usuario fue eliminado
    accion: AccionHistorial;
    contenido: string;
    fecha: Date;
}
