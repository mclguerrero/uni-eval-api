const { successResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

class DataloginController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const data = await this.service.getAll();
      const sanitized = data.map(({ user_password, ...rest }) => rest);
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: sanitized
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getById(Number(req.params.id));
      const { user_password, ...rest } = data;
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: rest
      });
    } catch (err) {
      next(err);
    }
  };

  getByUsername = async (req, res, next) => {
    try {
      const data = await this.service.getByUsername(req.params.username);
      const { user_password, user_idrole, user_statusid, role_name, role, ...rest } = data;
      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: rest
      });
    } catch (err) {
      next(err);
    }
  }; 

  #setRefreshCookie(res, token, expiresAt) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/api/v1/auth',
    });
  }

  #clearRefreshCookie(res) {
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  }

  // POST /auth/login
  login = async (req, res, next) => {
    try {
      const username = req.body.username || req.body.user_username;
      const password = req.body.password || req.body.user_password || req.body.user_passwword;
      const { refreshToken, jti, refreshExpiresAt, ...result } = await this.service.login(username, password);
      this.#setRefreshCookie(res, refreshToken, refreshExpiresAt);
      return successResponse(res, {
        message: MESSAGES.AUTH.SUCCESS.LOGIN,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /auth/refresh
  refresh = async (req, res, next) => {
    try {
      const userId = Number(req.body.user_id || req.body.id || req.user?.id);
      const token = req.cookies?.refresh_token || req.body.refresh_token;
      const { refreshToken, jti, refreshExpiresAt, ...result } = await this.service.refresh(userId, token);
      this.#setRefreshCookie(res, refreshToken, refreshExpiresAt);
      return successResponse(res, {
        message: 'Token renovado',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /auth/logout
  logout = async (req, res, next) => {
    try {
      const userId = req.user?.id || Number(req.body.user_id || req.body.id);
      const result = await this.service.logout(userId);
      this.#clearRefreshCookie(res);
      return successResponse(res, {
        message: result.message,
        data: { revoked: true }
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = DataloginController;
