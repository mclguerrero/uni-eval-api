const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');

class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  // Remueve campos reservados que no deben aceptarse por escritura
  sanitizeWriteData(data) {
    if (!data || typeof data !== 'object') return data;
    const reserved = new Set([
      'id', 'ID', 'Id',
      'createdAt', 'updatedAt', 'created_at', 'updated_at',
      'fecha_creacion', 'fecha_actualizacion', 'fechaCreacion', 'fechaActualizacion',
      'creado_en', 'actualizado_en'
    ]);
    const clean = {};
    for (const [k, v] of Object.entries(data)) {
      if (reserved.has(k)) continue;
      clean[k] = v;
    }
    return clean;
  }

  async getAll(pagination) {
    if (!pagination) {
      const data = await this.repository.findAll();
      return { data };
    }
    const { skip, limit, page } = pagination;
    const { items, total } = await this.repository.findPaginated({ skip, limit });
    const pages = Math.ceil(total / limit) || 1;
    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  async getById(id) {
    const item = await this.repository.findById(id);
    if (!item) throw new AppError(MESSAGES.GENERAL.NOT_FOUND.NOT_FOUND, 404);
    return item;
  }

  create(data) {
    const clean = this.sanitizeWriteData(data);
    this.normalizeDateOnlyFields(clean);
    return this.repository.create(clean);
  }

  async update(id, data) {
    await this.getById(id);
    const clean = this.sanitizeWriteData(data);
    this.normalizeDateOnlyFields(clean);
    return this.repository.update(id, clean);
  }

  async delete(id) {
    await this.getById(id);
    return this.repository.delete(id);
  }
}

// Añade métodos al prototipo sin romper referencia de clase
BaseService.prototype.normalizeDateOnlyFields = function (obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/; // Formato YYYY-MM-DD
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && dateOnlyRegex.test(v)) {
      // Convertir a objeto Date ISO completo para Prisma (manteniendo medianoche UTC)
      obj[k] = new Date(v + 'T00:00:00.000Z');
    }
  }
  return obj;
};

module.exports = BaseService;
