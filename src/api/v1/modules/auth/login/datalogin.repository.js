const { authPrisma, localPrisma } = require('@config/prisma');
const crypto = require('crypto');

class DataloginRepository {
  constructor() {
    this.model = authPrisma.datalogin;
    this.refreshModel = localPrisma.rfh_tkn;
  }

  // ---- Auth users (remote) ----
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

    const seen = new Set();
    const roles = [];

    for (const r of userRoles) {
      const id = r?.rol?.id;
      const name = r?.rol?.nombre;
      if (!id || !name) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      roles.push({ id, name });
    }

    return roles;
  }

  // ---- Refresh token helpers ----
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async revokeByUser(user_id) {
    await this.refreshModel.updateMany({
      where: { user_id, es_revocado: false },
      data: { es_revocado: true }
    });
  }

  async upsertRefreshToken({ user_id, jti, tokenHash, fecha_expiracion }) {
    // Ensure single active session: revoke all existing
    await this.revokeByUser(user_id);
    // Create new token row
    return this.refreshModel.create({
      data: {
        user_id,
        jti,
        token: tokenHash,
        fecha_expiracion,
        es_revocado: false
      }
    });
  }

  async findActiveByUser(user_id) {
    return this.refreshModel.findFirst({
      where: { user_id, es_revocado: false }
    });
  }

  async findByJti(jti) {
    return this.refreshModel.findUnique({ where: { jti } });
  }

  async revokeByJti(jti) {
    return this.refreshModel.update({
      where: { jti },
      data: { es_revocado: true }
    });
  }
}

module.exports = DataloginRepository;
