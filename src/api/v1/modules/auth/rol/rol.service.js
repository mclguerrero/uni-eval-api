const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');

class RolService {
	constructor(repository) {
		this.repository = repository;
	}

	async getMixedRolesOnline() {
		const [localRoles, remoteRoles] = await Promise.all([
			this.repository.getLocalRoles(),
			this.repository.getRemoteRolesDistinct()
		]);

		const locals = localRoles.map(({ id, nombre }) => ({
			id,
			nombre,
			tipo_participacion: 'APP'
		}));

		const remotes = remoteRoles.map(({ user_idrole, role_name }) => ({
			id: user_idrole,
			nombre: role_name,
			tipo_participacion: 'AUTH'
		}));

		return [...locals, ...remotes];
	}

	async getMixedRoles() {
		return this.repository.getMixedLocalRoles();
	}
}

module.exports = RolService;
