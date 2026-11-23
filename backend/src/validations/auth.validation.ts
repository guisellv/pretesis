import { z } from 'zod';
import { correoSchema, textoObligatorio } from './comun.validation';

// bcrypt solo considera los primeros 72 bytes de la contraseña
export const claveNuevaSchema = z
    .string({ error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(72, 'La contraseña no puede superar los 72 caracteres');

export const registroSchema = z.object({
    nombre: textoObligatorio('El nombre es obligatorio').max(150, 'El nombre no puede superar los 150 caracteres'),
    correo: correoSchema,
    clave: claveNuevaSchema,
});

export const loginSchema = z.object({
    correo: correoSchema,
    clave: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
});

export const solicitarRecuperacionSchema = z.object({
    correo: correoSchema,
});

export const restablecerClaveSchema = z.object({
    correo: correoSchema,
    codigo: z
        .string({ error: 'El código es obligatorio' })
        .trim()
        .regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
    nuevaClave: claveNuevaSchema,
});

export type RegistroDatos = z.infer<typeof registroSchema>;
export type LoginDatos = z.infer<typeof loginSchema>;
export type SolicitarRecuperacionDatos = z.infer<typeof solicitarRecuperacionSchema>;
export type RestablecerClaveDatos = z.infer<typeof restablecerClaveSchema>;
