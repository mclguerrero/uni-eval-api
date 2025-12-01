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
    return this.repository.create(clean);
  }

  async update(id, data) {
    await this.getById(id);
    const clean = this.sanitizeWriteData(data);
    return this.repository.update(id, clean);
  }

  async delete(id) {
    await this.getById(id);
    return this.repository.delete(id);
  }
}

module.exports = BaseService;
