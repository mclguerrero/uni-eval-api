const { Router } = require('express');
const UserRolRepository = require('./user-rol.repository');
const UserRolService = require('./user-rol.service');
const UserRolController = require('./user-rol.controller');
const pagination = require('@middlewares/http/pagination');
const sort = require('@middlewares/http/sort');
const search = require('@middlewares/http/search');
const { ensureAuth, requireGlobalRole } = require('@middlewares/auth.middleware');

const repository = new UserRolRepository();
const service = new UserRolService(repository);
const controller = new UserRolController(service);

const router = Router();

router.get('/u', ensureAuth, requireGlobalRole, pagination({ maxLimit: 100 }), sort({}), search({ searchFields: ['rol_nombre', 'user_name', 'user_username', 'user_email'] }), controller.getUserRolesWithDataLogin);

module.exports = router;
