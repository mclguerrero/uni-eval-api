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
      status,
      user_statusid
    } = decoded;

    req.user = {
      id: id ?? user_id,
      username: username ?? user_username,
      roles,
      rolesAuth,
      rolesApp,
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

function requireRoles(...required) {
  const flatRequired = required.flat().filter(Boolean);

  return [
    ensureAuth,
    (req, res, next) => {
      try {
        const allUserRoles = new Set([
          ...(req.user?.rolesAuth || []),
          ...(req.user?.rolesApp || []),
          ...(req.user?.roles || [])
        ]);

        if (allUserRoles.size === 0)
          throw new AppError('Usuario sin roles asignados', 403);

        const hasRole =
          flatRequired.length > 0 &&
          flatRequired.some(role => allUserRoles.has(role));

        if (!hasRole)
          throw new AppError('No tienes permiso para acceder a este recurso', 403);

        next();
      } catch (err) {
        next(err);
      }
    }
  ];
}

module.exports = { ensureAuth, requireRoles };
