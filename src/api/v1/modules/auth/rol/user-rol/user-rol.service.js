const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');

class UserRolService {
	constructor(repository) {
		this.repository = repository;
	}

	async getUserRolesWithName(pagination) {
		if (!pagination) throw new AppError(MESSAGES.GENERAL.VALIDATION.INVALID_REQUEST, 400);

		const { skip, limit, page } = pagination;
		const { items, total } = await this.repository.findPaginatedWithRoleName({ skip, limit });
		const pages = Math.ceil(total / limit) || 1;

		const data = items.map((item) => ({
			id: item.id,
			user_id: item.user_id,
			rol_id: item.rol_id,
			rol_nombre: item.rol?.nombre ?? null,
			fecha_creacion: item.fecha_creacion,
			fecha_actualizacion: item.fecha_actualizacion
		}));

		return {
			data,
			pagination: {
				page,
				limit,
				total,
				pages,
				hasNext: page < pages,
				hasPrev: page > 1
			}
		};
	}

	async getUserRolesWithDataLogin(options = {}) {
		const { pagination, sort, search } = options;
		if (!pagination) throw new AppError(MESSAGES.GENERAL.VALIDATION.INVALID_REQUEST, 400);

		const { skip, limit, page } = pagination;
		const { items, total } = await this.repository.findPaginatedWithDataLogin({ skip, limit, sort, search });
		const pages = Math.ceil(total / limit) || 1;

		const data = items.map((item) => ({
			id: item.id,
			user_id: item.user_id,
			rol_id: item.rol_id,
			rol_nombre: item.rol?.nombre ?? null,
			fecha_creacion: item.fecha_creacion,
			fecha_actualizacion: item.fecha_actualizacion,
			datalogin: item.datalogin ? {
				user_name: item.datalogin.user_name,
				user_username: item.datalogin.user_username,
				user_email: item.datalogin.user_email,
				user_idrole: item.datalogin.user_idrole,
				user_statusid: item.datalogin.user_statusid,
				role_name: item.datalogin.role_name
			} : null
		}));

		return {
			data,
			pagination: {
				page,
				limit,
				total,
				pages,
				hasNext: page < pages,
				hasPrev: page > 1
			}
		};
	}
}

module.exports = UserRolService;
