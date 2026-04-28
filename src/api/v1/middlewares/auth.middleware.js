const jwt = require('jsonwebtoken');
const AppError = require('@utils/AppError');
const jwtConfig = require('@config/jwt_config');

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new AppError('Token no proporcionado', 403);

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token)
    throw new AppError('Formato de token inválido', 403);

  return token;
}

function ensureAuth(req, res, next) {
  try {
    if (req.user?.fromToken) return next();

    if (!jwtConfig.secret)
      throw new AppError('JWT_SECRET no configurado', 500);

    const token = extractToken(req);
    const decoded = jwt.verify(token, jwtConfig.secret);

    const {
      id,
      user_id,
      username,
      user_username,
      roles = [],
      rolesAuth = [],
      rolesApp = [],
      rolesIds = [],
      rolesAuthIds = [],
      rolesAppIds = [],
      status,
      user_statusid
    } = decoded;

    req.user = {
      id: id ?? user_id,
      username: username ?? user_username,
      roles,
      rolesAuth,
      rolesApp,
      rolesIds,
      rolesAuthIds,
      rolesAppIds,
      status: status ?? user_statusid,
      fromToken: true
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return next(new AppError('El token ha expirado', 401));
    next(err);
  }
}

function hasGlobalRole(user) {
  // Importación diferida para evitar dependencia circular
  const { globalRoles } = require('./auth.rol.global');
  
  const appIds = new Set((user?.rolesAppIds || []).map(String));
  return Array.isArray(globalRoles) && globalRoles.some(roleId => appIds.has(String(roleId)));
}

function normalizeRequired(required) {
  const ids = new Set();
  const names = new Set();

  required.flat().filter(Boolean).forEach(r => {
    if (typeof r === 'number') ids.add(String(r));
    else if (!Number.isNaN(Number(r)) && r !== '') ids.add(String(r));
    else if (typeof r === 'string') names.add(r);
  });

  return { ids, names };
}

function requireAppRoles(...required) {
  const { ids, names } = normalizeRequired(required);

  return [
    ensureAuth,
    (req, res, next) => {
      try {
        // Verificar rol global primero
        if (hasGlobalRole(req.user)) return next();

        const appIds = new Set((req.user?.rolesAppIds || []).map(String));

        if (appIds.size === 0)
          throw new AppError('Usuario sin roles de aplicación asignados', 403);

        const matchId = ids.size === 0 ? false : Array.from(ids).some(id => appIds.has(id));

        if (!matchId)
          throw new AppError('No tienes permiso para acceder a este recurso', 403);

        next();
      } catch (err) {
        next(err);
      }
    }
  ];
}

function requireAuthRoles(...required) {
  const { ids, names } = normalizeRequired(required);

  return [
    ensureAuth,
    (req, res, next) => {
      try {
        // Verificar rol global primero
        if (hasGlobalRole(req.user)) return next();

        const authIds = new Set((req.user?.rolesAuthIds || []).map(String));

        if (authIds.size === 0)
          throw new AppError('Usuario sin roles de autenticación asignados', 403);

        const matchId = ids.size === 0 ? false : Array.from(ids).some(id => authIds.has(id));

        if (!matchId)
          throw new AppError('No tienes permiso para acceder a este recurso', 403);

        next();
      } catch (err) {
        next(err);
      }
    }
  ];
}

function requireRoles(rolesConfig) {
  // Soporta: [{ type: 'auth', values: [1] }, { type: 'app', values: [5, 10] }]
  // O formato legacy: { type: 'auth', values: [10] }
  
  return [
    ensureAuth,
    (req, res, next) => {
      try {
        // Verificar rol global primero
        if (hasGlobalRole(req.user)) return next();

        // Normalizar configuración a array
        const configs = Array.isArray(rolesConfig) ? rolesConfig : [rolesConfig];
        
        let hasAccess = false;

        for (const config of configs) {
          const { type, values } = config;
          
          if (!type || !values || !Array.isArray(values)) continue;

          const userIds = type === 'auth' 
            ? new Set((req.user?.rolesAuthIds || []).map(String))
            : new Set((req.user?.rolesAppIds || []).map(String));

          // Verificar si alguno de los valores requeridos está en los roles del usuario
          const match = values.some(val => userIds.has(String(val)));
          
          if (match) {
            hasAccess = true;
            break;
          }
        }

        if (!hasAccess)
          throw new AppError('No tienes permiso para acceder a este recurso', 403);

        next();
      } catch (err) {
        next(err);
      }
    }
  ];
}

function requireGlobalRole(req, res, next) {
  try {
    if (hasGlobalRole(req.user)) return next();
    throw new AppError('No tienes permiso para acceder a este recurso', 403);
  } catch (err) {
    next(err);
  }
}

module.exports = { ensureAuth, requireAppRoles, requireAuthRoles, requireRoles, requireGlobalRole, hasGlobalRole };
