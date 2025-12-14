const { Router } = require('express');
const controller = require('./eval-det.controller');
const { globalRoles, globalMiddlewares } = require('@middlewares/auth.rol.global');
const { requireRoles } = require('@middlewares/auth.middleware');

const router = Router();

if (Array.isArray(globalMiddlewares) && globalMiddlewares.length) {
	router.use(...globalMiddlewares);
}

const roleMiddlewares = Array.isArray(globalRoles) && globalRoles.length
	? requireRoles(globalRoles)
	: [];

// Bulk save respuestas y comentarios
router.post('/bulk', ...roleMiddlewares, controller.bulkCreate);

module.exports = router;
