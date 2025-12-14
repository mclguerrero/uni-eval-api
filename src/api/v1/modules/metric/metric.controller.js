const service = require('./metric.service');

async function summary(req, res, next) {
	try {
		const data = await service.evaluationSummary(req.query);
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function docente(req, res, next) {
	try {
		const data = await service.docenteStats({ ...req.query, docente: req.params.docente });
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function ranking(req, res, next) {
	try {
		const data = await service.ranking(req.query);
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function docenteCompletion(req, res, next) {
	try {
		const data = await service.docenteCompletion({ ...req.query, docente: req.params.docente });
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function docenteAspectMetrics(req, res, next) {
	try {
		const data = await service.docenteAspectMetrics({ ...req.query, docente: req.params.docente });
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function docenteMateriaMetrics(req, res, next) {
	try {
		const data = await service.docenteMateriaMetrics({ ...req.query, docente: req.params.docente });
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function docenteMateriaCompletion(req, res, next) {
	try {
		const data = await service.docenteMateriaCompletion({ ...req.query, docente: req.params.docente, codigo_materia: req.params.codigo_materia });
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function docenteMateriaAspectMetrics(req, res, next) {
	try {
		const data = await service.docenteMateriaAspectMetrics({ ...req.query, docente: req.params.docente, codigo_materia: req.params.codigo_materia });
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function docenteComments(req, res, next) {
	try {
		// Accept optional codigo_materia from query for flexibility
		const data = await service.docenteComments({ ...req.query, docente: req.params.docente });
		res.json(data);
	} catch (err) {
		next(err);
	}
}

async function docenteCommentsAnalysis(req, res, next) {
	try {
		const data = await service.docenteCommentsAnalysis({ ...req.query, docente: req.params.docente });
		res.json(data);
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
	docente,
	ranking,
	docenteCompletion,
	docenteAspectMetrics,
	docenteMateriaMetrics,
	docenteMateriaCompletion,
	docenteMateriaAspectMetrics,
	docenteComments,
	docenteCommentsAnalysis,
	docenteReportDocx,
};
