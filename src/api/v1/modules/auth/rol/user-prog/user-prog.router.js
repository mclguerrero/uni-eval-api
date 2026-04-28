const { Router } = require('express');
const UserProgRepository = require('./user-prog.repository');
const UserProgService = require('./user-prog.service');
const UserProgController = require('./user-prog.controller');
const pagination = require('@middlewares/http/pagination');
const sort = require('@middlewares/http/sort');
const search = require('@middlewares/http/search');
const { ensureAuth, requireGlobalRole } = require('@middlewares/auth.middleware');

const repository = new UserProgRepository();
const service = new UserProgService(repository);
const controller = new UserProgController(service);

const router = Router();

router.get('/u', ensureAuth, requireGlobalRole, pagination({ maxLimit: 100 }), sort({}), search({ searchFields: ['prog_nombre', 'user_name', 'user_username', 'user_email'] }), controller.getUserProgWithDataLogin);

module.exports = router;
