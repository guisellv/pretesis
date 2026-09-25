import { Router } from 'express';
import {
    listarGrupos,
    crearGrupo,
    unirseGrupo
} from '../controllers/grupos.controller';

const router = Router();

router.get('/', listarGrupos);
router.post('/', crearGrupo);
router.post('/unirse', unirseGrupo);

export default router;