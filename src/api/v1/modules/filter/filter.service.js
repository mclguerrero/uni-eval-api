class FilterService {
  constructor(repository) {
    this.repository = repository;
  }

  async getAllFilters() {
    const data = await this.repository.getAllFilters();
    return {
      periodos:   data.periodos.map(r => r.PERIODO),
      sedes:      data.sedes.map(r => r.NOMBRE_SEDE),
      facultades: data.facultades.map(r => r.NOM_FACULTAD),
      programas:  data.programas.map(r => r.NOM_PROGRAMA),
      semestres:  data.semestres.map(r => r.SEMESTRE),
      grupos:     data.grupos.map(r => r.GRUPO),
    };
  }

  async getPeriodos() {
    const result = await this.repository.getUniquePeriodos();
    return result.map(r => r.PERIODO);
  }

  async getSedes(filters = {}) {
    const result = await this.repository.getUniqueSedes(filters);
    return result.map(r => r.NOMBRE_SEDE);
  }

  async getFacultades(filters = {}) {
    const result = await this.repository.getUniqueFacultades(filters);
    return result.map(r => r.NOM_FACULTAD);
  }

  async getProgramas(filters = {}) {
    const result = await this.repository.getUniqueProgramas(filters);
    return result.map(r => r.NOM_PROGRAMA);
  }

  async getSemestres(filters = {}) {
    const result = await this.repository.getUniqueSemestres(filters);
    return result.map(r => r.SEMESTRE);
  }

  async getGrupos(filters = {}) {
    const result = await this.repository.getUniqueGrupos(filters);
    return result.map(r => r.GRUPO);
  }
}

module.exports = FilterService;
