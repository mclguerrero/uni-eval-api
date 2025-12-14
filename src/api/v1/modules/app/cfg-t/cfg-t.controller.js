const { successResponse } = require('@utils/responseHandler');
const CfgTService = require('./cfg-t.service');
const CfgTRepository = require('./cfg-t.repository');

const service = new CfgTService(new CfgTRepository());

class CfgTController {
	getAspectosEscalas = async (req, res, next) => {
		try {
			const cfgTId = Number(req.params.id);
			const data = await service.getAspectosEscalas(cfgTId);
			return successResponse(res, { message: 'Aspectos y escalas obtenidos', data });
		} catch (err) {
			next(err);
		}
	};
}

module.exports = new CfgTController();
