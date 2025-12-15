const { successResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

class FilterController {
  constructor(service) {
    this.service = service;
  }

  getAllFilters = async (req, res, next) => {
    try {
      const data = await this.service.getAllFilters();
      return successResponse(res, { 
        message: 'Filtros obtenidos correctamente', 
        data 
      });
    } catch (err) {
      next(err);
    }
  };

  getSedes = async (req, res, next) => {
    try {
      const data = await this.service.getSedes();
      return successResponse(res, { 
        message: 'Sedes obtenidas correctamente', 
        data 
      });
    } catch (err) {
      next(err);
    }
  };

  getPeriodos = async (req, res, next) => {
    try {
      const filters = {
        sede: req.query.sede
      };
      const data = await this.service.getPeriodos(filters);
      return successResponse(res, { 
        message: 'Periodos obtenidos correctamente', 
        data 
      });
    } catch (err) {
      next(err);
    }
  };

  getProgramas = async (req, res, next) => {
    try {
      const filters = {
        sede: req.query.sede,
        periodo: req.query.periodo
      };
      const data = await this.service.getProgramas(filters);
      return successResponse(res, { 
        message: 'Programas obtenidos correctamente', 
        data 
      });
    } catch (err) {
      next(err);
    }
  };

  getSemestres = async (req, res, next) => {
    try {
      const filters = {
        sede: req.query.sede,
        periodo: req.query.periodo,
        programa: req.query.programa
      };
      const data = await this.service.getSemestres(filters);
      return successResponse(res, { 
        message: 'Semestres obtenidos correctamente', 
        data 
      });
    } catch (err) {
      next(err);
    }
  };

  getGrupos = async (req, res, next) => {
    try {
      const filters = {
        sede: req.query.sede,
        periodo: req.query.periodo,
        programa: req.query.programa,
        semestre: req.query.semestre
      };
      const data = await this.service.getGrupos(filters);
      return successResponse(res, { 
        message: 'Grupos obtenidos correctamente', 
        data 
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = FilterController;
