const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');
const { prisma, userPrisma } = require('@config/prisma');

const EvalRepository = require('./eval.repository');

// Reuse user module to fetch materias
const UserRepository = require('../../auth/user/user.repository');
const UserService = require('../../auth/user/user.service');

class EvalService {
	constructor(repository = new EvalRepository()) {
		this.repository = repository;
		this.userService = new UserService(new UserRepository());
	}

	async getStudentAcademicInfo(studentId) {
		if (!studentId) return null;

		const rows = await userPrisma.vista_academica_insitus.findMany({
			where: {
				ID_ESTUDIANTE: String(studentId)
			},
			select: {
				PERIODO: true,
				NOMBRE_SEDE: true,
				NOM_FACULTAD: true,
				NOM_PROGRAMA: true,
				SEMESTRE: true,
				GRUPO: true
			}
		});

		if (!rows.length) return null;

		const academicInfo = {
			periodo: null,
			sede: null,
			facultad: null,
			programa: null,
			semestre: null,
			grupo: null
		};

		for (const row of rows) {
			if (academicInfo.periodo == null && row.PERIODO != null) academicInfo.periodo = row.PERIODO;
			if (academicInfo.sede == null && row.NOMBRE_SEDE != null) academicInfo.sede = row.NOMBRE_SEDE;
			if (academicInfo.facultad == null && row.NOM_FACULTAD != null) academicInfo.facultad = row.NOM_FACULTAD;
			if (academicInfo.programa == null && row.NOM_PROGRAMA != null) academicInfo.programa = row.NOM_PROGRAMA;
			if (academicInfo.semestre == null && row.SEMESTRE != null) academicInfo.semestre = row.SEMESTRE;
			if (academicInfo.grupo == null && row.GRUPO != null) academicInfo.grupo = row.GRUPO;

			if (
				academicInfo.periodo != null &&
				academicInfo.sede != null &&
				academicInfo.facultad != null &&
				academicInfo.programa != null &&
				academicInfo.semestre != null &&
				academicInfo.grupo != null
			) {
				break;
			}
		}

		return academicInfo;
	}

	applyStudentAcademicInfo(payload, academicInfo) {
		if (!academicInfo) return payload;

		const truncate = (value, maxLength) => {
			if (value == null) return null;
			const text = String(value);
			return text.length > maxLength ? text.slice(0, maxLength) : text;
		};

		return {
			...payload,
			periodo: truncate(academicInfo.periodo, 10),
			sede: truncate(academicInfo.sede, 20),
			facultad: truncate(academicInfo.facultad, 100),
			programa: truncate(academicInfo.programa, 100),
			semestre: truncate(academicInfo.semestre, 20),
			grupo: truncate(academicInfo.grupo, 10)
		};
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

	async enrichWithNames(results) {
		if (!results || results.length === 0) return results;

		// Collect unique docente-materia pairs (for tipos 1 y 2)
		const docentePairs = results
			.filter(r => r.docente && r.codigo_materia)
			.map(r => ({ docente: r.docente, codigo: parseInt(r.codigo_materia) }));

		// Collect unique estudiante-materia pairs (for tipos 3 y 4)
		const estudiantePairs = results
			.filter(r => r.estudiante && r.codigo_materia && !r.docente)
			.map(r => ({ estudiante: r.estudiante, codigo: parseInt(r.codigo_materia) }));

		if (docentePairs.length === 0 && estudiantePairs.length === 0) return results;

		// Build OR conditions for both docente and estudiante lookups
		const orConditions = [
			...docentePairs.map(p => ({
				ID_DOCENTE: p.docente,
				COD_ASIGNATURA: p.codigo
			})),
			...estudiantePairs.map(p => ({
				ID_ESTUDIANTE: p.estudiante,
				COD_ASIGNATURA: p.codigo
			}))
		];

		// Query vista_academica_insitus to get names
		const vistaData = await userPrisma.vista_academica_insitus.findMany({
			where: {
				OR: orConditions
			},
			select: {
				ID_DOCENTE: true,
				ID_ESTUDIANTE: true,
				DOCENTE: true,
				COD_ASIGNATURA: true,
				ASIGNATURA: true
			}
		});

		// Create separate lookup maps for docente and estudiante
		const lookupMapDocente = new Map();
		const lookupMapEstudiante = new Map();
		
		vistaData.forEach(v => {
			if (v.ID_DOCENTE) {
				const key = `${v.ID_DOCENTE}_${v.COD_ASIGNATURA}`;
				lookupMapDocente.set(key, {
					nombre_docente: v.DOCENTE,
					nombre_materia: v.ASIGNATURA
				});
			}
			if (v.ID_ESTUDIANTE) {
				const key = `${v.ID_ESTUDIANTE}_${v.COD_ASIGNATURA}`;
				lookupMapEstudiante.set(key, {
					nombre_docente: v.DOCENTE,
					nombre_materia: v.ASIGNATURA
				});
			}
		});

		// Enrich results with names
		return results.map(r => {
			let names = null;
			
			// Try docente lookup first
			if (r.docente && r.codigo_materia) {
				const key = `${r.docente}_${r.codigo_materia}`;
				names = lookupMapDocente.get(key);
			}
			
			// If no docente match, try estudiante lookup (for self-evaluations)
			if (!names && r.estudiante && r.codigo_materia) {
				const key = `${r.estudiante}_${r.codigo_materia}`;
				names = lookupMapEstudiante.get(key);
			}
			
			return {
				...r,
				nombre_docente: names?.nombre_docente || null,
				nombre_materia: names?.nombre_materia || null
			};
		});
	}

	async generateEvaluations(input, user) {
		const configId = Number(input?.configId);
		if (!user) throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.UNAUTHORIZED, 401);
		if (!configId) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);

