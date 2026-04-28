const { Router } = require('express');
const { globalRoles: defaultRoles, globalMiddlewares: defaultMiddlewares } = require('@middlewares/auth.rol.global');
const { requireRoles } = require('@middlewares/auth.middleware');

function buildRoleMiddlewares(routeRoleConfig = undefined) {
  // routeRoleConfig puede ser:
  // - undefined/null: solo aplica middleware de autenticación (rol global verifica automáticamente)
  // - { type: 'app'|'auth', values: [...] }: configuración simple
  // - [{ type: 'app'|'auth', values: [...] }, ...]: configuración múltiple
  
  if (!routeRoleConfig) {
    // Sin configuración explícita: por defecto exige rol global (app) definido en auth.rol.global
    return requireRoles({ type: 'app', values: defaultRoles });
  }
  
  // Normalizar a array
  const configs = Array.isArray(routeRoleConfig) ? routeRoleConfig : [routeRoleConfig];
  
  // Validar que todas las configuraciones sean válidas
  const validConfigs = configs.filter(config => 
    config && 
    typeof config === 'object' && 
    config.type && 
    Array.isArray(config.values) && 
    config.values.length > 0
  );
  
  if (validConfigs.length === 0) return [];
  
  // Usar requireRoles que maneja roles globales automáticamente
  return requireRoles(validConfigs);
}

function baseRouter(controller, routeName = '', config = {}) {
  const router = Router();
  const {
    globalMiddlewares = defaultMiddlewares,
    globalRoles = defaultRoles,
    roles = {},
    disable = [],
    validation = null,
    booleanFields = [],
  } = config;

  if (Array.isArray(globalMiddlewares) && globalMiddlewares.length) {
    router.use(...globalMiddlewares);
  }

  // Normalizar listado de operaciones deshabilitadas
  const disableSet = new Set(
    Array.isArray(disable)
      ? disable.map(d => String(d).toLowerCase())
      : []
  );

  const isEnabled = key => !disableSet.has(key.toLowerCase());

  const v = validation && validation.middlewares ? validation.middlewares : {};
  const getRoles = (opName) => buildRoleMiddlewares(roles[opName]);

  const flattenMiddleware = (mw) => Array.isArray(mw) ? mw : (mw ? [mw] : []);

  if (isEnabled('list')) router.get(
    '/',
    ...flattenMiddleware(v.getAll),
    ...getRoles('list'),
    controller.getAll
  );
  if (isEnabled('get')) router.get(
    '/:id',
    ...(v.getById ? [v.getById] : []),
    ...getRoles('get'),
    controller.getById
  );
  if (isEnabled('create')) router.post(
    '/',
    ...(v.create ? [v.create] : []),
    ...getRoles('create'),
    controller.create
  );
  if (isEnabled('update')) router.put(
    '/:id',
    ...(v.update ? [v.update] : []),
    ...getRoles('update'),
    controller.update
  );
  if (isEnabled('delete')) router.delete(
    '/:id',
    ...(v.delete ? [v.delete] : []),
    ...getRoles('delete'),
    controller.delete
  );

  if (Array.isArray(booleanFields) && booleanFields.length && isEnabled('toggle')) router.patch(
    '/:id/toggle/:field',
    ...(v.toggle ? [v.toggle] : []),
    ...getRoles('toggle'),
    controller.toggleBoolean
  );

  router.routeName = routeName;

  return router;
}

module.exports = baseRouter;
