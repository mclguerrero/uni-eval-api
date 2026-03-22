const express = require('express');
const ctrl = require('./metric.controller');
const pagination = require('@middlewares/http/pagination');
const search = require('@middlewares/http/search');
const sort = require('@middlewares/http/sort');

const router = express.Router();

// Nuevo: Mount nuevo tipo_form metrics (tipo 2, 3, 4)
router.use('/encuesta', require('./encuesta/metr.router'));
router.use('/autoevaluacion', require('./autoevaluacion/metr.router'));
router.use('/autoevaluacion-materia', require('./autoevaluacion-materia/metr.router'));

// GET /metric/evaluations/summary?cfg_t=1&...filters
router.get('/evaluations/summary', ctrl.summary);

// GET /metric/evaluations/summary/programas?cfg_t=1&...filters
router.get('/evaluations/summary/programas', ctrl.summaryByProgram);

// GET /metric/evaluations/ranking?cfg_t=1&...filters
router.get('/evaluations/ranking', ctrl.ranking);

// GET /metric/evaluations/docente?cfg_t=1&docente=...&...filters
// If docente is not provided, returns stats for all docentes (paginated)
router.get('/evaluations/docentes',
	pagination({ defaultPage: 1, defaultLimit: 10, maxLimit: 100 }),
	search({ searchFields: ['nombre_docente'], minLength: 2 }),
	sort({ defaultSortBy: 'promedio_general', defaultSortOrder: 'desc', allowedFields: ['promedio_general', 'total_evaluaciones', 'porcentaje_cumplimiento', 'nombre_docente'] }),
	ctrl.docente
);

// GET /metric/evaluations/docente/aspectos?cfg_t=1&docente=...&codigo_materia=...
// docente y codigo_materia son opcionales en query
// Si no se especifica docente, retorna métricas agregadas de todos los docentes
router.get('/evaluations/docentes/aspectos', ctrl.docenteAspectMetrics);

// GET /metric/evaluations/docente/:docente/materias?cfg_t=1&...filters
router.get('/evaluations/docente/:docente/materias', ctrl.docenteMateriaMetrics);

// GET /metric/evaluations/docente/:docente/materias/:codigo_materia/completion?cfg_t=1&...filters
router.get('/evaluations/docente/:docente/materias/:codigo_materia/completion', ctrl.docenteMateriaCompletion);

// GET /metric/evaluations/docente/:docente/comments?cfg_t=1&codigo_materia=6655
// Returns metrics with comments; codigo_materia is optional via query
router.get('/evaluations/docente/:docente/comments', ctrl.docenteComments);

// GET /metric/evaluations/docente/:docente/comments/analysis?cfg_t=1&codigo_materia=6655
// Runs local AI (Ollama) to summarize comments and return insightsdocenteCommentsAnalysis
router.get('/evaluations/docente/:docente/comments/analysis', ctrl.docenteCommentsAnalysis);

// GET /metric/evaluations/docente/:docente/report.docx?cfg_t=1&codigo_materia=6655&ai_mode=none|cached&...filters
// ai_mode=none => genera reporte sin conclusiones IA; cached (default) => usa cmt_ai si existe
router.get('/evaluations/docente/:docente/report.docx', ctrl.docenteReportDocx);

module.exports = router;
