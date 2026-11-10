import { Router } from 'express';
import {
    listarGrupos,
    crearGrupo,
    unirseGrupo,
    listarIntegrantes,
    actualizarRolIntegrante
} from '../controllers/grupos.controller';
import { requireAuth, requireAdmin } from '../middleware';

const router = Router();

router.get('/', requireAuth, listarGrupos);
router.post('/', requireAuth, crearGrupo);
router.post('/unirse', requireAuth, unirseGrupo);
router.get('/:grupoId/integrantes', requireAuth, listarIntegrantes);
router.put('/:grupoId/integrantes/:usuarioId/rol', requireAuth, requireAdmin, actualizarRolIntegrante);

export default router;