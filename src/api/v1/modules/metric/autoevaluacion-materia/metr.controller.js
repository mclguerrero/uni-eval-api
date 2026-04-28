const service = require('./metr.service');
const { successResponse } = require('@utils/responseHandler');
const messages = require('@constants/messages');

async function summary(req, res, next) {
	try {
		const data = await service.summary(req.query);
		successResponse(res, { code: 200, message: messages.DASHBOARD.SUCCESS.FETCH_STATS, data });
	} catch (err) {
		next(err);
	}
}

async function ranking(req, res, next) {
	try {
		const data = await service.ranking(req.query);
		successResponse(res, { code: 200, message: messages.DASHBOARD.SUCCESS.FETCH_RANKING, data });
	} catch (err) {
		next(err);
	}
}

async function usuarios(req, res, next) {
	try {
		const data = await service.usuarios(req.query, req.search, req.sort, req.pagination);
		successResponse(res, { code: 200, message: messages.DASHBOARD.SUCCESS.FETCH_STATS, data });
	} catch (err) {
		next(err);
	}
}

async function aspectos(req, res, next) {
	try {
		const data = await service.aspectos(req.query);
		successResponse(res, { code: 200, message: messages.DASHBOARD.SUCCESS.FETCH_ASPECTOS, data });
	} catch (err) {
		next(err);
	}
}

async function usuarioMaterias(req, res, next) {
	try {
		const data = await service.usuarioMaterias({ ...req.query, usuario: req.params.usuario });
		successResponse(res, { code: 200, message: messages.GENERAL.SUCCESS.FETCH_SUCCESS, data });
	} catch (err) {
		next(err);
	}
}

async function usuarioMateriaCompletion(req, res, next) {
	try {
		const data = await service.usuarioMateriaCompletion({ ...req.query, usuario: req.params.usuario, codigo_materia: req.params.codigo_materia });
		successResponse(res, { code: 200, message: messages.GENERAL.SUCCESS.FETCH_SUCCESS, data });
	} catch (err) {
		next(err);
	}
}

module.exports = {
	summary,
	ranking,
	usuarios,
	aspectos,
	usuarioMaterias,
	usuarioMateriaCompletion
};
