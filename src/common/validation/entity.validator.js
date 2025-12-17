/**
 * EntityValidator - Sistema de validación genérico con AJV + JSON Schema
 * Valida req.body, req.params y req.query con separación de estructura y negocio
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const AppError = require('@utils/AppError');
const { syncRules, asyncRules } = require('./rules');

/**
 * Clase principal de validación
 */
class EntityValidator {
  /**
   * @param {object} config - Configuración del validador
   * @param {object} config.bodySchema - Schema para req.body
   * @param {object} config.paramsSchema - Schema para req.params
   * @param {object} config.querySchema - Schema para req.query
   * @param {object} config.rules - Reglas de negocio por campo
   * @param {object} config.context - Contexto adicional (ej: prisma)
   */
  constructor(config = {}) {
    const { 
      bodySchema, 
      paramsSchema, 
      querySchema, 
      rules = {}, 
      context = {} 
    } = config;

    this.bodySchema = bodySchema;
    this.paramsSchema = paramsSchema;
    this.querySchema = querySchema;
    this.rules = rules;
    this.context = context;

    // Configurar AJV
    this.ajv = new Ajv({ 
      allErrors: true, 
      useDefaults: true, 
      removeAdditional: 'failing',
      coerceTypes: true // Convertir tipos cuando sea posible
    });
    addFormats(this.ajv);

    // Compilar schemas
    this.bodyValidateFn = bodySchema ? this.ajv.compile(bodySchema) : null;
    this.paramsValidateFn = paramsSchema ? this.ajv.compile(paramsSchema) : null;
    this.queryValidateFn = querySchema ? this.ajv.compile(querySchema) : null;
  }

