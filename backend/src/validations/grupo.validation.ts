import { z } from 'zod';
import { idSchema, textoObligatorio, tituloSchema } from './comun.validation';

export const crearGrupoSchema = z.object({
    nombre: tituloSchema(
        'El nombre del grupo',
        'El nombre del grupo debe tener al menos una letra, no puede ser solo números'
    ),
});

// Modificar el grupo: por ahora solo se puede cambiar el nombre
export const actualizarGrupoSchema = crearGrupoSchema;

export const unirseGrupoSchema = z.object({
    codigo_acceso: textoObligatorio('El código de acceso es obligatorio').toUpperCase(),
});

export const grupoParamsSchema = z.object({
    grupoId: idSchema('El grupo es obligatorio'),
});

export const integranteParamsSchema = z.object({
    grupoId: idSchema('El grupo y el integrante son obligatorios'),
    usuarioId: idSchema('El grupo y el integrante son obligatorios'),
});

// El rol de Administrador no se asigna: lo tiene solo quien creó el grupo
export const actualizarRolSchema = z.object({
    rol: z.enum(['Integrante', 'Secretaria'], { error: 'El rol debe ser Integrante o Secretaria' }),
});

export type CrearGrupoDatos = z.infer<typeof crearGrupoSchema>;
export type ActualizarGrupoDatos = z.infer<typeof actualizarGrupoSchema>;
export type UnirseGrupoDatos = z.infer<typeof unirseGrupoSchema>;
export type ActualizarRolDatos = z.infer<typeof actualizarRolSchema>;
