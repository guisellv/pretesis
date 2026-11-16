import { z } from 'zod';
import { textoObligatorio } from './comun.validation';

export const guardarFormularioSchema = z.object({
    contenido: textoObligatorio('El formulario no puede estar vacío'),
});

export type GuardarFormularioDatos = z.infer<typeof guardarFormularioSchema>;
