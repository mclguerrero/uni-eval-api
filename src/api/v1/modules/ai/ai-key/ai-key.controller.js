const service = require('./ai-key.service');
const { successResponse } = require('@utils/responseHandler');
const { localPrisma } = require('../../../../../prisma/clients');

async function listKeys(req, res, next) {
  try {
    const data = await service.listKeys(req.user.id);
    successResponse(res, { message: 'API keys obtenidas', data });
  } catch (err) { next(err); }
}

async function createKey(req, res, next) {
  try {
    const data = await service.createKey(req.user.id, req.body);
    successResponse(res, { code: 201, message: 'API key registrada', data });
  } catch (err) { next(err); }
}

async function updateKey(req, res, next) {
  try {
    const data = await service.updateKey(req.params.id, req.user.id, req.body);
    successResponse(res, { message: 'API key actualizada', data });
  } catch (err) { next(err); }
}

async function deleteKey(req, res, next) {
  try {
    await service.deleteKey(req.params.id, req.user.id);
    successResponse(res, { message: 'API key eliminada', data: null });
  } catch (err) { next(err); }
}

async function setDefault(req, res, next) {
  try {
    const data = await service.setDefault(req.params.id, req.user.id);
    successResponse(res, { message: 'API key marcada como predeterminada', data });
  } catch (err) { next(err); }
}

async function validateKey(req, res, next) {
  try {
    const data = await service.validateKey(req.params.id, req.user.id);
    successResponse(res, { message: 'Resultado de validación', data });
  } catch (err) { next(err); }
}

async function listProviders(_req, res, next) {
  try {
    const data = await localPrisma.ai_provider.findMany({
      where: { es_activo: true },
      include: {
        ai_model: {
          where: { es_activo: true },
          select: { id: true, model_id: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
    successResponse(res, { message: 'Proveedores de IA', data });
  } catch (err) { next(err); }
}

module.exports = { listKeys, createKey, updateKey, deleteKey, setDefault, validateKey, listProviders };
