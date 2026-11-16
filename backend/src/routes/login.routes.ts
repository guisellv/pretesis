import { Router } from 'express';
import {
    registrarUsuario,
    iniciarSesion,
    solicitarRecuperacion,
    restablecerClave
} from '../controllers/login.controller';
import { validar } from '../middleware';
import {
    loginSchema,
    registroSchema,
    restablecerClaveSchema,
    solicitarRecuperacionSchema
} from '../validations';

const router = Router();

// Rutas públicas (sin requireAuth)
router.post('/registro', validar({ body: registroSchema }), registrarUsuario);
router.post('/login', validar({ body: loginSchema }), iniciarSesion);
router.post('/recuperar', validar({ body: solicitarRecuperacionSchema }), solicitarRecuperacion);
router.post('/restablecer', validar({ body: restablecerClaveSchema }), restablecerClave);

export default router;
