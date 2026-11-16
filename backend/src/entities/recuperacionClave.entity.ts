// Tabla: recuperacion_clave (códigos para restablecer la contraseña)
export interface RecuperacionClave {
    id: number;
    usuario_id: number;
    codigo_hash: string;
    expira_en: Date;
    intentos: number;
    usado: boolean;
    creado_en: Date;
}
