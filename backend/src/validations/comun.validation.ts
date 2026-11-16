import { z } from 'zod';
import { tituloValido } from '../helpers/titulo.helper';

// Id numérico positivo. Acepta "12" (params y query llegan como texto) y lo convierte a número.
export function idSchema(mensaje: string) {
    return z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje);
}

export function textoObligatorio(mensaje: string) {
    return z.string({ error: mensaje }).trim().min(1, mensaje);
}

export function textoOpcional() {
    return z
        .string()
        .nullish()
        .transform((valor) => valor?.trim() ?? '');
}

// Títulos y nombres: deben tener al menos una letra ("Reunión 3" sí, "123" no)
export function tituloSchema(campo: string, mensajeInvalido: string, largoMaximo = 150) {
    return textoObligatorio(`${campo} es obligatorio`)
        .max(largoMaximo, `${campo} no puede superar los ${largoMaximo} caracteres`)
        .refine(tituloValido, mensajeInvalido);
}

export const correoSchema = textoObligatorio('El correo es obligatorio').pipe(
    z.email('El correo no es válido')
);
