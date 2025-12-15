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
        const appIds = new Set((req.user?.rolesAppIds || []).map(String));
        const appNames = new Set(req.user?.rolesApp || []);

        if (appIds.size === 0 && appNames.size === 0)
          throw new AppError('Usuario sin roles de aplicación asignados', 403);

        const matchId = ids.size === 0 ? false : Array.from(ids).some(id => appIds.has(id));
        const matchName = names.size === 0 ? false : Array.from(names).some(name => appNames.has(name));

        if (!(matchId || matchName))
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
        const authIds = new Set((req.user?.rolesAuthIds || []).map(String));
        const authNames = new Set(req.user?.rolesAuth || []);

        if (authIds.size === 0 && authNames.size === 0)
          throw new AppError('Usuario sin roles de autenticación asignados', 403);

        const matchId = ids.size === 0 ? false : Array.from(ids).some(id => authIds.has(id));
        const matchName = names.size === 0 ? false : Array.from(names).some(name => authNames.has(name));

        if (!(matchId || matchName))
          throw new AppError('No tienes permiso para acceder a este recurso', 403);

        next();
      } catch (err) {
        next(err);
      }
    }
  ];
}

module.exports = { ensureAuth, requireAppRoles, requireAuthRoles };
