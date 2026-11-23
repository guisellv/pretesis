import { Router } from 'express';
import {
    listarGrupos,
    crearGrupo,
    unirseGrupo,
    listarIntegrantes,
    actualizarRolIntegrante,
    actualizarGrupo,
    eliminarGrupo,
    salirDelGrupo,
    quitarIntegrante,
    regenerarCodigo
} from '../controllers/grupos.controller';
import { requireAdmin, requireAuth, requireMiembro, validar } from '../middleware';
import {
    actualizarGrupoSchema,
    actualizarRolSchema,
    crearGrupoSchema,
    grupoParamsSchema,
    integranteParamsSchema,
    unirseGrupoSchema
} from '../validations';

const router = Router();

// Todas las rutas de grupos requieren haber iniciado sesión
router.use(requireAuth);

router.get('/', listarGrupos);
router.post('/', validar({ body: crearGrupoSchema }), crearGrupo);
router.post('/unirse', validar({ body: unirseGrupoSchema }), unirseGrupo);

// Modificar y eliminar el grupo: solo su administrador
router.put(
    '/:grupoId',
    validar({ params: grupoParamsSchema, body: actualizarGrupoSchema }),
    requireAdmin,
    actualizarGrupo
);
router.delete('/:grupoId', validar({ params: grupoParamsSchema }), requireAdmin, eliminarGrupo);
// Nuevo código de acceso (el anterior deja de funcionar): solo el administrador
router.post('/:grupoId/codigo', validar({ params: grupoParamsSchema }), requireAdmin, regenerarCodigo);
// Salir del grupo: cualquier integrante menos el administrador
router.post('/:grupoId/salir', validar({ params: grupoParamsSchema }), requireMiembro, salirDelGrupo);

router.get(
    '/:grupoId/integrantes',
    validar({ params: grupoParamsSchema }),
    requireMiembro,
    listarIntegrantes
);
router.put(
    '/:grupoId/integrantes/:usuarioId/rol',
    validar({ params: integranteParamsSchema, body: actualizarRolSchema }),
    requireAdmin,
    actualizarRolIntegrante
);

// Quitar a un integrante del grupo: solo el administrador
router.delete(
    '/:grupoId/integrantes/:usuarioId',
    validar({ params: integranteParamsSchema }),
    requireAdmin,
    quitarIntegrante
);

export default router;
