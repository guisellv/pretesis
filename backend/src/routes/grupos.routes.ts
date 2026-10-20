import { Router } from 'express';
import {
    listarGrupos,
    crearGrupo,
    unirseGrupo,
    listarIntegrantes
} from '../controllers/grupos.controller';
import { requireAuth } from '../middleware';

const router = Router();

router.get('/', requireAuth, listarGrupos);
router.post('/', requireAuth, crearGrupo);
router.post('/unirse', requireAuth, unirseGrupo);
router.get('/:grupoId/integrantes', requireAuth, listarIntegrantes);

export default router;