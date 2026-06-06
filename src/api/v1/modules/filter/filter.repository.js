const { userPrisma } = require('@config/prisma');

class FilterRepository {
  _buildWhereConditions(filters = {}) {
    const conditions = ['1=1'];
    const params = [];

    if (filters.periodo) {
      conditions.push(`PERIODO = ?`);
      params.push(filters.periodo);
    }
    if (filters.sede) {
      conditions.push(`NOMBRE_SEDE = ?`);
      params.push(filters.sede);
    }
    if (filters.facultad) {
      conditions.push(`NOM_FACULTAD = ?`);
      params.push(filters.facultad);
    }
    if (filters.programa) {
      conditions.push(`NOM_PROGRAMA = ?`);
      params.push(filters.programa);
    }
    if (filters.semestre) {
      conditions.push(`SEMESTRE = ?`);
      params.push(filters.semestre);
    }

    return { conditions, params };
  }

  async getUniquePeriodos() {
    const result = await userPrisma.$queryRaw`
      SELECT DISTINCT PERIODO
      FROM vista_academica_insitus
      WHERE PERIODO IS NOT NULL
      ORDER BY PERIODO DESC
    `;
    return result;
  }

  async getUniqueSedes(filters = {}) {
    const { conditions, params } = this._buildWhereConditions({ periodo: filters.periodo });
    const query = `
      SELECT DISTINCT NOMBRE_SEDE
      FROM vista_academica_insitus
      WHERE ${conditions.join(' AND ')}
        AND NOMBRE_SEDE IS NOT NULL
      ORDER BY NOMBRE_SEDE
    `;
    return userPrisma.$queryRawUnsafe(query, ...params);
  }

  async getUniqueFacultades(filters = {}) {
    const { conditions, params } = this._buildWhereConditions({
      periodo: filters.periodo,
      sede: filters.sede,
    });
    const query = `
      SELECT DISTINCT NOM_FACULTAD
      FROM vista_academica_insitus
      WHERE ${conditions.join(' AND ')}
        AND NOM_FACULTAD IS NOT NULL
      ORDER BY NOM_FACULTAD
    `;
    return userPrisma.$queryRawUnsafe(query, ...params);
  }

  async getUniqueProgramas(filters = {}) {
    const { conditions, params } = this._buildWhereConditions({
      periodo: filters.periodo,
      sede: filters.sede,
      facultad: filters.facultad,
    });
    const query = `
      SELECT DISTINCT NOM_PROGRAMA
      FROM vista_academica_insitus
      WHERE ${conditions.join(' AND ')}
        AND NOM_PROGRAMA IS NOT NULL
      ORDER BY NOM_PROGRAMA
    `;
    return userPrisma.$queryRawUnsafe(query, ...params);
  }

  async getUniqueSemestres(filters = {}) {
    const { conditions, params } = this._buildWhereConditions({
      periodo: filters.periodo,
      sede: filters.sede,
      facultad: filters.facultad,
      programa: filters.programa,
    });
    const query = `
      SELECT DISTINCT SEMESTRE
      FROM vista_academica_insitus
      WHERE ${conditions.join(' AND ')}
        AND SEMESTRE IS NOT NULL
      ORDER BY CASE UPPER(TRIM(SEMESTRE))
        WHEN 'PRIMER SEMESTRE' THEN 1
        WHEN 'SEGUNDO SEMESTRE' THEN 2
        WHEN 'TERCER SEMESTRE' THEN 3
        WHEN 'CUARTO SEMESTRE' THEN 4
        WHEN 'QUINTO SEMESTRE' THEN 5
        WHEN 'SEXTO SEMESTRE' THEN 6
        WHEN 'SEPTIMO SEMESTRE' THEN 7
        WHEN 'OCTAVO SEMESTRE' THEN 8
        WHEN 'NOVENO SEMESTRE' THEN 9
        WHEN 'DECIMO SEMESTRE' THEN 10
        ELSE 999
      END, SEMESTRE
    `;
    return userPrisma.$queryRawUnsafe(query, ...params);
  }

  async getUniqueGrupos(filters = {}) {
    const { conditions, params } = this._buildWhereConditions({
      periodo: filters.periodo,
      sede: filters.sede,
      facultad: filters.facultad,
      programa: filters.programa,
      semestre: filters.semestre,
    });
    const query = `
      SELECT DISTINCT GRUPO
      FROM vista_academica_insitus
      WHERE ${conditions.join(' AND ')}
        AND GRUPO IS NOT NULL
      ORDER BY GRUPO
    `;
    return userPrisma.$queryRawUnsafe(query, ...params);
  }

  async getAllFilters() {
    const [periodos, sedes, facultades, programas, semestres, grupos] = await Promise.all([
      this.getUniquePeriodos(),
      this.getUniqueSedes(),
      this.getUniqueFacultades(),
      this.getUniqueProgramas(),
      this.getUniqueSemestres(),
      this.getUniqueGrupos(),
    ]);
    return { periodos, sedes, facultades, programas, semestres, grupos };
  }
}

module.exports = FilterRepository;
