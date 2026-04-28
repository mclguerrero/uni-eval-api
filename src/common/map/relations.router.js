const express = require('express');
const { createRelationsController } = require('./relations.controller');
const { globalRoles: defaultRoles, globalMiddlewares: defaultMiddlewares } = require('@middlewares/auth.rol.global');
const { requireAppRoles } = require('@middlewares/auth.middleware');
const pagination = require('@middlewares/http/pagination');
const sort = require('@middlewares/http/sort');
const search = require('@middlewares/http/search');

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
    searchFields = [],
    searchOptions = {},
    sortOptions = {},
    paginationOptions = {},
  } = config;

  const resolvedSortFields = Array.isArray(sortOptions.allowedFields)
    ? sortOptions.allowedFields
    : [];

  const listMiddlewares = [
    pagination({ maxLimit: 100, ...paginationOptions }),
    sort({
      defaultSortBy: 'id',
      defaultSortOrder: 'desc',
      ...sortOptions,
      allowedFields: resolvedSortFields,
    }),
    search({ searchFields, ...searchOptions }),
  ];

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
    ...listMiddlewares,
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
