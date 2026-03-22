const { prisma } = require('@config/prisma');
const AppError = require('@utils/AppError');
const UserRepository = require('../modules/auth/user/user.repository');
const UserService = require('../modules/auth/user/user.service');

const userService = new UserService(new UserRepository());

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function addSetValue(set, value) {
  const normalized = normalizeText(value);
  if (normalized) set.add(normalized);
}

function matchesScalarScope(scopeValue, userValue) {
  if (!scopeValue) return true;
  if (!userValue) return false;
  return normalizeText(scopeValue) === normalizeText(userValue);
}

function matchesSetScope(scopeValue, userSet) {
  if (!scopeValue) return true;
  if (!userSet || userSet.size === 0) return false;
  return userSet.has(normalizeText(scopeValue));
}

async function getUserAcademicScopeContext(user) {
  try {
    const data = await userService.getMateriasForUser(user);
    if (!data || typeof data !== 'object') return null;

    const programas = new Set();
    const semestres = new Set();
    const grupos = new Set();

    addSetValue(programas, data.programa);
    addSetValue(semestres, data.semestre);
    addSetValue(grupos, data.grupo);

    if (Array.isArray(data.materias)) {
      for (const materia of data.materias) {
        addSetValue(programas, materia?.programa);
        addSetValue(semestres, materia?.semestre);

        if (Array.isArray(materia?.grupos)) {
          for (const group of materia.grupos) {
            addSetValue(grupos, group?.nombre);
          }
        }
      }
    }

    return {
      sede: normalizeText(data.sede),
      periodo: normalizeText(data.periodo),
      programas,
      semestres,
      grupos,
    };
  } catch {
    return null;
  }
}

function matchesScopeWithUserContext(scope, userContext) {
  if (!userContext) return true;

  return (
    matchesScalarScope(scope?.sede?.nombre, userContext.sede)
    && matchesScalarScope(scope?.periodo?.nombre, userContext.periodo)
    && matchesSetScope(scope?.programa?.nombre, userContext.programas)
    && matchesSetScope(scope?.smstre?.nombre, userContext.semestres)
    && matchesSetScope(scope?.grp?.nombre, userContext.grupos)
  );
}

/**
 * Obtiene la configuración activa y vigente (por fecha)
 * @returns {Promise<Object|null>} Configuración cfg_t activa
 */
async function getActiveConfig() {
  try {
    const now = new Date();
    const config = await prisma.cfg_t.findFirst({
      where: {
        es_activo: true,
        fecha_inicio: { lte: now },
        fecha_fin: { gte: now },
      },
      orderBy: { fecha_actualizacion: 'desc' },
    });
    return config;
  } catch (error) {
    throw new AppError('Error al obtener configuración activa', 500, error);
  }
}

/**
 * Valida si el usuario tiene autorización basada en scopes
 * @param {Object} user - Usuario desde req.user
 * @param {number|null} cfgTId - ID de configuración específica (opcional)
 * @returns {Promise<boolean>} true si está autorizado (tiene al menos un scope válido)
 */
async function isUserAuthorized(user, cfgTId = null) {
  if (!user) return false;

  const config = cfgTId
    ? await prisma.cfg_t.findUnique({ where: { id: Number(cfgTId) } })
    : await getActiveConfig();

  if (!config) return false;

  const scopes = await getUserScopesForConfig(user, config.id);
  return scopes.length > 0;
}

/**
 * Obtiene todos los scopes de un usuario para una configuración específica
 * Incluye datos completos de scope: sede, periodo, programa, semestre, grupo
 * @param {Object} user - Usuario desde req.user
 * @param {number} cfgTId - ID de la configuración
 * @returns {Promise<Array<Object>>} Scopes con datos completos
 */
async function getUserScopesForConfig(user, cfgTId) {
  if (!user) return [];

  try {
    const cfgTRoles = await prisma.cfg_t_rol.findMany({
      where: { cfg_t_id: Number(cfgTId) },
      select: {
        rol_mix: {
          select: {
            id: true,
            nombre: true,
            rol_origen_id: true,
            origen: true,
          },
        },
      },
    });

    const userAppRoleIds = new Set((user.rolesAppIds || []).map(String));
    const userAuthRoleIds = new Set((user.rolesAuthIds || []).map(String));

    const hasMatchingRole = cfgTRoles.some(({ rol_mix: rolMix }) => {
      const roleId = String(rolMix?.rol_origen_id);
      return (
        (rolMix?.origen === 'APP' && userAppRoleIds.has(roleId))
        || (rolMix?.origen === 'AUTH' && userAuthRoleIds.has(roleId))
      );
    });

    if (!hasMatchingRole) return [];

    const scopes = await prisma.cfg_t_scope.findMany({
      where: { cfg_t_id: Number(cfgTId) },
      select: {
        id: true,
        cfg_t_id: true,
        sede_id: true,
        periodo_id: true,
        programa_id: true,
        semestre_id: true,
        grupo_id: true,
        sede: {
          select: { id: true, nombre: true },
        },
        periodo: {
          select: { id: true, nombre: true },
        },
        programa: {
          select: { id: true, nombre: true },
        },
        smstre: {
          select: { id: true, nombre: true },
        },
        grp: {
          select: { id: true, nombre: true },
        },
      },
    });

    const userContext = await getUserAcademicScopeContext(user);

    const matchedRoles = cfgTRoles
      .map(item => item.rol_mix)
      .filter(Boolean);

    return scopes
      .filter(scope => matchesScopeWithUserContext(scope, userContext))
      .map(scope => ({
        ...scope,
        roles_requeridos: matchedRoles,
      }));
  } catch (error) {
    throw new AppError('Error al obtener scopes del usuario', 500, error);
  }
}

/**
 * Obtiene los scopes activos del usuario para la configuración vigente
 * @param {Object} user - Usuario desde req.user
 * @returns {Promise<Array<Object>>} Scopes con datos completos de la config activa
 */
async function getUserActiveScopes(user) {
  if (!user) return [];

  try {
    const config = await getActiveConfig();
    if (!config) return [];

    return await getUserScopesForConfig(user, config.id);
  } catch (error) {
    throw new AppError('Error al obtener scopes activos', 500, error);
  }
}

/**
 * Devuelve información útil para depuración/logging
 * @param {Object} user - Usuario desde req.user
 */
async function getUserAuthorizationInfo(user) {
  const config = await getActiveConfig();
  if (!config) {
    return {
      hasActiveConfig: false,
      rolesAppIds: user?.rolesAppIds || [],
      rolesAuthIds: user?.rolesAuthIds || [],
    };
  }

  const userScopes = await getUserScopesForConfig(user, config.id);

  return {
    hasActiveConfig: true,
    configId: config.id,
    userScopes,
    rolesAppIds: user?.rolesAppIds || [],
    rolesAuthIds: user?.rolesAuthIds || [],
  };
}

module.exports = {
  getActiveConfig,
  isUserAuthorized,
  getUserAuthorizationInfo,
  getUserScopesForConfig,
  getUserActiveScopes,
};
