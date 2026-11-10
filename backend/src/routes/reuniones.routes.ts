import { Router } from 'express';
import {
    listarReuniones,
    crearReunion,
    actualizarReunion,
    eliminarReunion,
} from '../controllers/reuniones.controller';
import { obtenerFormulario, guardarFormulario } from '../controllers/formularios.controller';
import { requireAuth, requireAdmin } from '../middleware';

const router = Router();

// Formulario de la reunión: todos los del grupo lo leen; solo administrador y secretaria lo modifican
router.get('/:id/formulario', requireAuth, obtenerFormulario);
router.put('/:id/formulario', requireAuth, guardarFormulario);

router.get('/', requireAuth, listarReuniones);
router.post('/', requireAuth, requireAdmin, crearReunion);
router.put('/:id', requireAuth, requireAdmin, actualizarReunion);
router.delete('/:id', requireAuth, requireAdmin, eliminarReunion);

export default router;