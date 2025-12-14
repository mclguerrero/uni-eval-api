const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');
const { prisma } = require('@config/prisma');

const EvalRepository = require('./eval.repository');

// Reuse user module to fetch materias
const UserRepository = require('../../auth/user/user.repository');
const UserService = require('../../auth/user/user.service');

class EvalService {
	constructor(repository = new EvalRepository()) {
		this.repository = repository;
		this.userService = new UserService(new UserRepository());
	}

	getRoleFlags(user) {
		const { roles = [], rolesAuth = [], rolesApp = [] } = user || {};
		const all = new Set([...(roles || []), ...(rolesAuth || []), ...(rolesApp || [])].filter(Boolean));

		const ROLES_ESTUDIANTE = new Set(['Estudiante']);
		const ROLES_DOCENTE = new Set([
			'Docente',
			'docente_planta',
			'docente_catedra',
			'docente_planta_tc',
			'docente_planta_mt',
			'docente_planta_tiempo_completo',
			'docente_planta_medio_tiempo'
		]);

		const isDocente = [...all].some(r => ROLES_DOCENTE.has(r));
		const isEstudiante = [...all].some(r => ROLES_ESTUDIANTE.has(r));
		return { isDocente, isEstudiante };
	}

	async generateEvaluations(input, user) {
		const configId = Number(input?.configId);
		if (!user) throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.UNAUTHORIZED, 401);
		if (!configId) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);

		const username = user.username; // comes from auth.middleware
		if (!username) throw new AppError(MESSAGES.GENERAL.VALIDATION.INVALID_REQUEST, 400);

		const cfg = await this.repository.getConfigWithType(configId);
		if (!cfg) throw new AppError(MESSAGES.GENERAL.NOT_FOUND.NOT_FOUND, 404);

		const isEvaluacion = !!cfg?.ct_map?.tipo?.es_evaluacion;
		const { isDocente, isEstudiante } = this.getRoleFlags(user);

		// If it's an evaluation, only students generate records (student evaluates teacher by subject)
		if (isEvaluacion) {
			if (!isEstudiante) throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.FORBIDDEN, 403);

			// Get materias for the authenticated student
			const estudiante = await this.userService.getMateriasEstudiante(username);
			const materias = estudiante?.materias || [];

			const created = await prisma.$transaction(async (tx) => {
				const results = [];
				for (const m of materias) {
					const payload = {
						id_configuracion: configId,
						estudiante: String(username),
						docente: m?.docente?.documento ? String(m.docente.documento) : null,
						codigo_materia: m?.codigo != null ? String(m.codigo) : null,
						cmt_gen: null,
					};

					const exists = await this.repository.findExisting(payload, tx);
					if (!exists) {
						const row = await this.repository.create(payload, tx);
						results.push({
							id_configuracion: row.id_configuracion,
							estudiante: row.estudiante,
							docente: row.docente,
							codigo_materia: row.codigo_materia,
							cmt_gen: row.cmt_gen,
						});
					}
				}
				return results;
			});

			return created;
		}

		// Not an evaluation: general survey (either docente OR estudiante, without subject)
		if (!isDocente && !isEstudiante)
			throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.FORBIDDEN, 403);

		const singlePayload = {
			id_configuracion: configId,
			estudiante: isEstudiante ? String(username) : null,
			docente: isDocente ? String(username) : null,
			codigo_materia: null,
			cmt_gen: null,
		};

		const created = await prisma.$transaction(async (tx) => {
			const exists = await this.repository.findExisting(singlePayload, tx);
			if (exists) return [];
			const row = await this.repository.create(singlePayload, tx);
			return [{
				id_configuracion: row.id_configuracion,
				estudiante: row.estudiante,
				docente: row.docente,
				codigo_materia: row.codigo_materia,
				cmt_gen: row.cmt_gen,
			}];
		});

		return created;
	}
}

module.exports = EvalService;

