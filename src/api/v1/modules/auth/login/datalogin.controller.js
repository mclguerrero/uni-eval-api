const { successResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

class DataloginController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const data = await this.service.getAll();
      const sanitized = data.map(({ user_password, ...rest }) => rest);
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: sanitized
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getById(Number(req.params.id));
      const { user_password, ...rest } = data;
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: rest
      });
    } catch (err) {
      next(err);
    }
  };

  getByUsername = async (req, res, next) => {
    try {
      const data = await this.service.getByUsername(req.params.username);
      const { user_password, ...rest } = data;
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: rest
      });
    } catch (err) {
      next(err);
    }
  }; 

  login = async (req, res, next) => {
    try {
      const username = req.body.username || req.body.user_username;
      const password = req.body.password || req.body.user_password || req.body.user_passwword;
      const result = await this.service.login(username, password);
      return successResponse(res, {
        message: MESSAGES.AUTH.SUCCESS.LOGIN,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = DataloginController;
