const { createCrudModule } = require('@common/crud/base');

const eval = createCrudModule({
  name: 'eval',
  route: '/eval',
  displayName: 'Evaluación',
  schemaName: 'Evaluacion',
  disable: ['create'],
});

module.exports = {
  eval,
};
