import { Router } from 'express';
import {
    listarReuniones,
    crearReunion,
    actualizarReunion,
    eliminarReunion,
} from '../controllers/reuniones.controller';
import { obtenerFormulario, guardarFormulario } from '../controllers/formularios.controller';
import { requireAdmin, requireAuth, requireEditorFormulario, requireMiembro, validar } from '../middleware';
import {
    actualizarReunionSchema,
    crearReunionSchema,
    guardarFormularioSchema,
    listarReunionesQuerySchema,
    reunionParamsSchema,
} from '../validations';

const router = Router();

// Todas las rutas de reuniones requieren haber iniciado sesión
router.use(requireAuth);

// Reuniones: todos los del grupo las ven; solo el administrador las crea, edita y elimina
router.get('/', validar({ query: listarReunionesQuerySchema }), requireMiembro, listarReuniones);
router.post('/', validar({ body: crearReunionSchema }), requireAdmin, crearReunion);
router.put('/:id', validar({ params: reunionParamsSchema, body: actualizarReunionSchema }), requireAdmin, actualizarReunion);
router.delete('/:id', validar({ params: reunionParamsSchema }), requireAdmin, eliminarReunion);

// Formulario de la reunión: todos los del grupo lo leen; solo administrador y secretaria lo modifican
router.get('/:id/formulario', validar({ params: reunionParamsSchema }), requireMiembro, obtenerFormulario);
router.put(
    '/:id/formulario',
    validar({ params: reunionParamsSchema, body: guardarFormularioSchema }),
    requireEditorFormulario,
    guardarFormulario
);

export default router;
