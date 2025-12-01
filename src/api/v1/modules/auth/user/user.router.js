const { Router } = require('express');
const UserRepository = require('./user.repository');
const UserService = require('./user.service');
const UserController = require('./user.controller');
const { ensureAuth } = require('@middlewares/auth.middleware');

const repository = new UserRepository();
const service = new UserService(repository);
const controller = new UserController(service);

const router = Router();

router.get('/', ensureAuth, controller.getMateriasAutenticado);

module.exports = router;
