const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');
const bcrypt = require('bcryptjs');
const jwtConfig = require('@config/jwt_config');
const jwt = require('jsonwebtoken');
const md5 = require('md5');

class DataloginService {
  constructor(repository) {
    this.repository = repository;
  }

  getAll() {
    return this.repository.findAll();
  }

  async getById(id) {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(MESSAGES.AUTH.ERROR.USER_NOT_FOUND, 404);
    return item;
  }

  async getByUsername(username) {
    const item = await this.repository.findByUsername(username);
    if (!item) throw new AppError(MESSAGES.AUTH.ERROR.USER_NOT_FOUND, 404);
    return item;
  }

  async login(username, password) { 
    if (!username || !password) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);

    // Trae cualquier registro (para credenciales y datos base)
    const user = await this.repository.findByUsername(username);
    if (!user) throw new AppError(MESSAGES.AUTH.ERROR.INVALID_CREDENTIALS, 401);

    // Trae todos los registros del usuario en la base AUTH (cada uno puede representar un rol)
    const authEntries = await this.repository.findAllByUsername(username);

    const stored = user.user_password;
    let isValid = false;

    // Detect bcrypt hash
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
      isValid = await bcrypt.compare(password, stored);
    } else if (/^[a-f0-9]{32}$/i.test(stored)) { // MD5 hash
      isValid = md5(password) === stored;
    } else {
      // Plaintext fallback (no recomendado)
      isValid = password === stored;
    }

    if (!isValid) throw new AppError(MESSAGES.AUTH.ERROR.INVALID_CREDENTIALS, 401);
    if (!jwtConfig.secret) throw new AppError(MESSAGES.GENERAL.SERVER.SERVER_ERROR, 500);

    // Roles primarios (AUTH)
    const rolesAuth = Array.from(new Set(
      authEntries.map(e => e.role_name).filter(Boolean)
    ));

    // Roles locales de la app
    const rolesApp = await this.repository.findLocalRolesByUserId(user.user_id);

    // Combina ambos arrays sin duplicados
    const roles = Array.from(new Set([...rolesAuth, ...rolesApp]));

    // Elegimos un rol principal para compatibilidad legacy
    const primaryRole = rolesAuth[0] || user.role_name || null;

    const payload = {
      id: user.user_id,
      username: user.user_username,
      rolesAuth,    // Roles primarios
      rolesApp,     // Roles locales
      roles,        // Todos los roles combinados
    };

    const token = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn || '1h'
    });

    // Sanitizar usuario
    const { user_password, user_idrole, user_statusid, role_name, role, ...safeUser } = user;
    return { token, user: { ...safeUser, rolesAuth, rolesApp, roles, } };
  }
}

module.exports = DataloginService;
