const { successResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');
const EvalService = require('./eval.service');

class EvalController {
	constructor(service = new EvalService()) {
		this.service = service;
	}

	generar = async (req, res, next) => {
		try {
			const data = await this.service.generateEvaluations(req.body, req.user);
			return successResponse(res, {
				message: MESSAGES.GENERAL.SUCCESS.CREATED,
				data,
			});
		} catch (err) {
			next(err);
		}
	};
}

module.exports = EvalController;

