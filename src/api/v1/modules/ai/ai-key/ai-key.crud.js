const { createCrudModule } = require('@common/crud/base');

// Catálogo de proveedores de IA (admin)
const aiProvider = createCrudModule({
  name: 'ai_provider',
  route: '/ai/provider',
  displayName: 'IA Proveedor',
  schemaName: 'AiProvider',
});

// Catálogo de modelos por proveedor (admin)
const aiModel = createCrudModule({
  name: 'ai_model',
  route: '/ai/model',
  displayName: 'IA Model',
  schemaName: 'AiModel',
});

module.exports = { aiProvider, aiModel };
