const { Router } = require('express');
const DataloginRepository = require('./datalogin.repository');
const DataloginService = require('./datalogin.service');
const DataloginController = require('./datalogin.controller');
const { ensureAuth } = require('@middlewares/auth.middleware');

const repository = new DataloginRepository();
const service = new DataloginService(repository);
const controller = new DataloginController(service);

const router = Router();

// Rutas de solo lectura
router.get('/', controller.getAll);
router.get('/id/:id', controller.getById); // Evitar conflicto con /username
router.get('/username/:username', controller.getByUsername);

// Auth
router.post('/login', controller.login);
router.post('/refresh', controller.refresh); // no requiere JWT
router.post('/logout', ensureAuth, controller.logout); // requiere JWT para identificar user

module.exports = router;
