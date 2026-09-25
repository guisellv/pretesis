import { Router } from 'express';
import {
    listarReuniones,
    crearReunion,
    actualizarReunion,
    eliminarReunion,
} from '../controllers/reuniones.controller';

const router = Router();

router.get('/', listarReuniones);
router.post('/', crearReunion);
router.put('/:id', actualizarReunion);
router.delete('/:id', eliminarReunion);

export default router;