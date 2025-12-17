/**
 * Middleware genérico de validación para Express
 * Integra EntityValidator en el flujo de las rutas
 */

const { EntityValidator } = require('./entity.validator');
const AppError = require('@utils/AppError');

/**
 * Crea un middleware de validación desde un validador existente
 * 
 * @param {EntityValidator} validator - Instancia de EntityValidator
 * @param {object} options - Opciones del middleware
 * @returns {Function} Middleware de Express
 * 
 * @example
 * const validator = new EntityValidator({ bodySchema, rules });
 * router.post('/users', validate(validator), controller.create);
 */
function validate(validator, options = {}) {
  const { 
    throwOnError = true,
    sources = ['body', 'params', 'query'] // Qué validar
  } = options;

  return async (req, res, next) => {
    try {
      const errors = [];

      // Validar params si está configurado
      if (sources.includes('params') && validator.paramsSchema) {
        const result = validator.validateParams(req.params);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }

      // Validar query si está configurado
      if (sources.includes('query') && validator.querySchema) {
        const result = validator.validateQuery(req.query);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }

      // Validar body si está configurado
      if (sources.includes('body') && validator.bodySchema) {
        const result = await validator.validateBody(req.body);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }

      // Si hay errores
      if (errors.length > 0) {
        if (throwOnError) {
          const response = EntityValidator.createErrorResponse(errors);
          throw new AppError(response.message, 400, response.errors);
        } else {
          // Adjuntar errores a req para manejo posterior
          req.validationErrors = errors;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para validar solo req.body
 * 
 * @param {object} schema - JSON Schema para body
 * @param {object} rules - Reglas de negocio opcionales
 * @param {object} context - Contexto opcional (ej: prisma)
 * 
 * @example
 * router.post('/users', validateBody(createUserSchema, userRules), controller.create);
 */
function validateBody(schema, rules = {}, context = {}) {
  const validator = new EntityValidator({
    bodySchema: schema,
    rules,
    context
  });
  
  return validate(validator, { sources: ['body'] });
}

/**
 * Middleware para validar solo req.params
 * 
 * @example
 * router.get('/users/:id', validateParams({ id: { type: 'integer' } }), controller.getById);
 */
function validateParams(paramsDef) {
  const schema = {
    type: 'object',
    properties: paramsDef,
    required: Object.keys(paramsDef),
    additionalProperties: false
  };

  const validator = new EntityValidator({
    paramsSchema: schema
  });
  
  return validate(validator, { sources: ['params'] });
}

/**
 * Middleware para validar solo req.query
 * 
 * @example
 * router.get('/users', validateQuery({ page: { type: 'integer' } }), controller.getAll);
 */
function validateQuery(queryDef) {
  const schema = {
    type: 'object',
    properties: queryDef,
    additionalProperties: true // Permitir otros query params
  };

  const validator = new EntityValidator({
    querySchema: schema
  });
  
  return validate(validator, { sources: ['query'] });
}

/**
 * Middleware combinado para validar body + params + query
 * 
 * @param {object} config
 * @param {object} config.body - Schema para body
 * @param {object} config.params - Definición de params
 * @param {object} config.query - Definición de query
 * @param {object} config.rules - Reglas de negocio
 * @param {object} config.context - Contexto
 * 
 * @example
 * router.put('/users/:id', validateAll({
 *   params: { id: { type: 'integer' } },
 *   body: updateUserSchema,
 *   rules: userRules
 * }), controller.update);
 */
function validateAll(config = {}) {
  const { body, params, query, rules = {}, context = {} } = config;

  const validatorConfig = {
    rules,
    context
  };

  if (body) {
    validatorConfig.bodySchema = body;
  }

  if (params) {
    validatorConfig.paramsSchema = {
      type: 'object',
      properties: params,
      required: Object.keys(params),
      additionalProperties: false
    };
  }

  if (query) {
    validatorConfig.querySchema = {
      type: 'object',
      properties: query,
      additionalProperties: true
    };
  }

  const validator = new EntityValidator(validatorConfig);
  return validate(validator);
}

/**
 * Middleware de paginación estándar
 * Valida y normaliza page, limit, sortBy, sortOrder
 * 
 * @param {object} options
 * @param {number} options.maxLimit - Límite máximo
 * @param {number} options.defaultLimit - Límite por defecto
 * @param {array} options.allowedSortFields - Campos permitidos para ordenar
 * 
 * @example
 * router.get('/users', validatePagination({ maxLimit: 50 }), controller.getAll);
 */
function validatePagination(options = {}) {
  const { 
    maxLimit = 100, 
    defaultLimit = 10,
    allowedSortFields = [] 
  } = options;

  const queryDef = {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: maxLimit,
      default: defaultLimit
    },
    sortOrder: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'asc'
    }
  };

  if (allowedSortFields.length > 0) {
    queryDef.sortBy = {
      type: 'string',
      enum: allowedSortFields
    };
  } else {
    queryDef.sortBy = {
      type: 'string'
    };
  }

  return (req, res, next) => {
    // Aplicar defaults
    req.query.page = parseInt(req.query.page) || 1;
    req.query.limit = parseInt(req.query.limit) || defaultLimit;
    req.query.sortOrder = req.query.sortOrder || 'asc';

    // Limitar
    if (req.query.limit > maxLimit) {
      req.query.limit = maxLimit;
    }

    // Validar
    const middleware = validateQuery(queryDef);
    middleware(req, res, next);
  };
}

/**
 * Helper para crear middleware de validación de ID en params
 * 
 * @example
 * router.get('/users/:id', validateId(), controller.getById);
 * router.get('/posts/:postId/comments/:commentId', validateId(['postId', 'commentId']), ...);
 */
function validateId(paramNames = ['id']) {
  const params = {};
  
  if (typeof paramNames === 'string') {
    paramNames = [paramNames];
  }

  paramNames.forEach(name => {
    params[name] = { type: 'integer', minimum: 1 };
  });

  return validateParams(params);
}

/**
 * Middleware para sanitizar y normalizar datos
 * Se ejecuta después de validación
 * 
 * @param {object} config
 * @param {boolean} config.trimStrings - Eliminar espacios en blanco
 * @param {boolean} config.removeEmpty - Eliminar campos vacíos
 * @param {boolean} config.toLowerCase - Convertir strings a minúsculas
 * @param {array} config.fields - Campos específicos a procesar
 */
function sanitize(config = {}) {
  const {
    trimStrings = true,
    removeEmpty = false,
    toLowerCase = false,
    fields = null // null = todos los campos
  } = config;

  return (req, res, next) => {
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;

      Object.keys(obj).forEach(key => {
        // Si se especificaron campos, procesar solo esos
        if (fields && !fields.includes(key)) return;

        let value = obj[key];

        // Trimear strings
        if (trimStrings && typeof value === 'string') {
          value = value.trim();
        }

        // Convertir a minúsculas
        if (toLowerCase && typeof value === 'string') {
          value = value.toLowerCase();
        }

        // Eliminar vacíos
        if (removeEmpty && (value === '' || value === null || value === undefined)) {
          delete obj[key];
          return;
        }

        obj[key] = value;
      });

      return obj;
    };

    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);

    next();
  };
}

/**
 * Middleware para validar archivos subidos
 * 
 * @param {object} config
 * @param {boolean} config.required - Si el archivo es requerido
 * @param {array} config.allowedTypes - Tipos MIME permitidos
 * @param {number} config.maxSize - Tamaño máximo en bytes
 * @param {string} config.fieldName - Nombre del campo
 */
function validateFile(config = {}) {
  const {
    required = false,
    allowedTypes = [],
    maxSize = 5 * 1024 * 1024, // 5MB por defecto
    fieldName = 'file'
  } = config;

  return (req, res, next) => {
    const file = req.file || req.files?.[fieldName];

    if (!file) {
      if (required) {
        return next(new AppError('Archivo requerido', 400));
      }
      return next();
    }

    // Validar tipo
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return next(new AppError(
        `Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`,
        400
      ));
    }

    // Validar tamaño
    if (file.size > maxSize) {
      return next(new AppError(
        `Archivo muy grande. Máximo: ${maxSize / 1024 / 1024}MB`,
        400
      ));
    }

    next();
  };
}

module.exports = {
  // Middleware principal
  validate,
  
  // Helpers específicos
  validateBody,
  validateParams,
  validateQuery,
  validateAll,
  
  // Helpers comunes
  validatePagination,
  validateId,
  
  // Utilidades
  sanitize,
  validateFile
};
