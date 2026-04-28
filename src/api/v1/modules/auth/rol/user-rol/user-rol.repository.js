const { localPrisma, authPrisma } = require('@config/prisma');

class UserRolRepository {
	constructor({ localClient = localPrisma, authClient = authPrisma } = {}) {
		this.localClient = localClient;
		this.authClient = authClient;
		this.model = this.localClient.user_rol;
		this.dataloginModel = this.authClient.datalogin;
	}

	async findPaginatedWithRolName({ skip = 0, limit = 10 } = {}) {
		const [items, total] = await Promise.all([
			this.model.findMany({
				skip,
				take: limit,
				orderBy: { id: 'asc' },
				select: {
					id: true,
					user_id: true,
					rol_id: true,
					fecha_creacion: true,
					fecha_actualizacion: true,
					rol: { select: { nombre: true } }
				}
			}),
			this.model.count()
		]);

		return { items, total };
	}

	async findPaginatedWithDataLogin({ skip = 0, limit = 10, sort = null, search = null } = {}) {
		const findOptions = {
			skip,
			take: limit,
			select: {
				id: true,
				user_id: true,
				rol_id: true,
				fecha_creacion: true,
				fecha_actualizacion: true,
				rol: { select: { nombre: true } }
			}
		};

		// Procesar orden (sort)
		if (sort && sort.sortBy) {
			findOptions.orderBy = {
				[sort.sortBy]: sort.sortOrder === 'desc' ? 'desc' : 'asc'
			};
		} else {
			findOptions.orderBy = { id: 'asc' };
		}

		// Procesar búsqueda (search)
		let userIdsFromDataLogin = null;
		if (search && search.isActive && search.term && search.fields.length > 0) {
			const whereConditions = [];
			const dataloginFields = ['user_name', 'user_username', 'user_email'];
			const hasDataloginSearch = search.fields.some(f => dataloginFields.includes(f));

			// Buscar en campos de datalogin si aplica
			if (hasDataloginSearch) {
				const dataloginWhere = {
					OR: search.fields
						.filter(f => dataloginFields.includes(f))
						.map(field => ({
							[field]: { contains: search.term }
						}))
				};
				const matchingDatalogins = await this.dataloginModel.findMany({
					where: dataloginWhere,
					select: { user_id: true }
				});
				userIdsFromDataLogin = matchingDatalogins.map(dl => dl.user_id);
			}

			// Buscar en rol_nombre
			if (search.fields.includes('rol_nombre')) {
				whereConditions.push({
					rol: {
						nombre: { contains: search.term }
					}
				});
			}

			// Agregar filtro por user_ids de datalogin
			if (userIdsFromDataLogin && userIdsFromDataLogin.length > 0) {
				whereConditions.push({
					user_id: { in: userIdsFromDataLogin }
				});
			} else if (hasDataloginSearch && (!userIdsFromDataLogin || userIdsFromDataLogin.length === 0)) {
				// Si buscó en datalogin pero no encontró nada, no retornar resultados
				whereConditions.push({ id: -1 });
			}

			if (whereConditions.length > 0) {
				findOptions.where = { OR: whereConditions };
			}
		}

		const [items, total] = await Promise.all([
			this.model.findMany(findOptions),
			this.model.count(findOptions.where ? { where: findOptions.where } : undefined)
		]);

		// Obtener datos de datalogin para cada user_id
		const userIds = items.map(item => item.user_id);
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
						role_name: true
					}
				})
			: [];

		// Crear mapa de datalogin por user_id
		const dataLoginMap = dataLogins.reduce((acc, dl) => {
			acc[dl.user_id] = dl;
			return acc;
		}, {});

		// Enriquecer items con datos de datalogin
		const enrichedItems = items.map(item => ({
			...item,
			datalogin: dataLoginMap[item.user_id] || null
		}));

		return { items: enrichedItems, total };
	}
}

module.exports = UserRolRepository;
