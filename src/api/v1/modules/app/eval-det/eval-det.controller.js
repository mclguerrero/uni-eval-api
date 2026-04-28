const { successResponse } = require('@utils/responseHandler');
const EvalDetService = require('./eval-det.service');
const EvalDetRepository = require('./eval-det.repository');

const service = new EvalDetService(new EvalDetRepository());

async function bulkCreate(req, res, next) {
	try {
		const result = await service.saveBulk(req.body);
		return successResponse(res, { code: 201, message: 'Respuestas guardadas', data: result });
	} catch (err) {
		next(err);
	}
}

module.exports = { bulkCreate };
