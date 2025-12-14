const { Router } = require('express');
const controller = require('./cfg-t.controller');
const { globalRoles, globalMiddlewares } = require('@middlewares/auth.rol.global');
const { requireRoles } = require('@middlewares/auth.middleware');

const router = Router();

if (Array.isArray(globalMiddlewares) && globalMiddlewares.length) {
	router.use(...globalMiddlewares);
}

const roleMiddlewares = Array.isArray(globalRoles) && globalRoles.length
	? requireRoles(globalRoles)
	: [];

// GET /cfg/t/:id/a-e -> aspectos y escalas relacionados via a_e
router.get('/:id/a-e', ...roleMiddlewares, controller.getAspectosEscalas);

module.exports = router;
