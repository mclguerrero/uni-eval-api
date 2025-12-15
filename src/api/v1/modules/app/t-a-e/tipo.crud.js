const { createCrudModule } = require('@common/crud/base');
const { createRelationsModule } = require('@common/map/relations');

const tipo = createCrudModule({
  name: 'tipo',
  route: '/tipo',
  displayName: 'Tipo',
  schemaName: 'Tipo',
});

const catT = createCrudModule({
  name: 'cat_t',
  route: '/cat/t',
  displayName: 'Categoría Tipo',
  schemaName: 'CategoriaTipo',
});

const cfgT = createCrudModule({
  name: 'cfg_t',
  route: '/cfg/t',
  displayName: 'Configuración Tipo',
  schemaName: 'ConfiguracionTipo',
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
});

module.exports = {
  tipo,
  catT,
  cfgT,
  cfg_t_rol,
  catTmap,
};
