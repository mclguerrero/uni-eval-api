const { createCrudModule } = require('@common/crud/base');
const { paths: extraPaths, components: extraComponents, tags: extraTags } = require('./a-e.swagger');

const { router, docs } = createCrudModule({
  name: 'a_e',
  route: '/a/e',
  displayName: 'AspectoEscala',
  schemaName: 'AspectoEscala',
  disable: ['create'],
  extraPaths,
  extraComponents,
  extraTags,
});

module.exports = { router, docs };
