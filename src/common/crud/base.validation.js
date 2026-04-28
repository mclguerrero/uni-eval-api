/**
 * Sistema de validación integrado con el CRUD genérico
 * Crea validadores automáticamente desde los schemas generados
 */

const path = require('path');
const { SchemaLoader, SchemaFactory } = require('@common/validation/schema.factory');
const { EntityValidator } = require('@common/validation/entity.validator');
const { validate, validateId } = require('@common/validation/validation.middleware');
const pagination = require('@middlewares/http/pagination');
const sort = require('@middlewares/http/sort');
const search = require('@middlewares/http/search');
const { prisma } = require('@config/prisma');

// Loader global para schemas
const schemasDir = path.join(__dirname, '../../../scripts/generated/schemas');
let schemaLoader;

try {
  schemaLoader = new SchemaLoader(schemasDir);
} catch (error) {
  console.warn('⚠️  No se pudieron cargar schemas. Ejecuta: npm run generate:schemas');
  schemaLoader = null;
}

/**
 * Crea validadores automáticos para un modelo
 * 
 * @param {string} modelName - Nombre del modelo en Prisma
 * @param {object} customRules - Reglas de negocio personalizadas
 * @param {object} options - Opciones adicionales
 * @returns {object} Objeto con validators y middlewares
 * 
 * @example
 * const aspectoValidation = createValidation('aspecto', {
 *   nombre: {
 *     alphaNumericSpanish: true,
 *     stringLength: { min: 3, max: 100 }
 *   }
 * });
 */
function createValidation(modelName, customRules = {}, options = {}) {
  const {
    excludeFields = ['id', 'fecha_creacion', 'fecha_actualizacion'],
    context = { prisma },
    searchFields = [],
    searchOptions = {},
    sortOptions = {}
  } = options;

  // Si no hay loader, retornar validadores vacíos
  if (!schemaLoader) {
    console.warn(`⚠️  Validación deshabilitada para '${modelName}' (schemas no generados)`);
    return {
      validators: {},
      middlewares: {},
      schemas: {},
      booleanFields: []
    };
  }

  try {
    // Cargar schema base
    const baseSchema = schemaLoader.load(modelName);
    const booleanFields = Object.entries(baseSchema.properties || {})
      .filter(([_, def]) => def && def.type === 'boolean')
      .map(([name]) => name);
    const factory = new SchemaFactory(baseSchema);

    // Generar schemas por operación
    const createSchema = factory.forCreate({ exclude: excludeFields });
    const updateSchema = factory.forUpdate({ exclude: excludeFields });
    const bulkCreateSchema = factory.forBulkCreate({
      minItems: 1,
      maxItems: 100,
      itemOptions: { exclude: excludeFields }
    });

    // Crear validadores
    const createValidator = new EntityValidator({
      bodySchema: createSchema,
      rules: customRules,
      context
    });

    const updateValidator = new EntityValidator({
      bodySchema: updateSchema,
      paramsSchema: SchemaFactory.forParams({
        id: { type: 'integer', minimum: 1 }
      }),
      rules: customRules,
      context
    });

    const toggleValidator = booleanFields.length > 0
      ? new EntityValidator({
        paramsSchema: SchemaFactory.forParams({
          id: { type: 'integer', minimum: 1 },
          field: { type: 'string', enum: booleanFields }
        }),
        context
      })
      : null;

    const bulkValidator = new EntityValidator({
      bodySchema: bulkCreateSchema,
      context
    });

    // Crear middlewares listos para usar
    const middlewares = {
      create: validate(createValidator),
      update: validate(updateValidator),
      delete: validateId(),
      getById: validateId(),
      getAll: [
        pagination({ maxLimit: 100 }),
        sort(sortOptions),
        search({ searchFields, ...searchOptions })
      ],
      bulk: validate(bulkValidator),
      toggle: toggleValidator ? validate(toggleValidator) : null
    };

    return {
      validators: {
        create: createValidator,
        update: updateValidator,
        bulk: bulkValidator,
        toggle: toggleValidator || undefined
      },
      middlewares,
      schemas: {
        create: createSchema,
        update: updateSchema,
        bulk: bulkCreateSchema
      },
      booleanFields
    };
  } catch (error) {
    console.warn(`⚠️  Error creando validación para '${modelName}': ${error.message}`);
    return {
      validators: {},
      middlewares: {},
      schemas: {},
      booleanFields: []
    };
  }
}

