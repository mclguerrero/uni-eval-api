const { Router } = require('express');
const router = Router();

// Tipo
const { tipo, catT, cfgT, catTmap } = require('./app/t-a-e/tipo.crud');
router.use('/tipo', tipo.router);
router.use('/cat/t', catTmap.router, catT.router);
router.use('/cfg/t', cfgT.router);

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
const aspectoEscala = require('./app/t-a-e/a-e.crud').router;
router.use('/a/e', aspectoEscala);

// Evaluacion
const { eval: evalModule, evalDet } = require('./app/eval.crud');
router.use('/eval', evalModule.router);
router.use('/eval/det', evalDet.router);

// Rol
const { rol, user_rol } = require('./auth/rol/rol.crud');
router.use('/rol', rol.router);
router.use('/user/rol', user_rol.router);

module.exports = { router };
