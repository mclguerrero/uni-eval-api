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

  async findPaginated({ skip = 0, limit = 10, sort = null, search = null } = {}) {
    const findOptions = { skip, take: limit };

    // Procesar búsqueda (search)
    if (search && search.isActive && search.term) {
      const searchFields = search.fields && Array.isArray(search.fields) && search.fields.length > 0
        ? search.fields
        : []; // Si no hay campos específicos, se puede extender aquí

      if (searchFields.length > 0) {
        const mode = search.caseSensitive ? undefined : 'insensitive';
        const searchMode = search.mode || 'startsWith';
        const buildFilter = (field) => {
          if (searchMode === 'equals') {
            return { [field]: search.term };
          }
          if (searchMode === 'contains') {
            return { [field]: { contains: search.term, ...(mode ? { mode } : {}) } };
          }
          // Default to startsWith for better index usage
          return { [field]: { startsWith: search.term, ...(mode ? { mode } : {}) } };
        };
        findOptions.where = {
          OR: searchFields.map(buildFilter)
        };
      }
    }

    // Procesar orden (sort)
    if (sort && sort.sortBy) {
      findOptions.orderBy = {
        [sort.sortBy]: sort.sortOrder === 'desc' ? 'desc' : 'asc'
      };
    } else if (skip || limit) {
      // Ensure stable pagination if no sort was provided
      findOptions.orderBy = { id: 'asc' };
    }

    const [items, total] = await Promise.all([
      this.model.findMany(findOptions),
      this.model.count(findOptions.where ? { where: findOptions.where } : undefined),
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
