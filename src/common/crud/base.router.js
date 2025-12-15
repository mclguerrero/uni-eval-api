const { Router } = require('express');
const { globalRoles: defaultRoles, globalMiddlewares: defaultMiddlewares } = require('@middlewares/auth.rol.global');
const { requireAppRoles } = require('@middlewares/auth.middleware');

function buildRoleMiddlewares(globalRoles = []) {
  if (!Array.isArray(globalRoles) || !globalRoles.length) return [];
  return requireAppRoles(globalRoles);
}

function baseRouter(controller, routeName = '', config = {}) {
  const router = Router();
  const {
    globalMiddlewares = defaultMiddlewares,
    globalRoles = defaultRoles,
    disable = [],
  } = config;

  if (Array.isArray(globalMiddlewares) && globalMiddlewares.length) {
    router.use(...globalMiddlewares);
  }

  const roleMiddlewares = buildRoleMiddlewares(globalRoles);

  // Normalizar listado de operaciones deshabilitadas
  const disableSet = new Set(
    Array.isArray(disable)
      ? disable.map(d => String(d).toLowerCase())
      : []
  );

  const isEnabled = key => !disableSet.has(key.toLowerCase());

  if (isEnabled('list')) router.get('/', ...roleMiddlewares, controller.getAll);
  if (isEnabled('get')) router.get('/:id', ...roleMiddlewares, controller.getById);
  if (isEnabled('create')) router.post('/', ...roleMiddlewares, controller.create);
  if (isEnabled('update')) router.put('/:id', ...roleMiddlewares, controller.update);
  if (isEnabled('delete')) router.delete('/:id', ...roleMiddlewares, controller.delete);

  router.routeName = routeName;

  return router;
}

module.exports = baseRouter;
