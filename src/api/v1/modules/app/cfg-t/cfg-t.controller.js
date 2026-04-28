const { successResponse } = require('@utils/responseHandler');
const CfgTService = require('./cfg-t.service');
const CfgTRepository = require('./cfg-t.repository');

const service = new CfgTService(new CfgTRepository());

class CfgTController {
	// GET /cfg/t/r/:id -> configuración filtrada por id (y pareja si existe)
	getCfgId = async (req, res, next) => {
		try {
			const id = Number(req.params.id);
			const data = await service.getCfgId(id, req.search, req.sort);
			return successResponse(res, {
				success: true,
				message: 'Configuración filtrada por id (y pareja si existe) obtenida correctamente',
				data,
			});
		} catch (err) {
			next(err);
		}
	};
	createCfgTFull = async (req, res, next) => {
		try {
			const data = await service.createCfgTFull(req.body);
			return successResponse(res, {
				message: 'Configuración creada correctamente',
				data,
			});
		} catch (err) {
			next(err);
		}
	};

	getCfgTList = async (req, res, next) => {
		try {
			const data = await service.getCfgTList(req.user, req.search, req.sort);
			return successResponse(res, {
				message: 'Listado de configuraciones obtenido correctamente',
				data,
			});
		} catch (err) {
			next(err);
		}
	};

	getAspectosEscalas = async (req, res, next) => {
		try {
			const cfgTId = Number(req.params.id);
			const data = await service.getAspectosEscalas(cfgTId);
			return successResponse(res, { message: 'Aspectos y escalas obtenidos', data });
		} catch (err) {
			next(err);
		}
	};

	getCfgAAndCfgE = async (req, res, next) => {
		try {
			const cfgTId = req.params.id ? Number(req.params.id) : undefined;
			const data = await service.getCfgAAndCfgE(cfgTId);
			const isArray = Array.isArray(data);
			return successResponse(res, { 
				success: true,
				message: isArray ? 'Configuraciones cfg_a y cfg_e obtenidas' : 'Configuración cfg_a y cfg_e obtenida', 
				data 
			});
		} catch (err) {
			next(err);
		}
	};

	getRoles = async (req, res, next) => {
		try {
			const cfgTId = Number(req.params.id);
			const data = await service.getRolesByCfgT(cfgTId);
			return successResponse(res, { message: 'Roles obtenidos correctamente', data });
		} catch (err) {
			next(err);
		}
	};

	getEvaluacionesByCfgTUser = async (req, res, next) => {
		try {
			const cfgTId = Number(req.params.id);
			const data = await service.getEvaluacionesByCfgT(cfgTId, req.user);
			return successResponse(res, { message: 'Evaluaciones obtenidas correctamente', data });
		} catch (err) {
			next(err);
		}
	};

	getScopesByCfgT = async (req, res, next) => {
		try {
			const cfgTId = Number(req.params.id);
			const data = await service.getScopesByCfgT(cfgTId);
			return successResponse(res, { message: 'Scopes obtenidos correctamente', data });
		} catch (err) {
			next(err);
		}
	};
}

module.exports = new CfgTController();
