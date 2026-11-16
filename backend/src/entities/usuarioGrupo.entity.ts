// Tabla: usuarios_grupos (relación muchos a muchos entre users y grupos)
export const ROLES_GRUPO = ['Administrador', 'Secretaria', 'Integrante'] as const;

export type RolGrupo = (typeof ROLES_GRUPO)[number];

export interface UsuarioGrupo {
    usuario_id: number;
    grupo_id: number;
    rol: RolGrupo;
}
