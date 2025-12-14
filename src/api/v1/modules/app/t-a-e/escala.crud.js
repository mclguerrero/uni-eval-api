const { createCrudModule } = require('@common/crud/base');
const { createRelationsModule } = require('@common/map/relations');
const { paths: extraPaths, components: extraComponents, tags: extraTags } = require('@common/bulk-cfg/bulk.swagger');

const escala = createCrudModule({
  name: 'escala',
  route: '/escala',
  displayName: 'Escala',
  schemaName: 'Escala',
});

const catE = createCrudModule({
  name: 'cat_e',
  route: '/cat/e',
  displayName: 'Categoría Escala',
  schemaName: 'CategoriaEscala',
});

const cfgE = createCrudModule({
  name: 'cfg_e',
  route: '/cfg/e',
  displayName: 'Configuración Escala',
  schemaName: 'ConfiguracionEscala',
  disable: ['create'],
  extraPaths,
  extraComponents,
  extraTags,
});

const catEmap = createRelationsModule({
  categoryModel: 'cat_e',
  itemModel: 'escala',
  mapModel: 'ce_map',
  categoryIdField: 'categoria_id',
  itemIdField: 'escala_id',

  itemPluralPath: 'escalas',

  tagName: 'Categoría Escala',
  categoryPathBase: '/cat/e',
  itemSchemaName: 'escala',
  categorySchemaName: 'CategoriaEscala',
});

module.exports = {
  escala,
  catE,
  cfgE,
  catEmap,
};
