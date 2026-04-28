const express = require('express');
const ctrl = require('./metr.controller');
const pagination = require('@middlewares/http/pagination');
const search = require('@middlewares/http/search');
const sort = require('@middlewares/http/sort');

const router = express.Router();

router.get('/summary', ctrl.summary);
router.get('/summary/programas', ctrl.summaryByProgram);
router.get(
	'/usuarios',
	pagination({ defaultPage: 1, defaultLimit: 10, maxLimit: 100 }),
	search({ searchFields: ['usuario'], minLength: 2 }),
	sort({ defaultSortBy: 'promedio_general', defaultSortOrder: 'desc', allowedFields: ['promedio_general', 'total_realizadas', 'porcentaje_cumplimiento', 'usuario'] }),
	ctrl.usuarios
);
router.get('/aspectos', ctrl.aspectos);
router.get(
	'/docentes',
	pagination({ defaultPage: 1, defaultLimit: 10, maxLimit: 100 }),
	search({ searchFields: ['nombre_docente'], minLength: 2 }),
	sort({ defaultSortBy: 'total_evaluaciones', defaultSortOrder: 'desc', allowedFields: ['total_evaluaciones', 'total_realizadas', 'total_pendientes', 'nombre_docente'] }),
	ctrl.docentesAspectos
);
router.get('/docente/:docente/materias/:codigo_materia/completion', ctrl.docenteMateriaCompletion);

module.exports = router;
