import { z } from 'zod';
import { ROLES_SISTEMA } from '../entities';
import { claveNuevaSchema } from './auth.validation';
import { correoSchema, idSchema, textoObligatorio } from './comun.validation';

const nombreSchema = textoObligatorio('El nombre es obligatorio').max(150, 'El nombre no puede superar los 150 caracteres');
const rolSchema = z.enum(ROLES_SISTEMA, { error: 'El rol debe ser usuario o admin' });

export const crearUsuarioSchema = z.object({
    nombre: nombreSchema,
    correo: correoSchema,
    clave: claveNuevaSchema,
    rol: rolSchema.default('usuario'),
});

// La contraseña es opcional al modificar: si llega vacía se mantiene la actual
export const actualizarUsuarioSchema = z.object({
    nombre: nombreSchema,
    correo: correoSchema,
    rol: rolSchema,
    clave: z.preprocess(
        (valor) => (valor === '' || valor === null ? undefined : valor),
        claveNuevaSchema.optional()
    ),
});

export const usuarioParamsSchema = z.object({
    id: idSchema('El usuario no es válido'),
});

export type CrearUsuarioDatos = z.output<typeof crearUsuarioSchema>;
export type ActualizarUsuarioDatos = z.output<typeof actualizarUsuarioSchema>;
