class RolService {
	constructor(repository) {
		this.repository = repository;
	}

	async getMixedRoles() {
		const [localRoles, remoteRoles] = await Promise.all([
			this.repository.getLocalRoles(),
			this.repository.getRemoteRolesDistinct()
		]);

		const locals = localRoles.map(({ id, nombre }) => ({
			id,
			nombre,
			tipo_participacion: 'LOCAL'
		}));

		const remotes = remoteRoles.map(({ user_idrole, role_name }) => ({
			id: user_idrole,
			nombre: role_name,
			tipo_participacion: 'REMOTO'
		}));

		return [...locals, ...remotes];
	}
}

module.exports = RolService;
