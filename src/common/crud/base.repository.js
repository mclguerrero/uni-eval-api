const { prisma } = require('@config/prisma');

class BaseRepository {
  constructor(modelOrOptions) {
    const isOptions = typeof modelOrOptions === 'object' && modelOrOptions !== null;
    const delegateKey = isOptions ? (modelOrOptions.name || modelOrOptions.model || '') : modelOrOptions;
    this.model = prisma[delegateKey];
  }

  findAll() {
    return this.model.findMany();
  }

  async findPaginated({ skip = 0, limit = 10 } = {}) {
    const [items, total] = await Promise.all([
      this.model.findMany({ skip, take: limit }),
      this.model.count(),
    ]);
    return { items, total };
  }

  findById(id) {
    return this.model.findUnique({ where: { id } });
  }

  create(data) {
    return this.model.create({ data });
  }

  update(id, data) {
    return this.model.update({ where: { id }, data });
  }

  delete(id) {
    return this.model.delete({ where: { id } });
  }
}

module.exports = BaseRepository;
