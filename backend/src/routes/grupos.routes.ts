import { Router } from 'express';
import {
    listarGrupos,
    crearGrupo,
    unirseGrupo,
    listarIntegrantes,
    actualizarRolIntegrante,
    actualizarGrupo,
    eliminarGrupo
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

export default router;
