const { createCrudModule } = require('@common/crud/base');

const eval = createCrudModule({
  name: 'eval',
  route: '/eval',
  displayName: 'Evaluación',
  schemaName: 'Evaluacion',
  disable: ['create'],
});

const evalDet = createCrudModule({
  name: 'eval_det',
  route: '/eval/det',
  displayName: 'Evaluación Detalle',
  schemaName: 'EvaluacionDetalle',
});

module.exports = {
  eval,
  evalDet,
};
