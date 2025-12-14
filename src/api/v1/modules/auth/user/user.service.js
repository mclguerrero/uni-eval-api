const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');

class UserService {
  constructor(repository) {
    this.repository = repository;
  }

  async getMateriasEstudiante(ID_ESTUDIANTE) {
    if (!ID_ESTUDIANTE) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);

    const materiasRaw = await this.repository.findMateriasByEstudiante(ID_ESTUDIANTE);
    if (!materiasRaw || materiasRaw.length === 0) throw new AppError(MESSAGES.GENERAL.NOT_FOUND.EMPTY_RESULT, 404);

    // Transformamos la info a formato anidado
    const first = materiasRaw[0];
    const estudiante = {
      sede: first.NOMBRE_SEDE,
      facultad: first.NOM_FACULTAD,
      nombre_completo: [first.PRIMER_NOMBRE, first.SEGUNDO_NOMBRE, first.PRIMER_APELLIDO, first.SEGUNDO_APELLIDO]
        .filter(Boolean).join(' '),
      documento: first.ID_ESTUDIANTE,
      programa: first.NOM_PROGRAMA,
      periodo: first.PERIODO,
      semestre: first.SEMESTRE,
      n_semestre: first.SEMESTRE?.match(/\d+/)?.[0] || null,
      grupo: first.GRUPO,
      materias: materiasRaw.map((m, index) => ({
        id: index + 1,
        codigo: m.COD_ASIGNATURA,
        nombre: m.ASIGNATURA,
        docente: {
          documento: m.ID_DOCENTE,
          nombre: m.DOCENTE
        }
      }))
    };

    return estudiante;
  }

  async getMateriasDocente(ID_DOCENTE) {
    if (!ID_DOCENTE) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);

    const materiasRaw = await this.repository.findMateriasByDocente(ID_DOCENTE);
    if (!materiasRaw || materiasRaw.length === 0) throw new AppError(MESSAGES.GENERAL.NOT_FOUND.EMPTY_RESULT, 404);

    // Helper para obtener el valor predominante (moda)
    const getModa = (arr) => {
      const freq = new Map();
      for (const v of arr.filter(Boolean)) freq.set(v, (freq.get(v) || 0) + 1);
      let moda = null; let max = -1;
      for (const [k, c] of freq.entries()) { if (c > max) { max = c; moda = k; } }
      return moda;
    };

    // Agrupar por materia (codigo)
    const materiasMap = new Map();
    for (const m of materiasRaw) {
      const cod = m.COD_ASIGNATURA;
      if (!materiasMap.has(cod)) {
        materiasMap.set(cod, {
          codigo: cod,
          nombre: m.ASIGNATURA,
          _programas: [],
          _semestres: [],
          grupos: new Map()
        });
      }
      const entry = materiasMap.get(cod);
      entry._programas.push(m.NOM_PROGRAMA);
      entry._semestres.push(m.SEMESTRE);

      // Agrupar por grupo dentro de la materia
      const grupoKey = m.GRUPO || 'SIN_GRUPO';
      if (!entry.grupos.has(grupoKey)) {
        entry.grupos.set(grupoKey, {
          nombre: grupoKey
        });
      }
    }

    // Construir salida final con programa/semestre predominantes y listas
    const materias = [];
    let idx = 1;
    for (const mat of materiasMap.values()) {
      const programaPred = getModa(mat._programas);
      const semestrePred = getModa(mat._semestres);
      const grupos = [];
      for (const g of mat.grupos.values()) {
        grupos.push({ nombre: g.nombre });
      }
      materias.push({
        id: idx++,
        codigo: mat.codigo,
        nombre: mat.nombre,
        programa: programaPred || null,
        semestre: semestrePred || null,
        grupos
      });
    }

    const first = materiasRaw[0];
    const docente = {
      documento: first.ID_DOCENTE,
      nombre: first.DOCENTE,
      materias
    };

    return docente;
  }
  
  async getMateriasForUser(user) {
    if (!user) throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.UNAUTHORIZED, 401);
    console.log(user);
    const { username, roles = [], rolesAuth = [], rolesApp = [] } = user;
    if (!username) throw new AppError(MESSAGES.GENERAL.VALIDATION.INVALID_REQUEST, 400);

    // Definición de roles (ajusta o extiende según tu sistema)
    const ROLES_ESTUDIANTE = new Set(['Estudiante']);
    const ROLES_DOCENTE = new Set([
      'Docente',
      'docente_planta',
      'docente_catedra',
      'docente_planta_tc',
      'docente_planta_mt',
      'docente_planta_tiempo_completo',
      'docente_planta_medio_tiempo'
    ]);

    const allRoles = new Set([
      ...roles,
      ...rolesAuth,
      ...rolesApp
    ].filter(Boolean));

    const isDocente = [...allRoles].some(r => ROLES_DOCENTE.has(r));
    const isEstudiante = [...allRoles].some(r => ROLES_ESTUDIANTE.has(r));

    if (isDocente) {
      return this.getMateriasDocente(username);
    }
    if (isEstudiante) {
      return this.getMateriasEstudiante(username);
    }

    throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.FORBIDDEN, 403);
  }
}

module.exports = UserService;