/**
 * Extiende createCrudModule con validación automática
 * 
 * @param {object} crudConfig - Configuración del CRUD
 * @param {object} validationConfig - Configuración de validación
 * @returns {object} CRUD module con validación
 * 
 * @example
 * const aspecto = createValidatedCrud({
 *   name: 'aspecto',
 *   route: '/aspecto',
 *   displayName: 'Aspecto',
 *   schemaName: 'Aspecto'
 * }, {
 *   rules: {
 *     nombre: {
 *       onlyLetters: { allowSpaces: true },
 *       stringLength: { min: 3, max: 100 }
 *     }
 *   }
 * });
 */
function createValidatedCrud(crudConfig, validationConfig = {}, routerConfig = {}) {
  const { createCrudModule } = require('./base');
  const { name } = crudConfig;
  const { rules = {}, excludeFields, context } = validationConfig;
  const { searchFields, searchOptions, sortOptions } = routerConfig;

  // Crear CRUD base
  // Primero construir la validación para poder inyectarla al router
  const validation = createValidation(name, rules, {
    excludeFields,
    context,
    searchFields,
    searchOptions,
    sortOptions
  });
  const booleanFields = validation.booleanFields || [];

  const crud = createCrudModule(crudConfig, null, { ...routerConfig, validation, booleanFields });

  // Adjuntar validación también al objeto retornado para fácil acceso

  return {
    ...crud,
    validation,
    // Alias para fácil acceso
    validators: validation.validators,
    middlewares: validation.middlewares,
    schemas: validation.schemas
  };
}

/**
 * Agrega middlewares de validación a un router existente
 * Útil para CRUDs ya creados
 * 
 * @param {Router} router - Router de Express
 * @param {object} middlewares - Middlewares de validación
 * @param {object} options - Opciones de aplicación
 * 
 * @example
 * const { router } = createCrudModule({ name: 'aspecto' });
 * const { middlewares } = createValidation('aspecto', rules);
 * applyValidationToRouter(router, middlewares);
 */
function applyValidationToRouter(router, middlewares, options = {}) {
  const { only = [], except = [] } = options;

  const shouldApply = (operation) => {
    if (only.length > 0) return only.includes(operation);
    if (except.length > 0) return !except.includes(operation);
    return true;
  };

  // Obtener las rutas actuales
  const routes = router.stack
    .filter(layer => layer.route)
    .map(layer => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
      layer
    }));

  // Agregar validación a cada ruta según corresponda
  routes.forEach(({ path, methods, layer }) => {
    if (path === '/' && methods.includes('post') && shouldApply('create')) {
      // POST / -> create
      if (middlewares.create) {
        layer.route.stack.unshift({
          handle: middlewares.create,
          name: 'validationMiddleware',
          method: 'post'
        });
      }
    } else if (path === '/:id' && methods.includes('put') && shouldApply('update')) {
      // PUT /:id -> update
      if (middlewares.update) {
        layer.route.stack.unshift({
          handle: middlewares.update,
          name: 'validationMiddleware',
          method: 'put'
        });
      }
    } else if (path === '/:id' && methods.includes('get') && shouldApply('getById')) {
      // GET /:id -> getById
      if (middlewares.getById) {
        layer.route.stack.unshift({
          handle: middlewares.getById,
          name: 'validationMiddleware',
          method: 'get'
        });
      }
    } else if (path === '/:id' && methods.includes('delete') && shouldApply('delete')) {
      // DELETE /:id -> delete
      if (middlewares.delete) {
        layer.route.stack.unshift({
          handle: middlewares.delete,
          name: 'validationMiddleware',
          method: 'delete'
        });
      }
    } else if (path === '/' && methods.includes('get') && shouldApply('getAll')) {
      // GET / -> getAll
      if (middlewares.getAll) {
        layer.route.stack.unshift({
          handle: middlewares.getAll,
          name: 'validationMiddleware',
          method: 'get'
        });
      }
    } else if (path === '/:id/toggle/:field' && methods.includes('patch') && shouldApply('toggle')) {
      // PATCH /:id/toggle/:field -> toggleBoolean
      if (middlewares.toggle) {
        layer.route.stack.unshift({
          handle: middlewares.toggle,
          name: 'validationMiddleware',
          method: 'patch'
        });
      }
    }
  });

  return router;
}

module.exports = {
  createValidation,
  createValidatedCrud,
  applyValidationToRouter,
  schemaLoader
};
