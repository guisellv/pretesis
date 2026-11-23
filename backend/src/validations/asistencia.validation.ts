import { z } from 'zod';
import { ESTADOS_ASISTENCIA } from '../entities';

export const confirmarAsistenciaSchema = z.object({
    estado: z.enum(ESTADOS_ASISTENCIA, { error: 'Indica si asistirás o no a la reunión' }),
});

export type ConfirmarAsistenciaDatos = z.infer<typeof confirmarAsistenciaSchema>;
