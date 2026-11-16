import { z } from 'zod';
import { MODALIDADES_REUNION } from '../entities';
import { calcularFechaFin, esFechaValida } from '../helpers/fecha.helper';
import { idSchema, textoOpcional, tituloSchema } from './comun.validation';

// Las fechas llegan como "YYYY-MM-DDTHH:MM" en hora local (sin zona horaria)
const fechaSchema = z
    .string({ error: 'La fecha de inicio es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'La fecha de inicio no es válida')
    .refine(esFechaValida, 'La fecha de inicio no es válida');

const camposReunion = {
    titulo: tituloSchema(
        'El título de la reunión',
        'El título de la reunión debe tener al menos una letra, no puede ser solo números'
    ),
    descripcion: textoOpcional(),
    fecha_inicio: fechaSchema,
    fecha_fin: fechaSchema.optional(),
    modalidad: z.preprocess(
        (valor) => (typeof valor === 'string' ? valor.trim().toLowerCase() : valor),
        z.enum(MODALIDADES_REUNION, { error: 'Selecciona si la reunión es online o presencial' })
    ),
    plataforma: textoOpcional(),
    enlace: textoOpcional(),
    direccion: textoOpcional(),
    // true cuando el usuario ya vio el aviso de choque de horario y decidió guardar igual
    confirmar_choque: z.boolean().optional().default(false),
};

type CamposReunion = z.output<z.ZodObject<typeof camposReunion>>;

function enlaceValido(enlace: string): boolean {
    try {
        const url = new URL(enlace);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// Reglas que dependen de más de un campo
function validarReglas(datos: CamposReunion, ctx: z.RefinementCtx) {
    if (datos.fecha_fin && datos.fecha_fin <= datos.fecha_inicio) {
        ctx.addIssue({ code: 'custom', path: ['fecha_fin'], message: 'La hora de término debe ser posterior a la de inicio' });
    }

    if (datos.modalidad === 'online') {
        if (!datos.plataforma || !datos.enlace) {
            ctx.addIssue({ code: 'custom', path: ['enlace'], message: 'Para una reunión online indica la plataforma y el enlace' });
        } else if (!enlaceValido(datos.enlace)) {
            ctx.addIssue({
                code: 'custom',
                path: ['enlace'],
                message: 'El enlace de la reunión no es válido (debe comenzar con http:// o https://)',
            });
        }
    }

    if (datos.modalidad === 'presencial' && !datos.direccion) {
        ctx.addIssue({ code: 'custom', path: ['direccion'], message: 'Para una reunión presencial indica la dirección' });
    }
}

// Deja solo los datos que corresponden a la modalidad y completa la fecha de término (1 hora por defecto)
function normalizar<T extends CamposReunion>(datos: T) {
    const online = datos.modalidad === 'online';

    return {
        ...datos,
        fecha_fin: calcularFechaFin(datos.fecha_inicio, datos.fecha_fin),
        plataforma: online ? datos.plataforma : null,
        enlace: online ? datos.enlace : null,
        direccion: online ? null : datos.direccion,
    };
}

export const crearReunionSchema = z
    .object({ grupo_id: idSchema('El grupo es obligatorio'), ...camposReunion })
    .superRefine(validarReglas)
    .transform(normalizar);

export const actualizarReunionSchema = z
    .object(camposReunion)
    .superRefine(validarReglas)
    .transform(normalizar);

export const listarReunionesQuerySchema = z.object({
    grupo_id: idSchema('El grupo es obligatorio'),
});

export const reunionParamsSchema = z.object({
    id: idSchema('La reunión no es válida'),
});

export type CrearReunionDatos = z.output<typeof crearReunionSchema>;
export type ActualizarReunionDatos = z.output<typeof actualizarReunionSchema>;
