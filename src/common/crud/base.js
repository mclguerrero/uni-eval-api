const BaseRepository = require('./base.repository');
const BaseService = require('./base.service');
const BaseController = require('./base.controller');
const baseRouter = require('./base.router');
const buildCrudDocs = require('./base.swagger');
const { extractSchemaFromPrisma } = require('../extractSchemaPrisma');

// ----------------------------------------
// createCrudModule
// ----------------------------------------
function createCrudModule(options, manualSchema = null, routerConfig = {}) {
  // Soportar firma legacy: (name, manualSchema?, routerConfig?)
  if (typeof options !== 'object') {
    const legacyName = options;
    const finalSchema = manualSchema || extractSchemaFromPrisma(legacyName);
    const repo = new BaseRepository(legacyName);
    const service = new BaseService(repo);
    const controller = new BaseController(service);
    const realRoute = `/${legacyName}`;
    const router = baseRouter(controller, realRoute, routerConfig);
    const disable = Array.isArray(routerConfig.disable) ? routerConfig.disable : [];
    const docs = buildCrudDocs(
      { name: legacyName, route: realRoute, displayName: legacyName, schemaName: legacyName, disable },
      finalSchema
    );
    return { router, docs };
  }

  const { name, route, displayName, schemaName, disable: optionsDisable, extraPaths, extraComponents, extraTags } = options;
  if (!name) throw new Error("Debes especificar 'name' para leer el modelo Prisma.");

  // Generar esquema automático si no se pasa manual
  const finalSchema = manualSchema || extractSchemaFromPrisma(name);

  const repo = new BaseRepository(name);
  const service = new BaseService(repo);
  const controller = new BaseController(service);

  const realRoute = route || `/${name}`;
  const router = baseRouter(controller, realRoute, routerConfig);

  // Unir disables provenientes de options y routerConfig (si existen)
  const combinedDisable = [
    ...(Array.isArray(optionsDisable) ? optionsDisable : []),
    ...(Array.isArray(routerConfig.disable) ? routerConfig.disable : []),
  ];

  const docs = buildCrudDocs(
    { name, route: realRoute, displayName, schemaName, disable: combinedDisable, extraPaths, extraComponents, extraTags },
    finalSchema
  );

  return { router, docs };
}

module.exports = {
  createCrudModule,
  extractSchemaFromPrisma,
};
