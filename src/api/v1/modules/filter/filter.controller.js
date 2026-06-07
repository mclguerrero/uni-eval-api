const { successResponse } = require('@utils/responseHandler');

class FilterController {
  constructor(service) {
    this.service = service;
  }

  getAllFilters = async (req, res, next) => {
    try {
      const data = await this.service.getAllFilters();
      return successResponse(res, { message: 'Filtros obtenidos correctamente', data });
    } catch (err) {
      next(err);
    }
  };

  getPeriodos = async (req, res, next) => {
    try {
      const data = await this.service.getPeriodos();
      return successResponse(res, { message: 'Periodos obtenidos correctamente', data });
    } catch (err) {
      next(err);
    }
  };

  getSedes = async (req, res, next) => {
    try {
      const data = await this.service.getSedes({ periodo: req.query.periodo });
      return successResponse(res, { message: 'Sedes obtenidas correctamente', data });
    } catch (err) {
      next(err);
    }
  };

  getFacultades = async (req, res, next) => {
    try {
      const data = await this.service.getFacultades({
        periodo: req.query.periodo,
        sede: req.query.sede,
      });
      return successResponse(res, { message: 'Facultades obtenidas correctamente', data });
    } catch (err) {
      next(err);
    }
  };

  getProgramas = async (req, res, next) => {
    try {
      const data = await this.service.getProgramas({
        periodo: req.query.periodo,
        sede: req.query.sede,
        facultad: req.query.facultad,
      });
      return successResponse(res, { message: 'Programas obtenidos correctamente', data });
    } catch (err) {
      next(err);
    }
  };

  getSemestres = async (req, res, next) => {
    try {
      const data = await this.service.getSemestres({
        periodo: req.query.periodo,
        sede: req.query.sede,
        facultad: req.query.facultad,
        programa: req.query.programa,
      });
      return successResponse(res, { message: 'Semestres obtenidos correctamente', data });
    } catch (err) {
      next(err);
    }
  };

  getGrupos = async (req, res, next) => {
    try {
      const data = await this.service.getGrupos({
        periodo: req.query.periodo,
        sede: req.query.sede,
        facultad: req.query.facultad,
        programa: req.query.programa,
        semestre: req.query.semestre,
      });
      return successResponse(res, { message: 'Grupos obtenidos correctamente', data });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = FilterController;