		const username = user.username; // comes from auth.middleware
		if (!username) throw new AppError(MESSAGES.GENERAL.VALIDATION.INVALID_REQUEST, 400);

		const cfg = await this.repository.getConfigWithType(configId);
		if (!cfg) throw new AppError(MESSAGES.GENERAL.NOT_FOUND.NOT_FOUND, 404);

		const tipoFormId = cfg?.tipo_form?.id;
		const { isDocente, isEstudiante } = this.getRoleFlags(user);

		// Verificar si ya existen evaluaciones generadas
		const hasEvals = await this.repository.hasExistingEvaluations(configId, username, isEstudiante);
		if (hasEvals) {
			throw new AppError('Las evaluaciones ya fueron generadas para esta configuración', 409);
		}

		const studentAcademicInfo = isEstudiante ? await this.getStudentAcademicInfo(username) : null;

		// TIPO 1: EVALUACIÓN - Estudiante evalúa a docente por materia
		if (tipoFormId === 1) {
			if (!isEstudiante) throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.FORBIDDEN, 403);

			// Get materias for the authenticated student
			const estudiante = await this.userService.getMateriasEstudiante(username);
			const materias = estudiante?.materias || [];

			const created = await prisma.$transaction(async (tx) => {
				const results = [];
				for (const m of materias) {
					const payload = this.applyStudentAcademicInfo({
						id_configuracion: configId,
						estudiante: String(username),
						docente: m?.docente?.documento ? String(m.docente.documento) : null,
						codigo_materia: m?.codigo != null ? String(m.codigo) : null,
						cmt_gen: null,
					}, studentAcademicInfo);

					const exists = await this.repository.findExisting(payload, tx);
					if (!exists) {
						const row = await this.repository.create(payload, tx);
						results.push({
							id_configuracion: row.id_configuracion,
							estudiante: row.estudiante,
							docente: row.docente,
							codigo_materia: row.codigo_materia,
							periodo: row.periodo,
							sede: row.sede,
							facultad: row.facultad,
							programa: row.programa,
							semestre: row.semestre,
							grupo: row.grupo
						});
					}
				}
				return results;
			});

