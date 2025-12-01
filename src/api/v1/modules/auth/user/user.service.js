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

    // Transformamos info a formato docente → materias
    const first = materiasRaw[0];
    const docente = {
      documento: first.ID_DOCENTE,
      nombre: first.DOCENTE,
      materias: materiasRaw.map((m, index) => ({
        id: index + 1,
        codigo: m.COD_ASIGNATURA,
        nombre: m.ASIGNATURA,
        estudiante: {
          documento: m.ID_ESTUDIANTE,
          nombre: [m.PRIMER_NOMBRE, m.SEGUNDO_NOMBRE, m.PRIMER_APELLIDO, m.SEGUNDO_APELLIDO]
            .filter(Boolean).join(' ')
        },
        programa: m.NOM_PROGRAMA,
        periodo: m.PERIODO,
        grupo: m.GRUPO
      }))
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
