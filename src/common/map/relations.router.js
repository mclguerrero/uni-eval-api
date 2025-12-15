const express = require('express');
const { createRelationsController } = require('./relations.controller');
const { globalRoles: defaultRoles, globalMiddlewares: defaultMiddlewares } = require('@middlewares/auth.rol.global');
const { requireAppRoles } = require('@middlewares/auth.middleware');

function buildRoleMiddlewares(globalRoles = [], routeRoles = []) {
  const roles = [...globalRoles, ...routeRoles].filter(Boolean);
  if (!roles.length) return [];
  return requireAppRoles(roles);
}

function createRelationsRouter(config) {
  const ctrl = createRelationsController(config);
  const router = express.Router();

  const itemPluralPath = config.itemPluralPath || 'items';

  // --- CONFIG ---
  const {
    globalMiddlewares = defaultMiddlewares,
    globalRoles = defaultRoles,
    middlewares = {},
    roles = {},
    protectedOperations = ['remove', 'createMap'],
  } = config;

  // Aplica middlewares globales
  if (globalMiddlewares.length) {
    router.use(...globalMiddlewares);
  }

  // Helper para obtener middlewares por acción (incluye roles)
  const mw = (opName) => {
    const extra = Array.isArray(middlewares[opName]) ? middlewares[opName] : [];
    const routeSpecificRoles = Array.isArray(roles[opName]) ? roles[opName] : [];

    // Aplicar globalRoles solo si la operación está protegida
    const effectiveGlobalRoles = protectedOperations.includes(opName) ? globalRoles : [];
    const roleMws = buildRoleMiddlewares(effectiveGlobalRoles, routeSpecificRoles);

    return [...extra, ...roleMws];
  };

  // --- RUTAS ---
  router.get(
    `/:id/${itemPluralPath}`,
    ...mw('list'),
    (req, res) => ctrl.listItems(req, res)
  );

  router.delete(
    `/:id/${itemPluralPath}/:itemId`,
    ...mw('remove'),
    (req, res) => ctrl.removeItemFromCategory(req, res)
  );

  router.post(
    `/${itemPluralPath}`,
    ...mw('createMap'),
    (req, res) => ctrl.createCategoryMap(req, res)
  );

  return router;
}

module.exports = { createRelationsRouter };
