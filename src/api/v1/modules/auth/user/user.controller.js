const { successResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

class UserController {
  constructor(service) {
    this.service = service;
  }

  getMateriasEstudiante = async (req, res, next) => {
    try {
      const ID_ESTUDIANTE = req.params.id;
      const estudiante = await this.service.getMateriasEstudiante(ID_ESTUDIANTE);
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: estudiante
      });
    } catch (err) {
      next(err);
    }
  };

  getMateriasDocente = async (req, res, next) => {
    try {
      const ID_DOCENTE = req.params.id;
      const docente = await this.service.getMateriasDocente(ID_DOCENTE);
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: docente
      });
    } catch (err) {
      next(err);
    }
  };

  getMateriasAutenticado = async (req, res, next) => {
    try {
      const data = await this.service.getMateriasForUser(req.user);
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = UserController;
