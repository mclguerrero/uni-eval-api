const { createCrudModule } = require('@common/crud/base');

const evalDet = createCrudModule({
  name: 'eval_det',
  route: '/eval/det',
  displayName: 'Evaluación Detalle',
  schemaName: 'EvaluacionDetalle',
  disable: ['create'],
});

module.exports = {
  evalDet,
};
