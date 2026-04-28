const service = require('./metric.service');
const { successResponse, errorResponse } = require('../../utils/responseHandler');
const messages = require('@constants/messages');

async function summary(req, res, next) {
	try {
		const data = await service.evaluationSummary(req.query);
		successResponse(res, {
			code: 200,
			message: messages.DASHBOARD.SUCCESS.FETCH_STATS,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function summaryByProgram(req, res, next) {
	try {
		const data = await service.evaluationSummaryByProgram(req.query);
		successResponse(res, {
			code: 200,
			message: messages.DASHBOARD.SUCCESS.FETCH_STATS,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function docente(req, res, next) {
	try {
		const data = await service.docenteStats({ ...req.query, page: req.pagination.page, limit: req.pagination.limit }, req.search, req.sort);
		successResponse(res, {
			code: 200,
			message: messages.DASHBOARD.SUCCESS.FETCH_STATS,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function ranking(req, res, next) {
	try {
		const data = await service.ranking(req.query);
		successResponse(res, {
			code: 200,
			message: messages.DASHBOARD.SUCCESS.FETCH_RANKING,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function docenteAspectMetrics(req, res, next) {
	try {
		const data = await service.docenteAspectMetrics(req.query);
		successResponse(res, {
			code: 200,
			message: messages.DASHBOARD.SUCCESS.FETCH_ASPECTOS,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function docenteMateriaMetrics(req, res, next) {
	try {
		const data = await service.docenteMateriaMetrics({ ...req.query, docente: req.params.docente });
		successResponse(res, {
			code: 200,
			message: messages.GENERAL.SUCCESS.FETCH_SUCCESS,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function docenteMateriaCompletion(req, res, next) {
	try {
		const data = await service.docenteMateriaCompletion({ ...req.query, docente: req.params.docente, codigo_materia: req.params.codigo_materia });
		successResponse(res, {
			code: 200,
			message: messages.GENERAL.SUCCESS.FETCH_SUCCESS,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function docenteComments(req, res, next) {
	try {
		// Accept optional codigo_materia from query for flexibility
		const data = await service.docenteComments({ ...req.query, docente: req.params.docente });
		successResponse(res, {
			code: 200,
			message: messages.GENERAL.SUCCESS.FETCH_SUCCESS,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function docenteCommentsAnalysis(req, res, next) {
	try {
		const data = await service.docenteCommentsAnalysis({ ...req.query, docente: req.params.docente });
		successResponse(res, {
			code: 200,
			message: messages.GENERAL.SUCCESS.FETCH_SUCCESS,
			data
		});
	} catch (err) {
		next(err);
	}
}

async function docenteReportDocx(req, res, next) {
	try {
		const buf = await service.generateDocxReport({
			...req.query,
			docente: req.params.docente
		});
		const filename = `reporte_docente_${req.params.docente}.docx`;
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.status(200).send(buf);
	} catch (err) {
		next(err);
	}
}

module.exports = {
	summary,
	summaryByProgram,
	docente,
	ranking,
	docenteAspectMetrics,
	docenteMateriaMetrics,
	docenteMateriaCompletion,
	docenteComments,
	docenteCommentsAnalysis,
	docenteReportDocx,
};
