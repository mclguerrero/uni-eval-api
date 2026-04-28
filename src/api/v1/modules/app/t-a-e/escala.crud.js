const { createCrudModule } = require('@common/crud/base');
const { createRelationsModule } = require('@common/map/relations');
const { paths: extraPaths, components: extraComponents, tags: extraTags } = require('@common/bulk-cfg/bulk.swagger');

const { createValidatedCrud } = require('@common/crud/base.validation');

const escala = createValidatedCrud(
  {
    name: 'escala',
    route: '/escala',
    displayName: 'Escala',
    schemaName: 'Escala',
  },
  {
    rules: {
      sigla: {
        alphaNumericSpanish: true,
        stringLength: { min: 1, max: 5 }
      },
      nombre: {
        alphaNumericSpanish: true,
        stringLength: { min: 1, max: 100 }
      },
      descripcion: {
        alphaNumericSpanish: true,
        stringLength: { min: 1, max: 500 }
      }
    }
  }
);

const catE = createValidatedCrud(
  {
    name: 'cat_e',
    route: '/cat/e',
    displayName: 'Categoría Escala',
    schemaName: 'CategoriaEscala',
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
  searchFields: ['sigla', 'nombre', 'descripcion'],
  sortableFields: ['id', 'sigla', 'nombre', 'descripcion', 'fecha_creacion', 'fecha_actualizacion'],
  sortOptions: {
    allowedFields: ['id', 'map_id', 'sigla', 'nombre', 'descripcion', 'fecha_creacion', 'fecha_actualizacion'],
    defaultSortBy: 'id',
    defaultSortOrder: 'desc',
  },
  paginationOptions: {
    defaultLimit: 10,
    maxLimit: 100,
  }
});

module.exports = {
  escala,
  catE,
  cfgE,
  catEmap,
};
