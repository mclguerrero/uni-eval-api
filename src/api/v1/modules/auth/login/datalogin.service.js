const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');
const bcrypt = require('bcryptjs');
const jwtConfig = require('@config/jwt_config');
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const { v4: uuidv4 } = require('uuid');

class DataloginService {
  constructor(repository) {
    this.repository = repository;
  }

  // List and fetch helpers
  getAll() {
    return this.repository.findAll();
  }

  async getById(id) {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(MESSAGES.AUTH.ERROR.USER_NOT_FOUND, 404);
    return item;
  }

  async getByUsername(username) {
    const user = await this.repository.findByUsername(username);
    if (!user) throw new AppError(MESSAGES.AUTH.ERROR.USER_NOT_FOUND, 404);

    // Remote roles with id and name
    const authEntries = await this.repository.findAllByUsername(username);
    const authMap = new Map();
    for (const e of authEntries) {
      if (!e?.user_idrole || !e?.role_name) continue;
      if (authMap.has(e.user_idrole)) continue;
      authMap.set(e.user_idrole, { id: e.user_idrole, name: e.role_name });
    }
    const rolesAuth = Array.from(authMap.values());
    const rolesAuthIds = rolesAuth.map(r => r.id);
    const rolesAuthNames = rolesAuth.map(r => r.name);

    // Local roles with id and name
    const rolesApp = await this.repository.findLocalRolesByUserId(user.user_id);
    const rolesAppIds = rolesApp.map(r => r.id);
    const rolesAppNames = rolesApp.map(r => r.name);

    // Combined names for compatibility/authorization
    const roles = Array.from(new Set([...rolesAuthNames, ...rolesAppNames]));
    const rolesIds = Array.from(new Set([...rolesAuthIds, ...rolesAppIds]));

    return {
      ...user,
      rolesAuth,
      rolesAuthIds,
      rolesApp,
      rolesAppIds,
      roles,
      rolesIds
    };
  }

