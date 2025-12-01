const { createCrudModule } = require('@common/crud/base');

const { router, docs } = createCrudModule({
  name: 'a_e',
  route: '/a/e',
  displayName: 'AspectoEscala',
  schemaName: 'AspectoEscala'
});

module.exports = { router, docs };
