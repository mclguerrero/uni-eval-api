const { Router } = require('express');
const RolRepository = require('./rol.repository');
const RolService = require('./rol.service');
const RolController = require('./rol.controller');
const { globalMiddlewares, globalRoles } = require('@middlewares/auth.rol.global');
const { requireAppRoles } = require('@middlewares/auth.middleware');

const repository = new RolRepository();
const service = new RolService(repository);
const controller = new RolController(service);

const router = Router();

if (Array.isArray(globalMiddlewares) && globalMiddlewares.length) {
	router.use(...globalMiddlewares);
}

const roleMiddlewares = Array.isArray(globalRoles) && globalRoles.length
	? requireAppRoles(globalRoles)
	: [];

router.get('/mix', ...roleMiddlewares, controller.getMixedRoles);

module.exports = router;
