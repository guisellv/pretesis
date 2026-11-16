import { requireRol } from './rol.middleware';

// Solo el administrador del grupo. Se usa en:
// - POST   /api/reuniones                               (crear reunión)
// - PUT    /api/reuniones/:id                           (editar reunión)
// - DELETE /api/reuniones/:id                           (eliminar reunión)
// - PUT    /api/grupos/:grupoId/integrantes/:usuarioId/rol (cambiar el rol de un integrante)
export const requireAdmin = requireRol(['Administrador'], 'Solo el administrador puede realizar esta acción');
