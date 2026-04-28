const { localPrisma, authPrisma } = require('@config/prisma');

class RolRepository {
	constructor({ localClient = localPrisma, authClient = authPrisma } = {}) {
		this.localClient = localClient;
		this.authClient = authClient;
	}

	getLocalRoles() {
		return this.localClient.rol.findMany({
			select: { id: true, nombre: true },
			orderBy: { id: 'asc' }
		});
	}

	getRemoteRolesDistinct() {
		return this.authClient.datalogin.findMany({
			distinct: ['user_idrole', 'role_name'],
			select: { user_idrole: true, role_name: true },
			orderBy: { user_idrole: 'asc' }
		});
	}

	getMixedLocalRoles() {
		return this.localClient.rol_mix.findMany({
			select: { id: true, nombre: true, origen: true, rol_origen_id: true },
			orderBy: { id: 'asc' }
		});
	}

	getAuthUserBasicById(userId) {
		return this.authClient.datalogin.findUnique({
			where: { user_id: userId },
			select: { user_name: true, user_email: true }
		});
	}
}

module.exports = RolRepository;
