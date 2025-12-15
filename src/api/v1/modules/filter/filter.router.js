const { Router } = require('express');
const FilterRepository = require('./filter.repository');
const FilterService = require('./filter.service');
const FilterController = require('./filter.controller');

const repository = new FilterRepository();
const service = new FilterService(repository);
const controller = new FilterController(service);

const router = Router();

router.get('/', controller.getAllFilters);
router.get('/sedes', controller.getSedes);
router.get('/periodos', controller.getPeriodos);
router.get('/programas', controller.getProgramas);
router.get('/semestres', controller.getSemestres);
router.get('/grupos', controller.getGrupos);

module.exports = router;
