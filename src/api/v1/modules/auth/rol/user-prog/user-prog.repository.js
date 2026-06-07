const { prisma: localPrisma, authPrisma } = require('@config/prisma');

class UserProgRepository {
	constructor({ localClient = localPrisma, authClient = authPrisma } = {}) {
		this.localClient = localClient;
		this.authClient = authClient;
		this.model = this.localClient.user_prog;
		this.dataloginModel = this.authClient.datalogin;
	}

	async findPaginatedWithDataLogin({ skip = 0, limit = 10, sort = null, search = null } = {}) {
		const findOptions = {
			skip,
			take: limit,
			select: {
				id: true,
				user_rol_id: true,
				periodo: true,
				sede: true,
				facultad: true,
				programa: true,
				semestre: true,
				grupo: true,
				fecha_creacion: true,
				fecha_actualizacion: true,
				user_rol: { select: { user_id: true } },
			},
		};

		if (sort?.sortBy) {
			findOptions.orderBy = { [sort.sortBy]: sort.sortOrder === 'desc' ? 'desc' : 'asc' };
		} else {
			findOptions.orderBy = { id: 'asc' };
		}

		let userIdsFromDataLogin = null;
		if (search?.isActive && search?.term && search.fields.length > 0) {
			const whereConditions = [];
			const dataloginFields = ['user_name', 'user_username', 'user_email'];
			const hasDataloginSearch = search.fields.some(f => dataloginFields.includes(f));

			if (hasDataloginSearch) {
				const matchingDatalogins = await this.dataloginModel.findMany({
					where: {
						OR: search.fields
							.filter(f => dataloginFields.includes(f))
							.map(field => ({ [field]: { contains: search.term } })),
					},
					select: { user_id: true },
				});
				userIdsFromDataLogin = matchingDatalogins.map(dl => dl.user_id);
			}

			// Buscar en campos de scope
			const scopeFields = ['programa', 'sede', 'facultad', 'semestre', 'grupo', 'periodo'];
			for (const field of scopeFields) {
				if (search.fields.includes(field)) {
					whereConditions.push({ [field]: { contains: search.term } });
				}
			}

			if (userIdsFromDataLogin && userIdsFromDataLogin.length > 0) {
				whereConditions.push({ user_rol: { user_id: { in: userIdsFromDataLogin } } });
			} else if (hasDataloginSearch && (!userIdsFromDataLogin || userIdsFromDataLogin.length === 0)) {
				whereConditions.push({ id: -1 });
			}

			if (whereConditions.length > 0) {
				findOptions.where = { OR: whereConditions };
			}
		}

		const [items, total] = await Promise.all([
			this.model.findMany(findOptions),
			this.model.count(findOptions.where ? { where: findOptions.where } : undefined),
		]);

		const userIds = items.map(item => item.user_rol.user_id);
		const dataLogins = userIds.length > 0
			? await this.dataloginModel.findMany({
					where: { user_id: { in: userIds } },
					select: {
						user_id: true,
						user_name: true,
						user_username: true,
						user_email: true,
						user_idrole: true,
						user_statusid: true,
						role_name: true,
					},
				})
			: [];

		const dataLoginMap = dataLogins.reduce((acc, dl) => {
			acc[dl.user_id] = dl;
			return acc;
		}, {});

		const enrichedItems = items.map(item => ({
			...item,
			datalogin: dataLoginMap[item.user_rol.user_id] || null,
		}));

		return { items: enrichedItems, total };
	}
}

module.exports = UserProgRepository;
