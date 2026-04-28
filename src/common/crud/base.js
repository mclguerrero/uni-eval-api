const BaseRepository = require('./base.repository');
const BaseService = require('./base.service');
const BaseController = require('./base.controller');
const baseRouter = require('./base.router');
const buildCrudDocs = require('./base.swagger');
const { extractSchemaFromPrisma } = require('../extractSchemaPrisma');
const pagination = require('@middlewares/http/pagination');
const sort = require('@middlewares/http/sort');
const search = require('@middlewares/http/search');

function extractBooleanFields(schema) {
  if (!schema || typeof schema !== 'object') return [];
  const entries = schema.properties ? Object.entries(schema.properties) : Object.entries(schema);
  return entries
    .filter(([_, def]) => def && typeof def === 'object' && def.type === 'boolean' && !def.readonly)
    .map(([name]) => name);
}

// ----------------------------------------
// createCrudModule
// ----------------------------------------
function createCrudModule(options, manualSchema = null, routerConfig = {}) {
  // Soportar firma legacy: (name, manualSchema?, routerConfig?)
  if (typeof options !== 'object') {
    const legacyName = options;
    const finalSchema = manualSchema || extractSchemaFromPrisma(legacyName);
    const booleanFields = Array.isArray(routerConfig.booleanFields)
      ? routerConfig.booleanFields
      : extractBooleanFields(finalSchema);
    const repo = new BaseRepository(legacyName);
    const service = new BaseService(repo, { booleanFields });
    const controller = new BaseController(service);
    const realRoute = `/${legacyName}`;
    
    // Si no hay validación, agregar middlewares de paginación, búsqueda y orden por defecto
    const finalRouterConfig = { ...routerConfig, booleanFields };
    if (!routerConfig.validation) {
      const sortOptions = routerConfig.sortOptions || {};
      const searchOptions = routerConfig.searchOptions || {};
      const searchFields = routerConfig.searchFields || [];
      finalRouterConfig.validation = {
        middlewares: {
          getAll: [
            pagination({ maxLimit: 100 }),
            sort(sortOptions),
            search({ searchFields, ...searchOptions })
          ]
        }
      };
    }
    
    const router = baseRouter(controller, realRoute, finalRouterConfig);
    const disable = Array.isArray(routerConfig.disable) ? routerConfig.disable : [];
    const docs = buildCrudDocs(
      { name: legacyName, route: realRoute, displayName: legacyName, schemaName: legacyName, disable, booleanFields },
      finalSchema
    );
    return { router, docs };
  }

  const { name, route, displayName, schemaName, disable: optionsDisable, extraPaths, extraComponents, extraTags } = options;
  if (!name) throw new Error("Debes especificar 'name' para leer el modelo Prisma.");

  // Generar esquema automático si no se pasa manual
  const finalSchema = manualSchema || extractSchemaFromPrisma(name);
  const booleanFields = Array.isArray(routerConfig.booleanFields)
    ? routerConfig.booleanFields
    : extractBooleanFields(finalSchema);

  const repo = new BaseRepository(name);
  const service = new BaseService(repo, { booleanFields });
  const controller = new BaseController(service);

  const realRoute = route || `/${name}`;
  
  // Si no hay validación, agregar middlewares de paginación, búsqueda y orden por defecto
  const finalRouterConfig = { ...routerConfig, booleanFields };
  if (!routerConfig.validation) {
    const sortOptions = routerConfig.sortOptions || {};
    const searchOptions = routerConfig.searchOptions || {};
    const searchFields = routerConfig.searchFields || [];
    finalRouterConfig.validation = {
      middlewares: {
        getAll: [
          pagination({ maxLimit: 100 }),
          sort(sortOptions),
          search({ searchFields, ...searchOptions })
        ]
      }
    };
  }
  
  const router = baseRouter(controller, realRoute, finalRouterConfig);

  // Unir disables provenientes de options y routerConfig (si existen)
  const combinedDisable = [
    ...(Array.isArray(optionsDisable) ? optionsDisable : []),
    ...(Array.isArray(routerConfig.disable) ? routerConfig.disable : []),
  ];

  const docs = buildCrudDocs(
    { name, route: realRoute, displayName, schemaName, disable: combinedDisable, extraPaths, extraComponents, extraTags, booleanFields },
    finalSchema
  );

  return { router, docs };
}

module.exports = {
  createCrudModule,
  extractSchemaFromPrisma,
};
