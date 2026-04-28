const { prisma } = require('@config/prisma');
const { extractSchemaFromPrisma } = require('../extractSchemaPrisma');
const { successResponse, successPaginatedResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

function createRelationsController(config) {
  const {
    categoryModel,
    itemModel,
    mapModel,
    categoryIdField,
    itemIdField,
    itemSchemaName,
    itemOutputFields,
    searchFields = [],
    sortableFields = []
  } = config;

  // Derivar automáticamente los campos del ITEM desde Prisma si se provee itemSchemaName
  // Incluye solo campos escalares; útil para que las respuestas de listado tengan todas las propiedades.
  let derivedItemFields = [];
  try {
    if (itemSchemaName) {
      const schemaMap = extractSchemaFromPrisma(itemSchemaName) || {};
      derivedItemFields = Object.keys(schemaMap);
    }
  } catch (_) {
    derivedItemFields = [];
  }
  // Si no hay extracción disponible, usar los campos proporcionados o un conjunto básico
  const outputFields = Array.isArray(itemOutputFields) && itemOutputFields.length
    ? itemOutputFields
    : (derivedItemFields.length ? derivedItemFields : [
        'id',
        'nombre',
        'descripcion',
        'fecha_creacion',
        'fecha_actualizacion'
      ]);

  const defaultSearchFields = Array.isArray(searchFields) && searchFields.length
    ? searchFields
    : ['nombre', 'descripcion', 'sigla'].filter(field => outputFields.includes(field));

  const defaultSortableFields = Array.isArray(sortableFields) && sortableFields.length
    ? sortableFields
    : ['id', 'nombre', 'descripcion', 'sigla', 'fecha_creacion', 'fecha_actualizacion']
      .filter(field => outputFields.includes(field) || field === 'id');

  // -----------------------------------------
  // GET /:id/items
  // -----------------------------------------
  const listItems = async (req, res, next) => {
    try {
      const categoriaId = Number(req.params.id);
      if (isNaN(categoriaId)) {
        throw {
          status: 400,
          message: MESSAGES.GENERAL.ERROR.INVALID_ID
        };
      }

      const pagination = req.pagination;
      const hasPagination = pagination
        && Number.isFinite(pagination.page)
        && Number.isFinite(pagination.limit)
        && Number.isFinite(pagination.skip);

      const rawSortBy = req.sort && req.sort.sortBy ? req.sort.sortBy : 'id';
      const sortOrder = req.sort && req.sort.sortOrder === 'asc' ? 'asc' : 'desc';
      const allowedSortFields = new Set(['id', 'map_id', ...defaultSortableFields]);
      const sortBy = allowedSortFields.has(rawSortBy) ? rawSortBy : 'id';

      const activeSearchFields = Array.isArray(req.search && req.search.fields) && req.search.fields.length
        ? req.search.fields.filter(field => defaultSearchFields.includes(field))
        : defaultSearchFields;

      const where = { [categoryIdField]: categoriaId };

      if (req.search && req.search.isActive && req.search.term && activeSearchFields.length) {
        const mode = req.search.caseSensitive ? undefined : 'insensitive';
        const searchMode = req.search.mode || 'startsWith';

        const buildFilter = (field) => {
          if (searchMode === 'equals') {
            return { [field]: req.search.term };
          }

          if (searchMode === 'contains') {
            return { [field]: { contains: req.search.term, ...(mode ? { mode } : {}) } };
          }

          return { [field]: { startsWith: req.search.term, ...(mode ? { mode } : {}) } };
        };

        where[itemModel] = {
          is: {
            OR: activeSearchFields.map(buildFilter)
          }
        };
      }

      const orderBy = [];

      if (sortBy === 'map_id') {
        orderBy.push({ id: sortOrder });
      } else {
        orderBy.push({ [itemModel]: { [sortBy]: sortOrder } });
      }

      if (!(sortBy === 'id' && sortOrder === 'desc')) {
        orderBy.push({ [itemModel]: { id: 'desc' } });
      }

      const baseQuery = {
        where,
        include: { [itemModel]: true },
        orderBy
      };

      const dataQuery = hasPagination
        ? { ...baseQuery, skip: pagination.skip, take: pagination.limit }
        : baseQuery;

      const [mappings, total] = await Promise.all([
        prisma[mapModel].findMany(dataQuery),
        prisma[mapModel].count({ where })
      ]);

      const items = mappings.map(m => {
        const a = m[itemModel];
        const out = { map_id: m.id };
        outputFields.forEach(f => { out[f] = a[f]; });
        return out;
      });

      if (hasPagination) {
        const pages = Math.ceil(total / pagination.limit) || 1;
        return successPaginatedResponse(res, {
          message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
          data: { categoria_id: categoriaId, items },
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            pages,
            hasNext: pagination.page < pages,
            hasPrev: pagination.page > 1,
          }
        });
      }

      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.FETCH_SUCCESS,
        data: { categoria_id: categoriaId, items }
      });
    } catch (err) {
      next(err);
    }
  };

  // -----------------------------------------
  // DELETE /:id/items/:itemId
  // -----------------------------------------
  const removeItemFromCategory = async (req, res, next) => {
    try {
      const categoriaId = Number(req.params.id);
      const itemID = Number(req.params.itemId);

      if (isNaN(categoriaId) || isNaN(itemID)) {
        throw {
          status: 400,
          message: MESSAGES.GENERAL.ERROR.INVALID_ID
        };
      }

      const deleted = await prisma[mapModel].deleteMany({
        where: { [categoryIdField]: categoriaId, [itemIdField]: itemID }
      });

      if (deleted.count === 0) {
        throw {
          status: 404,
          message: MESSAGES.GENERAL.ERROR.NOT_FOUND
        };
      }

      return successResponse(res, {
        message: MESSAGES.GENERAL.SUCCESS.DELETED,
        data: { deleted: deleted.count }
      });
    } catch (err) {
      next(err);
    }
  };

  // -----------------------------------------
  // POST /items
  // -----------------------------------------
  const createCategoryMap = async (req, res, next) => {
    try {
      const { categoryData, itemData } = req.body;

      if (!categoryData || !itemData || !Array.isArray(itemData)) {
        throw {
          status: 400,
          message: 'Estructura inválida: requiere categoryData y itemData[]'
        };
      }

      if (!categoryData.id && !categoryData.nombre) {
        throw {
          status: 400,
          message: 'Se requiere categoryData.id (existente) o categoryData.nombre (nuevo)'
        };
      }

      const normalizedItems = itemData.map((item) => {
        if (typeof item === 'number') return { id: item };
        if (item && typeof item === 'object' && typeof item.id === 'number') return item;
        return item;
      });

      const transaction = await prisma.$transaction(async (tx) => {
        let category;

        // --- Categoria existente o nueva ---
        if (categoryData.id) {
          category = await tx[categoryModel].findUnique({
            where: { id: categoryData.id }
          });
          if (!category) {
            throw {
              status: 404,
              message: `La categoría con ID ${categoryData.id} no existe.`
            };
          }
        } else {
          category = await tx[categoryModel].findFirst({
            where: { nombre: categoryData.nombre }
          });
          if (!category) {
            category = await tx[categoryModel].create({
              data: {
                nombre: categoryData.nombre,
                descripcion: categoryData.descripcion || null
              }
            });
          }
        }

        // --- Procesar ítems ---
        const itemPromises = normalizedItems.map(async (item) => {
          if (item && typeof item.id === 'number') {
            const existingItem = await tx[itemModel].findUnique({
              where: { id: item.id }
            });
            if (!existingItem) {
              throw {
                status: 404,
                message: `El elemento con ID ${item.id} no existe.`
              };
            }

            return tx[mapModel].create({
              data: {
                [categoryIdField]: category.id,
                [itemIdField]: existingItem.id
              }
            });
          } else {
            if (!item || !item.nombre) {
              throw {
                status: 400,
                message: 'Cada elemento nuevo requiere el campo "nombre".'
              };
            }

            const newItem = await tx[itemModel].create({
              data: {
                nombre: item.nombre,
                descripcion: item.descripcion || null,
                ...(item.sigla ? { sigla: item.sigla } : {}),
                ...(typeof item.es_evaluacion === 'boolean' ? { es_evaluacion: item.es_evaluacion } : {}),
                ...(typeof item.activo === 'boolean' ? { activo: item.activo } : {})
              }
            });

            return tx[mapModel].create({
              data: {
                [categoryIdField]: category.id,
                [itemIdField]: newItem.id
              }
            });
          }
        });

        const createdMappings = await Promise.all(itemPromises);

        const categoryOut = {
          id: category.id,
          nombre: category.nombre,
          descripcion: category.descripcion,
          fecha_creacion: category.fecha_creacion,
          fecha_actualizacion: category.fecha_actualizacion
        };

        return { category: categoryOut, mappings: createdMappings };
      });

      return successResponse(res, {
        code: 201,
        message: MESSAGES.GENERAL.SUCCESS.CREATED,
        data: transaction
      });
    } catch (err) {
      next(err);
    }
  };

  return {
    listItems,
    removeItemFromCategory,
    createCategoryMap
  };
}

module.exports = { createRelationsController };
