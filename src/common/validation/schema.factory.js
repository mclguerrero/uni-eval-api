/**
 * Factory para crear schemas específicos por operación
 * Genera schemas de create, update, bulk, params, query desde schemas base
 */

const cloneDeep = require('lodash/cloneDeep');

/**
 * Factory de Schemas
 */
class SchemaFactory {
  /**
   * @param {object} baseSchema - Schema base generado desde Prisma
   */
  constructor(baseSchema) {
    this.baseSchema = baseSchema;
  }

  /**
   * Genera schema para operación CREATE
   * Mantiene todos los campos requeridos del schema base
   * 
   * @param {object} options - Opciones de personalización
   * @param {array} options.exclude - Campos a excluir (ej: ['id'])
   * @param {array} options.optional - Campos que deben ser opcionales
   * @param {object} options.override - Propiedades a sobrescribir
   * @returns {object} Schema para CREATE
   */
  forCreate(options = {}) {
    const { exclude = [], optional = [], override = {} } = options;
    
    const schema = cloneDeep(this.baseSchema);
    
    // Excluir campos (típicamente 'id' y timestamps)
    if (exclude.length > 0) {
      exclude.forEach(field => {
        delete schema.properties[field];
        if (schema.required) {
          schema.required = schema.required.filter(r => r !== field);
        }
      });
    }

    // Hacer campos opcionales
    if (optional.length > 0 && schema.required) {
      schema.required = schema.required.filter(r => !optional.includes(r));
    }

    // Sobrescribir propiedades específicas
    if (Object.keys(override).length > 0) {
      for (const [field, props] of Object.entries(override)) {
        if (schema.properties[field]) {
          schema.properties[field] = {
            ...schema.properties[field],
            ...props
          };
        }
      }
    }

    schema.title = `${schema.title || 'Entity'}Create`;
    schema.description = `Schema para crear ${schema.title}`;
    
    return schema;
  }

  /**
   * Genera schema para operación UPDATE
   * Todos los campos son opcionales y se validan solo los presentes
   * 
   * @param {object} options
   * @param {array} options.exclude - Campos a excluir
   * @param {object} options.override - Propiedades a sobrescribir
   * @returns {object} Schema para UPDATE
   */
  forUpdate(options = {}) {
    const { exclude = [], override = {} } = options;
    
    const schema = cloneDeep(this.baseSchema);
    
    // Remover required (todos los campos son opcionales en update)
    delete schema.required;
    
    // Excluir campos
    if (exclude.length > 0) {
      exclude.forEach(field => {
        delete schema.properties[field];
      });
    }

    // Sobrescribir propiedades
    if (Object.keys(override).length > 0) {
      for (const [field, props] of Object.entries(override)) {
        if (schema.properties[field]) {
          schema.properties[field] = {
            ...schema.properties[field],
            ...props
          };
        }
      }
    }

    schema.title = `${schema.title || 'Entity'}Update`;
    schema.description = `Schema para actualizar ${schema.title}`;
    schema.minProperties = 1; // Al menos un campo debe ser enviado
    
    return schema;
  }

