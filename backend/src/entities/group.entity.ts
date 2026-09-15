export interface JoinGroupData {
    usuario_id: number;
    codigo_acceso: string;
    rol_solicitado?: string;
}

export interface GroupRecord {
    id: number;
    nombre: string;
}
