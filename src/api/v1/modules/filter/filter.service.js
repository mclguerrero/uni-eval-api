class FilterService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Obtiene todos los valores únicos para los filtros sin aplicar filtros
   */
  async getAllFilters() {
    const data = await this.repository.getAllFilters();
    
    // Formatear los resultados para que sean arrays de strings simples
    return {
      sedes: data.sedes.map(item => item.NOMBRE_SEDE),
      periodos: data.periodos.map(item => item.PERIODO),
      programas: data.programas.map(item => item.NOM_PROGRAMA),
      semestres: data.semestres.map(item => item.SEMESTRE),
      grupos: data.grupos.map(item => item.GRUPO),
    };
  }

  /**
   * Obtiene valores únicos de sede
   */
  async getSedes() {
    const result = await this.repository.getUniqueSedes();
    return result.map(item => item.NOMBRE_SEDE);
  }

  /**
   * Obtiene valores únicos de periodo filtrados por sede (opcional)
   */
  async getPeriodos(filters = {}) {
    const result = await this.repository.getUniquePeriodos(filters);
    return result.map(item => item.PERIODO);
  }

  /**
   * Obtiene valores únicos de programa filtrados por sede y periodo (opcionales)
   */
  async getProgramas(filters = {}) {
    const result = await this.repository.getUniqueProgramas(filters);
    return result.map(item => item.NOM_PROGRAMA);
  }

  /**
   * Obtiene valores únicos de semestre filtrados por sede, periodo y programa (opcionales)
   */
  async getSemestres(filters = {}) {
    const result = await this.repository.getUniqueSemestres(filters);
    return result.map(item => item.SEMESTRE);
  }

  /**
   * Obtiene valores únicos de grupo filtrados por sede, periodo, programa y semestre (opcionales)
   */
  async getGrupos(filters = {}) {
    const result = await this.repository.getUniqueGrupos(filters);
    return result.map(item => item.GRUPO);
  }
}

module.exports = FilterService;
