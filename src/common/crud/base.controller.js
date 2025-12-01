const { successResponse, successPaginatedResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

class BaseController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const { data, pagination } = await this.service.getAll(req.pagination);
      if (pagination) {
        return successPaginatedResponse(res, {
          message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
          data,
          pagination
        });
      }
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getById(Number(req.params.id));
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = await this.service.create(req.body);
      return successResponse(res, {
        code: 201,
        message: MESSAGES.GENERAL.SUCCESS.CREATED,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const data = await this.service.update(Number(req.params.id), req.body);
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.UPDATED,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.service.delete(Number(req.params.id));
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.DELETED
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = BaseController;