  // Issue short-lived access token
  createAccessToken(payload) {
    if (!jwtConfig.secret) throw new AppError(MESSAGES.GENERAL.SERVER.SERVER_ERROR, 500);
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn || '15m'
    });
  }

  // Create and persist a hashed refresh token (single session per user)
  async createAndStoreRefreshToken(user) {
    const jti = uuidv4();
    const rawToken = uuidv4() + '.' + uuidv4(); // opaque random token
    const tokenHash = this.repository.hashToken(rawToken);

    // 7 days expiration for refresh token (configurable)
    const now = new Date();
    const exp = new Date(now.getTime() + (jwtConfig.refreshExpiresMs || 7 * 24 * 60 * 60 * 1000));

    await this.repository.upsertRefreshToken({
      user_id: user.user_id,
      jti,
      tokenHash,
      fecha_expiracion: exp
    });

    return { jti, refreshToken: rawToken, exp };
  }

  // Login: validate credentials, return access + refresh
  async login(username, password) { 
    if (!username || !password) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);

    // Base user
    const user = await this.repository.findByUsername(username);
    if (!user) throw new AppError(MESSAGES.AUTH.ERROR.INVALID_CREDENTIALS, 401);

    // All auth entries (roles)
    const authEntries = await this.repository.findAllByUsername(username);

    const stored = user.user_password;
    let isValid = false;

    if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
      isValid = await bcrypt.compare(password, stored);
    } else if (/^[a-f0-9]{32}$/i.test(stored)) { // MD5
      isValid = md5(password) === stored;
    } else {
      isValid = password === stored; // not recommended
    }

    if (!isValid) throw new AppError(MESSAGES.AUTH.ERROR.INVALID_CREDENTIALS, 401);

    const authMap = new Map();
    for (const e of authEntries) {
      if (!e?.user_idrole || !e?.role_name) continue;
      if (authMap.has(e.user_idrole)) continue;
      authMap.set(e.user_idrole, { id: e.user_idrole, name: e.role_name });
    }
    const rolesAuth = Array.from(authMap.values());
    const rolesAuthIds = rolesAuth.map(r => r.id);
    const rolesAuthNames = rolesAuth.map(r => r.name);

    const rolesApp = await this.repository.findLocalRolesByUserId(user.user_id);
    const rolesAppIds = rolesApp.map(r => r.id);
    const rolesAppNames = rolesApp.map(r => r.name);

    const roles = Array.from(new Set([...rolesAuthNames, ...rolesAppNames]));
    const rolesIds = Array.from(new Set([...rolesAuthIds, ...rolesAppIds]));

    const payload = {
      id: user.user_id,
      username: user.user_username,
      rolesAuth: rolesAuthNames,
      rolesApp: rolesAppNames,
      roles,
      rolesAuthIds,
      rolesAppIds,
      rolesIds
    };

    const accessToken = this.createAccessToken(payload);

    // Create secure refresh token and persist hash
    const { refreshToken, jti, exp } = await this.createAndStoreRefreshToken(user);

    const { user_password, user_idrole, user_statusid, role_name, role, ...safeUser } = user;
    return {
      accessToken,
      refreshToken,
      jti,
      refreshExpiresAt: exp,
      user: {
        ...safeUser,
        rolesAuth,
        rolesAuthIds,
        rolesApp,
        rolesAppIds,
        roles,
        rolesIds
      }
    };
  }

  // Validate presented refresh token, rotate and issue new access token
  async refresh(userId, presentedToken) {
    if (!userId || !presentedToken) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);

    const current = await this.repository.findActiveByUser(userId);
    if (!current) throw new AppError('No hay refresh token activo', 401);

    // Check expiration
    if (new Date(current.fecha_expiracion) <= new Date()) {
      await this.repository.revokeByUser(userId);
      throw new AppError('Refresh token expirado', 401);
    }

    const presentedHash = this.repository.hashToken(presentedToken);

    if (presentedHash !== current.token) {
      // Possible reuse attack: revoke all for user
      await this.repository.revokeByUser(userId);
      throw new AppError('Refresh token inválido o reutilizado', 401);
    }

    // Get user data to rebuild payload
    const user = await this.getById(userId);
    const authEntries = await this.repository.findAllByUsername(user.user_username);
    const authMap = new Map();
    for (const e of authEntries) {
      if (!e?.user_idrole || !e?.role_name) continue;
      if (authMap.has(e.user_idrole)) continue;
      authMap.set(e.user_idrole, { id: e.user_idrole, name: e.role_name });
    }
    const rolesAuth = Array.from(authMap.values());
    const rolesAuthIds = rolesAuth.map(r => r.id);
    const rolesAuthNames = rolesAuth.map(r => r.name);

    const rolesApp = await this.repository.findLocalRolesByUserId(user.user_id);
    const rolesAppIds = rolesApp.map(r => r.id);
    const rolesAppNames = rolesApp.map(r => r.name);

    const roles = Array.from(new Set([...rolesAuthNames, ...rolesAppNames]));
    const rolesIds = Array.from(new Set([...rolesAuthIds, ...rolesAppIds]));

    const payload = {
      id: user.user_id,
      username: user.user_username,
      rolesAuth: rolesAuthNames,
      rolesApp: rolesAppNames,
      roles,
      rolesAuthIds,
      rolesAppIds,
      rolesIds
    };

    const accessToken = this.createAccessToken(payload);

    // Rotate refresh: revoke old and create new
    await this.repository.revokeByUser(userId);
    const { refreshToken, jti, exp } = await this.createAndStoreRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      jti,
      refreshExpiresAt: exp
    };
  }

  // Logout: revoke active refresh token for user
  async logout(userId) {
    if (!userId) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);
    await this.repository.revokeByUser(userId);
    return { message: MESSAGES.AUTH.SUCCESS.LOGOUT || 'Logout exitoso' };
  }
}

module.exports = DataloginService;
