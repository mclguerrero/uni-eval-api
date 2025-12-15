const { successResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

class RolController {
	constructor(service) {
		this.service = service;
	}

	getMixedRoles = async (req, res, next) => {
		try {
			const data = await this.service.getMixedRoles();
			return successResponse(res, {
				message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
				data
			});
		} catch (err) {
			next(err);
		}
	};
}

module.exports = RolController;