  /**
   * Valida estructuralmente con JSON Schema
   * @private
   */
  _schemaValidate(data, validateFn, source = 'data') {
    if (!validateFn || !data) return [];
    
    const ok = validateFn(data);
    if (ok) return [];

    return (validateFn.errors || []).map(e => {
      const field = e.instancePath 
        ? e.instancePath.replace(/^\//, '') 
        : e.params?.missingProperty || 'root';
      
      return {
        source,
        field,
        message: e.message,
        type: 'schema',
        raw: e
      };
    });
  }

  /**
   * Valida reglas de negocio
   * @private
   */
  async _businessValidate(data, source = 'body') {
    const errors = [];
    const ctx = { 
      data, 
      source,
      ...this.context 
    };

    // Iterar sobre reglas definidas
    for (const [field, fieldRules] of Object.entries(this.rules)) {
      const value = data[field];

      for (const [ruleName, ruleConfig] of Object.entries(fieldRules)) {
        // Buscar handler (primero en sync, luego en async)
        const handler = syncRules[ruleName] || asyncRules[ruleName];
        
        if (!handler) {
          errors.push({
            source,
            field,
            message: `Regla desconocida '${ruleName}'`,
            type: 'business',
            rule: ruleName
          });
          continue;
        }

        try {
          const result = handler(value, ruleConfig, ctx);
          const error = result instanceof Promise ? await result : result;
          
          if (error) {
            errors.push({
              source,
              field,
              message: error,
              type: 'business',
              rule: ruleName
            });
          }
        } catch (err) {
          errors.push({
            source,
            field,
            message: `Error en regla '${ruleName}': ${err.message}`,
            type: 'business',
            rule: ruleName,
            error: err
          });
        }
      }
    }

    return errors;
  }
  /**
   * Valida req.body
   */
  async validateBody(data) {
    const schemaErrors = this._schemaValidate(data, this.bodyValidateFn, 'body');
    if (schemaErrors.length > 0) {
      return { valid: false, errors: schemaErrors };
    }

    const businessErrors = await this._businessValidate(data, 'body');
    if (businessErrors.length > 0) {
      return { valid: false, errors: businessErrors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Valida req.params
   */
  validateParams(data) {
    const errors = this._schemaValidate(data, this.paramsValidateFn, 'params');
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida req.query
   */
  validateQuery(data) {
    const errors = this._schemaValidate(data, this.queryValidateFn, 'query');
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida todo (body + params + query)
   */
  async validateAll(req) {
    const allErrors = [];

    // Validar params (síncrono)
    if (this.paramsSchema && req.params) {
      const { errors } = this.validateParams(req.params);
      allErrors.push(...errors);
    }

    // Validar query (síncrono)
    if (this.querySchema && req.query) {
      const { errors } = this.validateQuery(req.query);
      allErrors.push(...errors);
    }

    // Validar body (asíncrono)
    if (this.bodySchema && req.body) {
      const { errors } = await this.validateBody(req.body);
      allErrors.push(...errors);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Formatea errores para respuesta API
   */
  static formatErrors(errors) {
    const grouped = errors.reduce((acc, err) => {
      const key = `${err.source}.${err.field}`;
      if (!acc[key]) {
        acc[key] = {
          source: err.source,
          field: err.field,
          messages: []
        };
      }
      acc[key].messages.push(err.message);
      return acc;
    }, {});

    return Object.values(grouped);
  }

  /**
   * Genera una respuesta de error formateada
   */
  static createErrorResponse(errors) {
    return {
      success: false,
      message: 'Error de validación',
      errors: this.formatErrors(errors)
    };
  }

  /**
   * Valida y lanza AppError si falla
   */
  async validateOrThrow(req, options = {}) {
    const { httpCode = 400 } = options;
    const result = await this.validateAll(req);
    
    if (!result.valid) {
      const response = EntityValidator.createErrorResponse(result.errors);
      try {
        if (process.env.VALIDATION_DEBUG === '1') {
          // Log detallado para diagnóstico rápido
          console.warn('[VALIDATION_DEBUG] Validation failed:', {
            route: req.originalUrl,
            method: req.method,
            errors: response.errors,
            body: req.body,
            params: req.params,
            query: req.query
          });
        }
      } catch {}
      throw new AppError(response.message, httpCode, response.errors);
    }

    return result;
  }
}

/**
 * Builder para crear validadores de forma fluida
 */
class ValidatorBuilder {
  constructor() {
    this.config = {
      rules: {},
      context: {}
    };
  }

  /**
   * Define schema para body
   */
  body(schema) {
    this.config.bodySchema = schema;
    return this;
  }

  /**
   * Define schema para params
   */
  params(schema) {
    this.config.paramsSchema = schema;
    return this;
  }

  /**
   * Define schema para query
   */
  query(schema) {
    this.config.querySchema = schema;
    return this;
  }

  /**
   * Define reglas de negocio
   */
  rules(rules) {
    this.config.rules = { ...this.config.rules, ...rules };
    return this;
  }

  /**
   * Agrega regla para un campo específico
   */
  addRule(field, ruleName, ruleConfig) {
    if (!this.config.rules[field]) {
      this.config.rules[field] = {};
    }
    this.config.rules[field][ruleName] = ruleConfig;
    return this;
  }

  /**
   * Define contexto (ej: prisma)
   */
  context(context) {
    this.config.context = { ...this.config.context, ...context };
    return this;
  }

  /**
   * Construye el validador
   */
  build() {
    return new EntityValidator(this.config);
  }
}

/**
 * Factory para crear validadores rápidamente
 */
class ValidatorFactory {
  /**
   * Crea validador para operación CREATE
   */
  static forCreate(schema, rules = {}, context = {}) {
    return new EntityValidator({
      bodySchema: schema,
      rules,
      context
    });
  }

  /**
   * Crea validador para operación UPDATE
   */
  static forUpdate(schema, rules = {}, context = {}) {
    return new EntityValidator({
      bodySchema: schema,
      rules,
      context
    });
  }

  /**
   * Crea validador con params estándar (id)
   */
  static withIdParam(bodySchema, rules = {}, context = {}) {
    return new EntityValidator({
      bodySchema,
      paramsSchema: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 }
        },
        required: ['id']
      },
      rules,
      context
    });
  }

  /**
   * Crea un builder
   */
  static builder() {
    return new ValidatorBuilder();
  }
}

module.exports = {
  EntityValidator,
  ValidatorBuilder,
  ValidatorFactory
};