  /**
   * Genera schema para operación BULK CREATE
   * Valida un array de objetos para crear en lote
   * 
   * @param {object} options
   * @param {number} options.minItems - Mínimo de items
   * @param {number} options.maxItems - Máximo de items
   * @param {object} options.itemOptions - Opciones para cada item (ver forCreate)
   * @returns {object} Schema para BULK
   */
  forBulkCreate(options = {}) {
    const { minItems = 1, maxItems = 100, itemOptions = {} } = options;
    
    const itemSchema = this.forCreate(itemOptions);
    
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: `${this.baseSchema.title || 'Entity'}BulkCreate`,
      description: `Schema para crear múltiples ${this.baseSchema.title}`,
      properties: {
        items: {
          type: 'array',
          items: itemSchema,
          minItems,
          maxItems,
          description: `Array de ${this.baseSchema.title} a crear`
        }
      },
      required: ['items'],
      additionalProperties: false
    };
  }

  /**
   * Genera schema para operación BULK UPDATE
   * 
   * @param {object} options
   * @param {number} options.minItems
   * @param {number} options.maxItems
   * @param {object} options.itemOptions
   * @returns {object} Schema para BULK UPDATE
   */
  forBulkUpdate(options = {}) {
    const { minItems = 1, maxItems = 100, itemOptions = {} } = options;
    
    const updateSchema = this.forUpdate(itemOptions);
    
    // Agregar campo 'id' como requerido para saber qué actualizar
    const itemSchema = {
      ...updateSchema,
      properties: {
        id: { type: 'integer', description: 'ID del registro a actualizar' },
        ...updateSchema.properties
      },
      required: ['id']
    };
    
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: `${this.baseSchema.title || 'Entity'}BulkUpdate`,
      description: `Schema para actualizar múltiples ${this.baseSchema.title}`,
      properties: {
        items: {
          type: 'array',
          items: itemSchema,
          minItems,
          maxItems,
          description: `Array de ${this.baseSchema.title} a actualizar`
        }
      },
      required: ['items'],
      additionalProperties: false
    };
  }

  /**
   * Genera schema para validar req.params
   * 
   * @param {object} paramsDef - Definición de parámetros
   * @example
   * forParams({
   *   id: { type: 'integer', minimum: 1 },
   *   slug: { type: 'string', pattern: '^[a-z0-9-]+$' }
   * })
   * @returns {object} Schema para params
   */
  static forParams(paramsDef) {
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: 'RouteParams',
      properties: paramsDef,
      required: Object.keys(paramsDef),
      additionalProperties: false
    };
  }

  /**
   * Genera schema para validar req.query
   * 
   * @param {object} queryDef - Definición de query params
   * @example
   * forQuery({
   *   page: { type: 'integer', minimum: 1, default: 1 },
   *   limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
   *   search: { type: 'string', minLength: 3 }
   * })
   * @returns {object} Schema para query
   */
  static forQuery(queryDef) {
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: 'QueryParams',
      properties: queryDef,
      additionalProperties: true // Permitir otros query params no definidos
    };
  }

  /**
   * Genera schema para paginación estándar
   */
  static forPagination(options = {}) {
    const { maxLimit = 100, defaultLimit = 10 } = options;
    
    return this.forQuery({
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Número de página'
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: maxLimit,
        default: defaultLimit,
        description: 'Cantidad de resultados por página'
      },
      sortBy: {
        type: 'string',
        description: 'Campo por el cual ordenar'
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'asc',
        description: 'Orden ascendente o descendente'
      },
      search: {
        type: 'string',
        minLength: 1,
        description: 'Término de búsqueda'
      }
    });
  }

  /**
   * Genera schema para filtros genéricos
   */
  static forFilters(filtersDef) {
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: 'Filters',
      properties: filtersDef,
      additionalProperties: false
    };
  }

  /**
   * Combina múltiples schemas (útil para validar body + params + query)
   */
  static combine(schemas, title = 'CombinedSchema') {
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title,
      allOf: schemas
    };
  }

  /**
   * Hace un campo específico requerido
   */
  makeRequired(fieldName) {
    const schema = cloneDeep(this.baseSchema);
    if (!schema.required) {
      schema.required = [];
    }
    if (!schema.required.includes(fieldName)) {
      schema.required.push(fieldName);
    }
    return new SchemaFactory(schema);
  }

  /**
   * Hace un campo específico opcional
   */
  makeOptional(fieldName) {
    const schema = cloneDeep(this.baseSchema);
    if (schema.required) {
      schema.required = schema.required.filter(f => f !== fieldName);
    }
    return new SchemaFactory(schema);
  }

  /**
   * Agrega un campo personalizado
   */
  addField(fieldName, fieldSchema) {
    const schema = cloneDeep(this.baseSchema);
    if (!schema.properties) {
      schema.properties = {};
    }
    schema.properties[fieldName] = fieldSchema;
    return new SchemaFactory(schema);
  }

  /**
   * Remueve un campo
   */
  removeField(fieldName) {
    const schema = cloneDeep(this.baseSchema);
    delete schema.properties[fieldName];
    if (schema.required) {
      schema.required = schema.required.filter(f => f !== fieldName);
    }
    return new SchemaFactory(schema);
  }

  /**
   * Pick: selecciona solo ciertos campos
   */
  pick(fields) {
    const schema = cloneDeep(this.baseSchema);
    const newProperties = {};
    
    fields.forEach(field => {
      if (schema.properties[field]) {
        newProperties[field] = schema.properties[field];
      }
    });
    
    schema.properties = newProperties;
    
    if (schema.required) {
      schema.required = schema.required.filter(f => fields.includes(f));
    }
    
    return new SchemaFactory(schema);
  }

  /**
   * Omit: excluye ciertos campos
   */
  omit(fields) {
    const schema = cloneDeep(this.baseSchema);
    
    fields.forEach(field => {
      delete schema.properties[field];
    });
    
    if (schema.required) {
      schema.required = schema.required.filter(f => !fields.includes(f));
    }
    
    return new SchemaFactory(schema);
  }

  /**
   * Partial: hace todos los campos opcionales
   */
  partial() {
    const schema = cloneDeep(this.baseSchema);
    delete schema.required;
    return new SchemaFactory(schema);
  }

  /**
   * Required: hace todos los campos requeridos
   */
  required() {
    const schema = cloneDeep(this.baseSchema);
    schema.required = Object.keys(schema.properties || {});
    return new SchemaFactory(schema);
  }

  /**
   * Obtiene el schema actual
   */
  build() {
    return this.baseSchema;
  }
}

/**
 * Helper para cargar schemas base generados
 */
class SchemaLoader {
  constructor(schemasDir) {
    this.schemasDir = schemasDir;
    this.cache = new Map();
  }

  /**
   * Carga un schema base por nombre de modelo
   */
  load(modelName) {
    if (this.cache.has(modelName)) {
      return this.cache.get(modelName);
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(this.schemasDir, `${modelName}.schema.json`);
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      
      this.cache.set(modelName, schema);
      return schema;
    } catch (error) {
      throw new Error(`No se pudo cargar schema para '${modelName}': ${error.message}`);
    }
  }

  /**
   * Carga y crea factory en un solo paso
   */
  factory(modelName) {
    const schema = this.load(modelName);
    return new SchemaFactory(schema);
  }

  /**
   * Limpia el cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = {
  SchemaFactory,
  SchemaLoader
};
