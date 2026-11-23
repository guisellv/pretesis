import { Router } from 'express';
import {
    actualizarUsuario,
    crearUsuario,
    eliminarUsuario,
    listarUsuarios,
    obtenerUsuarioActual,
    verUsuario,
} from '../controllers/usuarios.controller';
import { requireAdminSistema, requireAuth, validar } from '../middleware';
import { actualizarUsuarioSchema, crearUsuarioSchema, usuarioParamsSchema } from '../validations';

const router = Router();

router.use(requireAuth);

// Cualquier usuario con sesión: sus propios datos (nombre, correo y rol del sistema)
router.get('/yo', obtenerUsuarioActual);

// El resto solo el administrador del sistema
router.use(requireAdminSistema);

router.get('/', listarUsuarios);
router.get('/:id', validar({ params: usuarioParamsSchema }), verUsuario);
router.post('/', validar({ body: crearUsuarioSchema }), crearUsuario);
router.put('/:id', validar({ params: usuarioParamsSchema, body: actualizarUsuarioSchema }), actualizarUsuario);
router.delete('/:id', validar({ params: usuarioParamsSchema }), eliminarUsuario);

export default router;
