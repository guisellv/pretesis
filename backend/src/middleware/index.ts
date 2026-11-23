// Middlewares de la API y dónde se usan (ver src/routes):
//
// requireAuth             -> todas las rutas de /api/grupos, /api/reuniones y /api/usuarios (router.use en cada archivo de rutas)
// validar(...)            -> todas las rutas que reciben datos; los esquemas están en src/validations
// requireMiembro          -> ver reuniones, integrantes y el formulario; confirmar asistencia; salir del grupo
// requireEditorFormulario -> guardar el formulario de una reunión (administrador o secretaria)
// requireAdmin            -> crear, editar y eliminar reuniones; modificar y eliminar el grupo; cambiar el rol o quitar a un integrante; regenerar el código
// requireAdminSistema     -> gestión de usuarios (/api/usuarios), solo users.rol = 'admin'
//
// Orden en cada ruta: requireAuth -> validar -> permiso de rol -> controlador
export * from './auth.middleware';
export * from './validate.middleware';
export * from './rol.middleware';
export * from './admin.middleware';
export * from './adminSistema.middleware';
