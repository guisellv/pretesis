import { Router } from 'express';
import {
    registrarUsuario,
    iniciarSesion
} from '../controllers/login.controller';

const router = Router();

router.post('/registro', registrarUsuario);
router.post('/login', iniciarSesion);

export default router;