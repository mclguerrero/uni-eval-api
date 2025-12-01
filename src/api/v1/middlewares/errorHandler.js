// src/middleware/errorHandler.js

const logger = require('@config/logger_config');
const { errorResponse } = require('@utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  const log = logger.withRequest(req);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  /**
   * ==========================
   *  Prisma Error Codes
   * ==========================
   * Documentación:
   * https://www.prisma.io/docs/reference/api-reference/error-reference
   */

  // 🔹 Error: violación de campo único (duplicados)
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'El registro ya existe (campo único duplicado)';
  }

  // 🔹 Error: registro no encontrado
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Recurso no encontrado';
  }

  // 🔹 Error: fallo de relación (foreign key)
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Relación inválida: posible clave foránea inexistente';
  }

  // 🔹 Error: valor requerido faltante
  if (err.code === 'P2012') {
    statusCode = 400;
    message = 'Falta un valor requerido';
  }

  // 🔹 Error: tipo de dato incorrecto
  if (err.code === 'P2004') {
    statusCode = 400;
    message = 'Valor incorrecto para el tipo de dato';
  }

  /**
   * ==========================
   *  MySQL Errors
   * ==========================
   */

  // Clave duplicada MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Recurso duplicado';
  }

  // Error de clave foránea
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'La relación referida no existe (clave foránea inválida)';
  }

  /**
   * ==========================
   *  Errores comunes de Auth
   * ==========================
   */

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Token inválido o expirado';
  }

  if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Acceso prohibido';
  }

  /**
   * ============================
   * Logging según criticidad
   * ============================
   */

  if (statusCode >= 500) {
    log.error(`❌ Error interno [${statusCode}] ${req.method} ${req.originalUrl}`, err);
  } else {
    log.warn(`⚠️ Error controlado [${statusCode}] ${req.method} ${req.originalUrl}: ${message}`);
  }

  /**
   * ==========================
   *  Respuesta estructurada
   * ==========================
   */

  return errorResponse(res, {
    code: statusCode,
    message,
    error:
      process.env.NODE_ENV === 'development'
        ? { message: err.message, stack: err.stack }
        : undefined,
  });
};

module.exports = errorHandler;