			return this.enrichWithNames(created);
		}

		// TIPO 2: ENCUESTA - Opinión general sin materia
		if (tipoFormId === 2) {
			if (!isDocente && !isEstudiante)
				throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.FORBIDDEN, 403);

			const singlePayload = this.applyStudentAcademicInfo({
				id_configuracion: configId,
				estudiante: isEstudiante ? String(username) : null,
				docente: isDocente ? String(username) : null,
				codigo_materia: null,
				cmt_gen: null,
			}, studentAcademicInfo);

			const created = await prisma.$transaction(async (tx) => {
				const exists = await this.repository.findExisting(singlePayload, tx);
				if (exists) return [];
				const row = await this.repository.create(singlePayload, tx);
				return [{
					id_configuracion: row.id_configuracion,
					estudiante: row.estudiante,
					docente: row.docente,
					codigo_materia: row.codigo_materia,
					periodo: row.periodo,
					sede: row.sede,
					facultad: row.facultad,
					programa: row.programa,
					semestre: row.semestre,
					grupo: row.grupo
				}];
			});

			return created;
		}

		// TIPO 3: AUTOEVALUACIÓN - Usuario se evalúa a sí mismo (sin materia)
		if (tipoFormId === 3) {
			if (!isDocente && !isEstudiante)
				throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.FORBIDDEN, 403);

			const singlePayload = this.applyStudentAcademicInfo({
				id_configuracion: configId,
				estudiante: isEstudiante ? String(username) : null,
				docente: isDocente ? String(username) : null,
				codigo_materia: null,
				cmt_gen: null,
			}, studentAcademicInfo);

			const created = await prisma.$transaction(async (tx) => {
				const exists = await this.repository.findExisting(singlePayload, tx);
				if (exists) return [];
				const row = await this.repository.create(singlePayload, tx);
				return [{
					id_configuracion: row.id_configuracion,
					estudiante: row.estudiante,
					docente: row.docente,
					codigo_materia: row.codigo_materia,
					periodo: row.periodo,
					sede: row.sede,
					facultad: row.facultad,
					programa: row.programa,
					semestre: row.semestre,
					grupo: row.grupo
				}];
			});

			return created;
		}

		// TIPO 4: AUTOEVALUACIÓN POR MATERIA - Usuario se evalúa por cada materia
		if (tipoFormId === 4) {
			if (!isDocente && !isEstudiante)
				throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.FORBIDDEN, 403);

			let materias = [];

			// Si es estudiante, obtener materias que cursa
			if (isEstudiante) {
				const estudiante = await this.userService.getMateriasEstudiante(username);
				materias = estudiante?.materias || [];
			}
			// Si es docente, obtener materias que imparte
			else if (isDocente) {
				const docente = await this.userService.getMateriasDocente(username);
				materias = docente?.materias || [];
			}

			const created = await prisma.$transaction(async (tx) => {
				const results = [];
				for (const m of materias) {
					const payload = this.applyStudentAcademicInfo({
						id_configuracion: configId,
						estudiante: isEstudiante ? String(username) : null,
						docente: isDocente ? String(username) : null,
						codigo_materia: m?.codigo != null ? String(m.codigo) : null,
						cmt_gen: null,
					}, studentAcademicInfo);

					const exists = await this.repository.findExisting(payload, tx);
					if (!exists) {
						const row = await this.repository.create(payload, tx);
						results.push({
							id_configuracion: row.id_configuracion,
							estudiante: row.estudiante,
							docente: row.docente,
							codigo_materia: row.codigo_materia,
							periodo: row.periodo,
							sede: row.sede,
							facultad: row.facultad,
							programa: row.programa,
							semestre: row.semestre,
							grupo: row.grupo,
							nombre_materia: m?.nombre || null
						});
					}
				}
				return results;
			});

			return created;
		}

		throw new AppError('Tipo de formulario no válido', 400);
	}
}

module.exports = EvalService;

