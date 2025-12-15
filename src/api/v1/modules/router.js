const { Router } = require('express');
const router = Router();

// Tipo
const { tipo, catT, cfgT, catTmap, cfg_t_rol } = require('./app/t-a-e/tipo.crud');
const cfgTCustom = require('./app/cfg-t/cfg-t.router');
router.use('/tipo', tipo.router);
router.use('/cat/t', catTmap.router, catT.router);
router.use('/cfg/t', cfgT.router, cfgTCustom);
router.use('/cfg/t/rol', cfg_t_rol.router);

// Aspecto
const { aspecto, catA, cfgA, catAmap } = require('./app/t-a-e/aspecto.crud');
router.use('/aspecto', aspecto.router);
router.use('/cat/a', catAmap.router, catA.router);
router.use('/cfg/a', cfgA.router);

// Escala
const { escala, catE, cfgE, catEmap } = require('./app/t-a-e/escala.crud');
router.use('/escala', escala.router);
router.use('/cat/e', catEmap.router, catE.router);
router.use('/cfg/e', cfgE.router);

// Aspecto-Escala
const aspectoEscala = require('./app/a-e/a-e.crud').router;
const aECustom = require('./app/a-e/a-e.router');
router.use('/a/e', aECustom, aspectoEscala);

// Evaluacion
const { eval: evalModule } = require('./app/eval/eval.crud');
const { evalDet } = require('./app/eval-det/eval-det.crud');
const evalDetCustom = require('./app/eval-det/eval-det.router');
router.use('/eval', require('../modules/app/eval/eval.router'));
router.use('/eval', evalModule.router);
router.use('/eval/det', evalDetCustom, evalDet.router);

// Rol
const { rol, user_rol, user_prog } = require('./auth/rol/rol.crud');
const rolCustomRouter = require('./auth/rol/rol.router');
router.use('/rol', rolCustomRouter, rol.router);
router.use('/user/rol', user_rol.router);
router.use('/user/prog', user_prog.router);

// Bulk configuration routes (cfg_a/cfg_e)
const bulkCfg = require('@common/bulk-cfg/bulk-cfg').router;
router.use('/', bulkCfg);

// Métricas
router.use('/metric', require('./metric/metric.router'));

// Filtros
router.use('/filter', require('./filter/filter.router'));

module.exports = { router };
