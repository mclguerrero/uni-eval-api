const { localPrisma } = require('../../../../../prisma/clients');

/**
 * Devuelve todas las keys del usuario (sin exponer api_key_enc).
 * Incluye nombre del proveedor y del modelo.
 */
async function findByUser(userId) {
  return localPrisma.user_ai_key.findMany({
    where: { user_id: Number(userId) },
    select: {
      id: true,
      provider_id: true,
      model_id: true,
      base_url: true,
      es_activa: true,
      es_default: true,
      fecha_creacion: true,
      fecha_actualizacion: true,
      ai_provider: { select: { id: true, nombre: true, requiere_url: true } },
      ai_model:    { select: { id: true, model_id: true } },
    },
    orderBy: [{ es_default: 'desc' }, { fecha_creacion: 'desc' }],
  });
}

/** Devuelve una key con api_key_enc para uso interno (descifrado). */
async function findRawById(id, userId) {
  return localPrisma.user_ai_key.findFirst({
    where: { id: Number(id), user_id: Number(userId) },
    include: {
      ai_provider: true,
      ai_model: true,
    },
  });
}

/**
 * Devuelve la key activa y predeterminada del usuario.
 * Si providerId se indica, filtra por ese proveedor.
 */
async function findDefaultByUser(userId, providerId = null) {
  const where = {
    user_id: Number(userId),
    es_activa: true,
    es_default: true,
  };
  if (providerId) where.provider_id = Number(providerId);

  return localPrisma.user_ai_key.findFirst({
    where,
    include: {
      ai_provider: true,
      ai_model: true,
    },
  });
}

async function create(data) {
  return localPrisma.user_ai_key.create({ data });
}

async function update(id, userId, data) {
  return localPrisma.user_ai_key.updateMany({
    where: { id: Number(id), user_id: Number(userId) },
    data,
  });
}

async function remove(id, userId) {
  return localPrisma.user_ai_key.deleteMany({
    where: { id: Number(id), user_id: Number(userId) },
  });
}

/** Quita es_default de todas las keys del usuario para un proveedor dado. */
async function clearDefault(userId, providerId) {
  return localPrisma.user_ai_key.updateMany({
    where: { user_id: Number(userId), provider_id: Number(providerId) },
    data: { es_default: false },
  });
}

module.exports = {
  findByUser,
  findRawById,
  findDefaultByUser,
  create,
  update,
  remove,
  clearDefault,
};
