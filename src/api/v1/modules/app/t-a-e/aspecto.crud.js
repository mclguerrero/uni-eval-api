const { createCrudModule } = require('@common/crud/base');
const { createRelationsModule } = require('@common/map/relations');
const { paths: extraPaths, components: extraComponents, tags: extraTags } = require('@common/bulk-cfg/bulk.swagger');

const aspecto = createCrudModule({
  name: 'aspecto',
  route: '/aspecto',
  displayName: 'Aspecto',
  schemaName: 'Aspecto',
});

const catA = createCrudModule({
  name: 'cat_a',
  route: '/cat/a',
  displayName: 'Categoría Aspecto',
  schemaName: 'CategoriaAspecto',
});

const cfgA = createCrudModule({
  name: 'cfg_a',
  route: '/cfg/a',
  displayName: 'Configuración Aspecto',
  schemaName: 'ConfiguracionAspecto',
  disable: ['create'],
  extraPaths,
  extraComponents,
  extraTags,
});

const catAmap = createRelationsModule({
  categoryModel: 'cat_a',
  itemModel: 'aspecto',
  mapModel: 'ca_map',
  categoryIdField: 'categoria_id',
  itemIdField: 'aspecto_id',

  itemPluralPath: 'aspectos',

  tagName: 'Categoría Aspecto',
  categoryPathBase: '/cat/a',
  itemSchemaName: 'aspecto',
  categorySchemaName: 'CategoriaAspecto'
});

module.exports = {
  aspecto,
  catA,
  cfgA,
  catAmap,
};
