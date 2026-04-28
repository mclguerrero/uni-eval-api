const { createCrudModule } = require('@common/crud/base');
const { createRelationsModule } = require('@common/map/relations');

const { createValidatedCrud } = require('@common/crud/base.validation');

const tipo = createValidatedCrud(
  {
    name: 'tipo',
    route: '/tipo',
    displayName: 'Tipo',
    schemaName: 'Tipo',
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

const catT = createValidatedCrud(
  {
    name: 'cat_t',
    route: '/cat/t',
    displayName: 'Categoría Tipo',
    schemaName: 'CategoriaTipo',
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

const tipo_form = createValidatedCrud(
  {
    name: 'tipo_form',
    route: '/tipo/form',
    displayName: 'Tipo Formulario',
    schemaName: 'TipoFormulario',
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

const cfgT = createValidatedCrud(
  {
    name: 'cfg_t',
    route: '/cfg/t',
    displayName: 'Configuración Tipo',
    schemaName: 'ConfiguracionTipo',
    disable: ['list'],
  },
  {
    rules: {
      fecha_fin: {
        // fecha_fin debe ser >= fecha_inicio
        afterField: { field: 'fecha_inicio', orEqual: true }
      }
    }
  }
);

const cfg_t_scope = createCrudModule({
  name: 'cfg_t_scope',
  route: '/cfg/t/scope',
  displayName: 'Configuración Tipo Scope',
  schemaName: 'ConfiguracionTipoScope',
});

const cfg_t_rol = createCrudModule({
  name: 'cfg_t_rol',
  route: '/cfg/t/rol',
  displayName: 'Configuración Tipo Rol',
  schemaName: 'ConfiguracionTipoRol',
});

const catTmap = createRelationsModule({
  categoryModel: 'cat_t',
  itemModel: 'tipo',
  mapModel: 'ct_map',
  categoryIdField: 'categoria_id',
  itemIdField: 'tipo_id',

  itemPluralPath: 'tipos',

  tagName: 'Categoría Tipo',
  categoryPathBase: '/cat/t',
  itemSchemaName: 'tipo',
  categorySchemaName: 'CategoriaTipo',
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
  tipo,
  catT,
  tipo_form,
  cfgT,
  cfg_t_scope,
  cfg_t_rol,
  catTmap,
};
