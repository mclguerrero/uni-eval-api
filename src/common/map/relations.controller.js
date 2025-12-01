const { prisma } = require('@config/prisma');
const { extractSchemaFromPrisma } = require('../extractSchemaPrisma');
const { successResponse } = require('@utils/responseHandler');
const MESSAGES = require('@constants/messages');

function createRelationsController(config) {
  const {
    categoryModel,
    itemModel,
    mapModel,
    categoryIdField,
    itemIdField,
    itemSchemaName,
    itemOutputFields
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

      const mappings = await prisma[mapModel].findMany({
        where: { [categoryIdField]: categoriaId },
        include: { [itemModel]: true }
      });

      const items = mappings.map(m => {
        const a = m[itemModel];
        const out = { map_id: m.id };
        outputFields.forEach(f => { out[f] = a[f]; });
        return out;
      });

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
        const itemPromises = itemData.map(async (item) => {
          if (item.id) {
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
            if (!item.nombre) {
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
