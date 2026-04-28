const { successPaginatedResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

class UserProgController {
	constructor(service) {
		this.service = service;
	}

	getUserProgWithDataLogin = async (req, res, next) => {
		try {
			const { data, pagination } = await this.service.getUserProgWithDataLogin({
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

module.exports = UserProgController;
