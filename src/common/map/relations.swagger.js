const { extractSchemaFromPrisma } = require('../extractSchemaPrisma');
function buildRelationsDocs(options) {
  const {
    tagName,
    categoryPathBase,
    itemPluralPath,
    itemSchemaName,
    categorySchemaName,
    schema = {},
  } = options;

  // -----------------------------------------
  // Reutilizamos la lógica del CRUD
  // -----------------------------------------
  const buildProps = (schemaObj, filterFn = () => true) =>
    Object.fromEntries(
      Object.entries(schemaObj)
        .filter(([_, v]) => filterFn(v))
        .map(([k, v]) => [
          k,
          {
            type: v.type,
            ...(v.example ? { example: v.example } : {}),
            ...(v.nullable ? { nullable: true } : {}),
          },
        ])
    );

  // Extraer automáticamente el esquema del modelo Prisma para los ITEMS
  // Si falla o no existe, se usa el esquema provisto en 'schema' como fallback
  const extractedItemSchema = extractSchemaFromPrisma(itemSchemaName) || {};
  const itemSchemaSource = Object.keys(extractedItemSchema).length ? extractedItemSchema : schema;

  // Schema completo del item (para respuestas)
  const itemSchema = {
    type: 'object',
    properties: buildProps(itemSchemaSource)
  };

  // Schema para crear items (sin id, fechas, readonly)
  const writableItemProps = buildProps(itemSchemaSource, v => !v.readonly);

  const createItemInputSchema = {
    type: 'object',
    properties: writableItemProps
  };

  // -----------------------------------------
  // COMPONENTS
  // -----------------------------------------
  const components = {
    schemas: {
      [categorySchemaName]: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          fecha_creacion: { type: 'string', format: 'date-time' },
          fecha_actualizacion: { type: 'string', format: 'date-time' },
        },
      },

      [itemSchemaName]: itemSchema,

      [`Create${itemSchemaName}Input`]: createItemInputSchema
    },
  };

  // -----------------------------------------
  // PATHS
  // -----------------------------------------
  const basePath = `${categoryPathBase}`;
  const listPath = `${basePath}/{id}/${itemPluralPath}`;
  const deletePath = `${basePath}/{id}/${itemPluralPath}/{itemId}`;
  const createPath = `${basePath}/${itemPluralPath}`;

  const paths = {
    [listPath]: {
      get: {
        summary: `Listar ${itemPluralPath} asociados a una categoría`,
        tags: [tagName],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
            description: 'ID de la categoría',
          },
          {
            in: 'query',
            name: 'page',
            required: false,
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Página a consultar',
          },
          {
            in: 'query',
            name: 'limit',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            description: 'Cantidad de registros por página',
          },
          {
            in: 'query',
            name: 'sortBy',
            required: false,
            schema: { type: 'string', default: 'id' },
            description: 'Campo por el cual ordenar',
          },
          {
            in: 'query',
            name: 'sortOrder',
            required: false,
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            description: 'Dirección de ordenamiento',
          },
          {
            in: 'query',
            name: 'search',
            required: false,
            schema: { type: 'string' },
            description: 'Término de búsqueda (alias compatible: q)',
          },
        ],
        responses: {
          200: {
            description: `Lista de ${itemPluralPath}`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        categoria_id: { type: 'integer' },
                        items: {
                          type: 'array',
                          items: { $ref: `#/components/schemas/${itemSchemaName}` },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        pages: { type: 'integer' },
                        hasNext: { type: 'boolean' },
                        hasPrev: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    [deletePath]: {
      delete: {
        summary: `Eliminar la asociación de un ${itemSchemaName.toLowerCase()} a una categoría`,
        tags: [tagName],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' }, description: 'ID de la categoría' },
          { in: 'path', name: 'itemId', required: true, schema: { type: 'integer' }, description: `ID del ${itemSchemaName.toLowerCase()}` },
        ],
        responses: {
          200: {
            description: 'Asociación eliminada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: { deleted: { type: 'integer' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    [createPath]: {
      post: {
        summary: `Crear una categoría con ${itemPluralPath}`,
        tags: [tagName],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  categoryData: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      nombre: { type: 'string' },
                      descripcion: { type: 'string' },
                    },
                  },
                  itemData: {
                    type: 'array',
                    items: {
                      oneOf: [
                        { type: 'integer' },
                        { $ref: `#/components/schemas/Create${itemSchemaName}Input` },
                        {
                          type: 'object',
                          properties: { id: { type: 'integer' } }
                        }
                      ]
                    }
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: `Categoría y ${itemPluralPath} creados con éxito`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        category: { $ref: `#/components/schemas/${categorySchemaName}` },
                        items: {
                          type: 'array',
                          description: 'Items creados',
                          items: { $ref: `#/components/schemas/${itemSchemaName}` }
                        },
                        mappings: {
                          type: 'array',
                          description: 'Relaciones creadas categoría → item',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'integer' },
                              categoria_id: { type: 'integer' },
                              [`${itemSchemaName.toLowerCase()}_id`]: { type: 'integer' },
                              fecha_creacion: { type: 'string', format: 'date-time' },
                              fecha_actualizacion: { type: 'string', format: 'date-time' }
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return {
    tags: [{ name: tagName }],
    components,
    paths,
  };
}

module.exports = { buildRelationsDocs };
