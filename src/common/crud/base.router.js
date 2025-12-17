const { Router } = require('express');
const { globalRoles: defaultRoles, globalMiddlewares: defaultMiddlewares } = require('@middlewares/auth.rol.global');
const { requireAppRoles, requireAuthRoles } = require('@middlewares/auth.middleware');

function buildRoleMiddlewares(globalRoles = [], routeRoleConfig = undefined) {
  // routeRoleConfig puede ser:
  // - undefined/null/[]: usa globalRoles y requireAppRoles
  // - array: usa requireAppRoles
  // - { type: 'app'|'auth', values: [...] }
  if (!routeRoleConfig) {
    if (!Array.isArray(globalRoles) || !globalRoles.length) return [];
    return requireAppRoles(globalRoles);
  }
  if (Array.isArray(routeRoleConfig)) {
    const roles = [
      ...(Array.isArray(globalRoles) ? globalRoles : []),
      ...routeRoleConfig
    ].filter(Boolean);
    if (!roles.length) return [];
    return requireAppRoles(roles);
  }
  if (typeof routeRoleConfig === 'object' && routeRoleConfig.type && Array.isArray(routeRoleConfig.values)) {
    const roles = [
      ...(Array.isArray(globalRoles) ? globalRoles : []),
      ...routeRoleConfig.values
    ].filter(Boolean);
    if (!roles.length) return [];
    if (routeRoleConfig.type === 'auth') return requireAuthRoles(roles);
    return requireAppRoles(roles);
  }
  return [];
}

function baseRouter(controller, routeName = '', config = {}) {
  const router = Router();
  const {
    globalMiddlewares = defaultMiddlewares,
    globalRoles = defaultRoles,
    roles = {},
    disable = [],
    validation = null,
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
  const getRoles = (opName) => buildRoleMiddlewares(globalRoles, roles[opName]);

  if (isEnabled('list')) router.get(
    '/',
    ...(v.getAll ? [v.getAll] : []),
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

  router.routeName = routeName;

  return router;
}

module.exports = baseRouter;
