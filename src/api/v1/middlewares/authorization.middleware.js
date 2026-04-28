const AppError = require('@utils/AppError');
const { isUserAuthorized, getUserScopesForConfig, getUserActiveScopes } = require('./authorization.service');

// Verificación de rol global (APP) como bypass, igual que en auth.middleware
function hasGlobalRole(user) {
  try {
    const { globalRoles } = require('./auth.rol.global');
    const appIds = new Set((user?.rolesAppIds || []).map(String));
    return Array.isArray(globalRoles) && globalRoles.some(roleId => appIds.has(String(roleId)));
  } catch {
    return false;
  }
}

/**
 * Middleware de autorización basado en cfg_t + cfg_t_scope + cfg_t_rol.
 * Debe usarse DESPUÉS de ensureAuth.
 *
 * @param {number|((req: import('express').Request)=>number|null)|null} cfgSelector
 *        Puede ser:
 *         - número fijo de cfg_t
 *         - función que recibe req y retorna un ID
 *         - null/undefined para usar cfg_t activa
 * @returns {import('express').RequestHandler}
 */
function requireAuthorization(cfgSelector = null) {
  return async (req, res, next) => {
    try {
      if (!req.user) throw new AppError('Usuario no autenticado', 401);

      // Si el usuario posee rol global, omite validación adicional
      if (hasGlobalRole(req.user)) {
        const userScopes = await getUserActiveScopes(req.user);
        req.authorized = { 
          timestamp: new Date(), 
          cfgTId: null, 
          globalBypass: true,
          userScopes,
        };
        return next();
      }

      // Si el usuario tiene rol 2 en auth O rol 2 en app (docente/director), omite validación
      const authRoleIds = new Set((req.user?.rolesAuthIds || []).map(String));
      const appRoleIds = new Set((req.user?.rolesAppIds || []).map(String));
      
      if (authRoleIds.has('2') || appRoleIds.has('2')) {
        const userScopes = await getUserActiveScopes(req.user);
        req.authorized = { 
          timestamp: new Date(), 
          cfgTId: null, 
          role2Bypass: true,
          userScopes,
        };
        return next();
      }

      const cfgTId = typeof cfgSelector === 'function' ? cfgSelector(req) : cfgSelector ?? null;
      const ok = await isUserAuthorized(req.user, cfgTId);

      if (!ok) {
        throw new AppError(
          'No estás autorizado para realizar esta acción. Requiere configuración activa y roles asignados.',
          403
        );
      }

      // Obtener scopes específicos para esta config
      const userScopes = await getUserScopesForConfig(req.user, cfgTId);

      req.authorized = { 
        timestamp: new Date(), 
        cfgTId: cfgTId ?? null,
        userScopes,
      };
      next();
    } catch (err) {
      next(err instanceof AppError ? err : new AppError('Error en validación de autorización', 500, err));
    }
  };
}

/**
 * Variante que no lanza error cuando no está autorizado; deja bandera en req.
 */
function checkAuthorizationOptional(cfgSelector = null) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        req.authorized = false;
        return next();
      }

      // Si el usuario posee rol global, marcar como autorizado
      if (hasGlobalRole(req.user)) {
        const userScopes = await getUserActiveScopes(req.user);
        req.authorized = { 
          timestamp: new Date(), 
          cfgTId: null, 
          globalBypass: true,
          userScopes,
        };
        return next();
      }

      const cfgTId = typeof cfgSelector === 'function' ? cfgSelector(req) : cfgSelector ?? null;
      const ok = await isUserAuthorized(req.user, cfgTId);
      
      if (ok) {
        const userScopes = await getUserScopesForConfig(req.user, cfgTId);
        req.authorized = { 
          timestamp: new Date(), 
          cfgTId: cfgTId ?? null,
          userScopes,
        };
      } else {
        req.authorized = false;
      }
      next();
    } catch {
      req.authorized = false;
      next();
    }
  };
}

module.exports = { requireAuthorization, checkAuthorizationOptional };
