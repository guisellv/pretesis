import { Router } from 'express';
import {
    listarReuniones,
    crearReunion,
    actualizarReunion,
    eliminarReunion,
} from '../controllers/reuniones.controller';
import { requireAuth, requireAdmin } from '../middleware';

const router = Router();

router.get('/', requireAuth, listarReuniones);
router.post('/', requireAuth, requireAdmin, crearReunion);
router.put('/:id', requireAuth, requireAdmin, actualizarReunion);
router.delete('/:id', requireAuth, requireAdmin, eliminarReunion);

export default router;