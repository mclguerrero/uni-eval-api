const { Router } = require('express');
const RolRepository = require('./rol.repository');
const RolService = require('./rol.service');
const RolController = require('./rol.controller');
const { ensureAuth, requireGlobalRole } = require('@middlewares/auth.middleware');

const repository = new RolRepository();
const service = new RolService(repository);
const controller = new RolController(service);

const router = Router();

router.get('/mix/online', ensureAuth, requireGlobalRole, controller.getMixedRolesOnline);
router.get('/mix', ensureAuth, requireGlobalRole, controller.getMixedRoles);

module.exports = router;

