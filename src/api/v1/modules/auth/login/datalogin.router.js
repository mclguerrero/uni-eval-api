const { Router } = require('express');
const DataloginRepository = require('./datalogin.repository');
const DataloginService = require('./datalogin.service');
const DataloginController = require('./datalogin.controller');

const repository = new DataloginRepository();
const service = new DataloginService(repository);
const controller = new DataloginController(service);

const router = Router();

// Rutas de solo lectura
router.get('/', controller.getAll);
router.get('/id/:id', controller.getById); // Evitar conflicto con /username
router.get('/username/:username', controller.getByUsername);

// Login
router.post('/login', controller.login);

module.exports = router;
