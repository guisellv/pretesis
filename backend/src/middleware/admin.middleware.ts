import { requireRol } from './rol.middleware';

// Solo el administrador del grupo. Se usa en:
// - POST   /api/reuniones                               (crear reunión)
// - PUT    /api/reuniones/:id                           (editar reunión)
// - DELETE /api/reuniones/:id                           (eliminar reunión)
// - PUT    /api/grupos/:grupoId/integrantes/:usuarioId/rol (cambiar el rol de un integrante)
// - DELETE /api/grupos/:grupoId/integrantes/:usuarioId     (quitar a un integrante)
// - POST   /api/grupos/:grupoId/codigo                     (regenerar el código de acceso)
export const requireAdmin = requireRol(['Administrador'], 'Solo el administrador puede realizar esta acción');
