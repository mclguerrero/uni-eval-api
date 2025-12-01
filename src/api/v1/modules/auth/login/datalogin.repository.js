const { authPrisma, localPrisma } = require('@config/prisma');

class DataloginRepository {
  constructor() {
    this.model = authPrisma.datalogin;
  }

  findAll() {
    return this.model.findMany();
  }

  findById(user_id) {
    return this.model.findUnique({ where: { user_id } });
  }

  findByUsername(user_username) {
    return this.model.findFirst({ where: { user_username } });
  }

  findAllByUsername(user_username) {
    return this.model.findMany({ where: { user_username } });
  }

  async findLocalRolesByUserId(user_id) {
    const userRoles = await localPrisma.user_rol.findMany({
      where: { user_id },
      include: { rol: true }
    });
    const roles = userRoles.map(r => r.rol?.nombre).filter(Boolean);
    return Array.from(new Set(roles));
  }
}

module.exports = DataloginRepository;
