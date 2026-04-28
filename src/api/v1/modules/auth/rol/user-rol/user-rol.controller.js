const { successPaginatedResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

class UserRolController {
	constructor(service) {
		this.service = service;
	}

	getUserRolesWithName = async (req, res, next) => {
		try {
			const { data, pagination } = await this.service.getUserRolesWithName(req.pagination);
			return successPaginatedResponse(res, {
				message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
				data,
				pagination
			});
		} catch (err) {
			next(err);
		}
	};

	getUserRolesWithDataLogin = async (req, res, next) => {
		try {
			const { data, pagination } = await this.service.getUserRolesWithDataLogin({
				pagination: req.pagination,
				sort: req.sort,
				search: req.search
			});
			return successPaginatedResponse(res, {
				message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
				data,
				pagination
			});
		} catch (err) {
			next(err);
		}
	};
}

module.exports = UserRolController;
