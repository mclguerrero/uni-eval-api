const { createCrudModule } = require('@common/crud/base');
const { createRelationsModule } = require('@common/map/relations');
const { paths: extraPaths, components: extraComponents, tags: extraTags } = require('@common/bulk-cfg/bulk.swagger');

const { createValidatedCrud } = require('@common/crud/base.validation');

const aspecto = createValidatedCrud(
  {
    name: 'aspecto',
    route: '/aspecto',
    displayName: 'Aspecto',
    schemaName: 'Aspecto',
  },
  {
    rules: {
      nombre: {
        alphaNumericSpanish: true,
        stringLength: { min: 1, max: 100 }
      },
      descripcion: {
        alphaNumericSpanish: true,
        stringLength: { min: 1, max: 500 }
      }
    }
  },
  {
    searchFields: ['nombre', 'descripcion']
  }
);

const catA = createValidatedCrud(
  {
    name: 'cat_a',
    route: '/cat/a',
    displayName: 'Categoría Aspecto',
    schemaName: 'CategoriaAspecto',
  },
  {
    rules: {
      nombre: {
        alphaNumericSpanish: true,
        stringLength: { min: 1, max: 100 }
      },
      descripcion: {
        alphaNumericSpanish: true,
        stringLength: { min: 1, max: 500 }
      }
    }
  },
);

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
  categorySchemaName: 'CategoriaAspecto',
  searchFields: ['nombre', 'descripcion'],
  sortableFields: ['id', 'nombre', 'descripcion', 'fecha_creacion', 'fecha_actualizacion'],
  sortOptions: {
    allowedFields: ['id', 'map_id', 'nombre', 'descripcion', 'fecha_creacion', 'fecha_actualizacion'],
    defaultSortBy: 'id',
    defaultSortOrder: 'desc',
  },
  paginationOptions: {
    defaultLimit: 10,
    maxLimit: 100,
  }
});

module.exports = {
  aspecto,
  catA,
  cfgA,
  catAmap,
};
