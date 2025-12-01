module.exports = {
  GENERAL: {
    SUCCESS: {
      CREATED: 'Creado correctamente',
      UPDATED: 'Actualizado correctamente',
      DELETED: 'Eliminado correctamente',
      FETCH_SUCCESS: 'Consulta exitosa',
    },
    NOT_FOUND: {
      NOT_FOUND: 'No encontrado',
      EMPTY_RESULT: 'No se encontraron registros',
    },
    VALIDATION: {
      MISSING_FIELDS: 'Campos requeridos faltantes',
      INVALID_REQUEST: 'Solicitud inválida',
    },
    AUTHORIZATION: {
      UNAUTHORIZED: 'No autorizado',
      FORBIDDEN: 'Acceso denegado',
    },
    SERVER: {
      ERROR: 'Ocurrió un error inesperado',
      SERVER_ERROR: 'Error del servidor',
      CONFLICT: 'Conflicto al procesar la solicitud',
    },
  },

  AUTH: {
    SUCCESS: {
      LOGIN: 'Inicio de sesión exitoso',
      LOGOUT: 'Cierre de sesión exitoso',
      PASSWORD_UPDATED: 'Contraseña actualizada correctamente',
      PASSWORD_RESET_SENT: 'Instrucciones para restablecer contraseña enviadas',
    },
    ERROR: {
      INVALID_CREDENTIALS: 'Credenciales inválidas',
      USER_NOT_FOUND: 'Usuario no encontrado',
      USER_INACTIVE: 'Usuario inactivo',
      TOKEN_EXPIRED: 'Token expirado',
      TOKEN_INVALID: 'Token inválido',
      TOKEN_REQUIRED: 'Token requerido',
      PASSWORD_MISMATCH: 'Contraseña incorrecta',
      ACCOUNT_LOCKED: 'Cuenta bloqueada por intentos fallidos',
      SESSION_EXPIRED: 'Sesión expirada',
    },
  },

  USER: {
    SUCCESS: {
      PROFILE_UPDATED: 'Perfil actualizado correctamente',
      PROFILE_FETCHED: 'Perfil obtenido exitosamente',
      USER_CREATED: 'Usuario creado correctamente',
      USER_UPDATED: 'Usuario actualizado correctamente',
      USER_DELETED: 'Usuario eliminado correctamente',
      ACCOUNT_VERIFIED: 'Cuenta verificada correctamente',
      VERIFICATION_SENT: 'Correo de verificación enviado',
    },
    ERROR: {
      USER_NOT_FOUND: 'Usuario no encontrado',
      USER_ALREADY_EXISTS: 'El usuario ya existe',
      EMAIL_ALREADY_EXISTS: 'El correo electrónico ya está registrado',
      USERNAME_ALREADY_EXISTS: 'El nombre de usuario ya está en uso',
      INVALID_EMAIL: 'Correo electrónico inválido',
      INVALID_USERNAME: 'Nombre de usuario inválido',
      INVALID_PASSWORD: 'Contraseña inválida',
      VERIFICATION_EXPIRED: 'Enlace de verificación expirado',
      VERIFICATION_INVALID: 'Enlace de verificación inválido',
      PASSWORD_REQUIREMENTS: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número',
    },
  },

  USER_ROLE: {
    SUCCESS: {
      ROLE_ASSIGNED: 'Rol asignado correctamente',
      ROLE_REMOVED: 'Rol eliminado correctamente',
      ROLE_UPDATED: 'Rol actualizado correctamente',
    },
    ERROR: {
      NO_ROLES_FOUND: 'No se encontraron roles para este usuario',
      ROLE_NOT_FOUND: 'Rol no encontrado',
      ROLE_ALREADY_ASSIGNED: 'El usuario ya tiene asignado este rol',
      INVALID_ROLE: 'Rol inválido',
      ROLE_REQUIRED: 'Rol requerido',
      UNAUTHORIZED_ROLE: 'No tienes permiso para realizar esta acción',
    },
  },

  DASHBOARD: {
    SUCCESS: {
      FETCH_STATS: 'Estadísticas del dashboard obtenidas con éxito',
      FETCH_ASPECTOS: 'Promedios por aspecto obtenidos con éxito',
      FETCH_RANKING: 'Ranking de docentes obtenido con éxito',
      FETCH_PODIO: 'Podio de docentes obtenido con éxito',
    },
    ERROR: {
      MISSING_ID_CONFIGURACION: 'ID_CONFIGURACION es obligatorio',
    },
  },

  SWAGGER: {
    SUCCESS: {
      LOADED: 'swagger.generated.json cargado correctamente',
      FINAL_GENERATED: 'Swagger final generado correctamente',
    },
    WARN: {
      NOT_FOUND: 'No se encontró swagger.generated.json, usando solo swagger-jsdoc',
    },
    ERROR: {
      LOADING: 'Error cargando swagger.generated.json',
    },
  },
};
