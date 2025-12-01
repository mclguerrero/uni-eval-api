const { createRelationsController } = require('./relations.controller');
const { createRelationsRouter } = require('./relations.router');
const { buildRelationsDocs } = require('./relations.swagger');
const { extractSchemaFromPrisma } = require('../extractSchemaPrisma');


function createRelationsModule(config) {
  const inferredSchema = config.schema || extractSchemaFromPrisma(config.itemModel || config.itemSchemaName);

  return {
    controller: createRelationsController(config),
    router: createRelationsRouter(config),
    docs: buildRelationsDocs({
      tagName: config.tagName,
      categoryPathBase: config.categoryPathBase,
      itemPluralPath: config.itemPluralPath,
      itemSchemaName: config.itemSchemaName,
      categorySchemaName: config.categorySchemaName,
      schema: inferredSchema,
    }),
  };
}

module.exports = { createRelationsModule, extractSchemaFromPrisma };
