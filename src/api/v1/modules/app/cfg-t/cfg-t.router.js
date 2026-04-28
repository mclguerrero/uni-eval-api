const { Router } = require('express');
const controller = require('./cfg-t.controller');
const { ensureAuth, requireAuthRoles, requireAppRoles } = require('@middlewares/auth.middleware');
const { requireAuthorization } = require('@middlewares/authorization.middleware');
const search = require('@middlewares/http/search');
const sort = require('@middlewares/http/sort');

const router = Router();

// POST /cfg/t/full -> crea cfg_t + scope y opcionalmente autoevaluación relacionada
router.post('/full', ensureAuth, requireAuthorization(), controller.createCfgTFull);

// GET /cfg/t -> listado de configuraciones según rol del usuario
router.get('/r', 
  ensureAuth, 
  requireAuthorization(), 
  search({ searchFields: ['nombre', 'descripcion'], minLength: 2 }),
  sort({ defaultSortBy: 'id', defaultSortOrder: 'desc', allowedFields: ['id', 'nombre', 'fecha_inicio'] }),
  controller.getCfgTList
);

// GET /cfg/t/r/:id -> listado de configuraciones filtrando por id
router.get('/r/:id', 
  ensureAuth, 
  requireAuthorization(), 
  search({ searchFields: ['nombre', 'descripcion'], minLength: 2 }),
  sort({ defaultSortBy: 'id', defaultSortOrder: 'desc', allowedFields: ['id', 'nombre', 'fecha_inicio'] }),
  controller.getCfgId
);

// GET /cfg/t/:id/a-e -> aspectos y escalas relacionados via a_e
router.get('/:id/a-e', ensureAuth, requireAuthRoles(1, 2), controller.getAspectosEscalas);

// GET /cfg/t/cfg-a_cfg-e -> todas las configuraciones de cfg_a y cfg_e
router.get('/cfg-a_cfg-e', ensureAuth, requireAuthorization(), controller.getCfgAAndCfgE);

// GET /cfg/t/:id/cfg-a_cfg-e -> configuración de cfg_a y cfg_e por id
router.get('/:id/cfg-a_cfg-e', ensureAuth, requireAuthorization(), controller.getCfgAAndCfgE);

// GET /cfg/t/:id/roles -> roles asignados a una cfg_t
router.get('/:id/roles', ensureAuth, requireAuthorization(), controller.getRoles);

// GET /cfg/t/:id/evals -> evaluaciones/encuestas del usuario autenticado
router.get('/:id/evals', ensureAuth, requireAuthorization(req => Number(req.params.id)), controller.getEvaluacionesByCfgTUser);

// GET /cfg/t/:id/scope -> scope de la configuración (sede, periodo, programa, semestre, grupo con sus nombres)
router.get('/:id/scope', ensureAuth, requireAuthorization(req => Number(req.params.id)), controller.getScopesByCfgT);

module.exports = router;
