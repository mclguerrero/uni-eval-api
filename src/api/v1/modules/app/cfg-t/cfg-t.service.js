const AppError = require('@utils/AppError');
const MESSAGES = require('@constants/messages');
const { hasGlobalRole } = require('@middlewares/auth.middleware');

class CfgTService {

	// Devuelve la configuración filtrada por id (y pareja si existe)
	async getCfgId(id, search, sort) {
		if (!id) throw new Error('ID requerido');
		// Busca la configuración principal y su pareja si existe
		const data = await this.repository.findCfgByIdWithPair(id, search, sort);
		return data;
	}
	constructor(repository) {
		this.repository = repository;
	}

	createCfgTFull(payload) {
		if (!payload || typeof payload !== 'object') {
			throw new AppError(MESSAGES.GENERAL.VALIDATION.INVALID_REQUEST, 400);
		}

		const cfg = payload.cfg_t && typeof payload.cfg_t === 'object' ? payload.cfg_t : payload;
		const scopesInput = Array.isArray(payload.scopes)
			? payload.scopes
			: payload.scope && typeof payload.scope === 'object'
				? [payload.scope]
				: [];
		const rolesInput = Array.isArray(payload.roles)
			? payload.roles
			: Array.isArray(payload.rol_mix_ids)
				? payload.rol_mix_ids
				: [];

		if (!scopesInput.length) {
			throw new AppError('Debe enviar al menos un scope', 400);
		}

		const tipoId = Number(cfg.tipo_id);
		const tipoFormId = Number(cfg.tipo_form_id);
		const fechaInicio = cfg.fecha_inicio;
		const fechaFin = cfg.fecha_fin;

		if (!tipoId || !tipoFormId || !fechaInicio || !fechaFin) {
			throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);
		}

		const inicio = new Date(fechaInicio);
		const fin = new Date(fechaFin);
		if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
			throw new AppError('Formato de fecha inválido', 400);
		}
		if (fin < inicio) {
			throw new AppError('fecha_fin debe ser mayor o igual a fecha_inicio', 400);
		}

		const generaAutoeval = Boolean(cfg.genera_autoeval);
		const esCmtGen = cfg.es_cmt_gen == null ? true : Boolean(cfg.es_cmt_gen);
		const esCmtGenOblig = cfg.es_cmt_gen_oblig == null ? false : Boolean(cfg.es_cmt_gen_oblig);
		const esActivo = cfg.es_activo == null ? false : Boolean(cfg.es_activo);

		if (!esCmtGen && esCmtGenOblig) {
			throw new AppError('es_cmt_gen_oblig no puede ser true cuando es_cmt_gen es false', 400);
		}

		let autoevalTipoFormId = cfg.autoeval_tipo_form_id == null ? null : Number(cfg.autoeval_tipo_form_id);

		if (generaAutoeval && tipoFormId !== 1) {
			throw new AppError('Solo tipo_form_id=1 puede activar genera_autoeval', 400);
		}

		if (!generaAutoeval && autoevalTipoFormId !== null) {
			throw new AppError('autoeval_tipo_form_id debe ser NULL cuando genera_autoeval es false', 400);
		}

		if (generaAutoeval && autoevalTipoFormId === null) {
			throw new AppError('autoeval_tipo_form_id es requerido cuando genera_autoeval es true', 400);
		}

		if (generaAutoeval && ![3, 4].includes(autoevalTipoFormId)) {
			throw new AppError('autoeval_tipo_form_id debe ser 3 o 4 cuando genera_autoeval es true', 400);
		}

		const autoevalRoleMixIds = Array.isArray(cfg.autoeval_rol_mix_ids)
			? cfg.autoeval_rol_mix_ids.map(Number).filter(Boolean)
			: [];

		if (generaAutoeval && !autoevalRoleMixIds.length) {
			throw new AppError('autoeval_rol_mix_ids es requerido cuando genera_autoeval es true', 400);
		}

		const scopes = scopesInput.map((scope, index) => {
			const sedeId = scope?.sede_id == null ? null : Number(scope.sede_id);
			const periodoId = Number(scope?.periodo_id);

			// Sede es opcional (puede ser null), pero periodo es requerido
			if (!periodoId) {
				throw new AppError(`Scope[${index}] inválido: periodo_id es requerido`, 400);
			}

			return {
				sede_id: sedeId,
				periodo_id: periodoId,
				programa_id: scope?.programa_id == null ? null : Number(scope.programa_id),
				semestre_id: scope?.semestre_id == null ? null : Number(scope.semestre_id),
				grupo_id: scope?.grupo_id == null ? null : Number(scope.grupo_id),
			};
		});

		const roleMixIdsFromPayload = rolesInput
			.map(item => (typeof item === 'object' && item !== null ? item.rol_mix_id : item))
			.map(Number)
			.filter(Boolean);

		const roleMixIdsFromScopes = scopesInput
			.map(scope => Number(scope?.rol_mix_id))
			.filter(Boolean);

		const roleMixIds = [...new Set([...roleMixIdsFromPayload, ...roleMixIdsFromScopes])];

		if (!roleMixIds.length) {
			throw new AppError('Debe enviar al menos un rol en roles/rol_mix_ids', 400);
		}

		const data = {
			cfg_t: {
				tipo_id: tipoId,
				tipo_form_id: tipoFormId,
				genera_autoeval: generaAutoeval,
				autoeval_tipo_form_id: autoevalTipoFormId,
				fecha_inicio: inicio,
				fecha_fin: fin,
				es_cmt_gen: esCmtGen,
				es_cmt_gen_oblig: esCmtGenOblig,
				es_activo: esActivo,
			},
			scopes,
			role_mix_ids: roleMixIds,
			autoeval_role_mix_ids: autoevalRoleMixIds,
		};

		return this.repository.createCfgTFull(data);
	}

	getAspectosEscalas(cfgTId) {
		return this.repository.findAspectosEscalasByCfgTId(cfgTId);
	}

	getCfgAAndCfgE(cfgTId) {
		if (!cfgTId) {
			return this.repository.findAllCfgAAndCfgE();
		}
		return this.repository.findCfgAAndCfgEByCfgTId(cfgTId);
	}

	getCfgTList(user, search, sort) {
		const userAppRoleIds = user?.rolesAppIds || [];
		const userAuthRoleIds = user?.rolesAuthIds || [];
		const isAdmin = hasGlobalRole(user);
		const authRoleIdsSet = new Set((userAuthRoleIds || []).map(String));
		const isDocente = authRoleIdsSet.has('2');
		const isEstudiante = authRoleIdsSet.has('1');
		return this.repository.findCfgTListByUserRoles(userAppRoleIds, userAuthRoleIds, isAdmin, isDocente, isEstudiante, search, sort);
	}

	getRolesByCfgT(cfgTId) {
		return this.repository.findRolesByCfgTId(cfgTId);
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

	async getEvaluacionesByCfgT(cfgTId, user) {
		if (!user) throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.UNAUTHORIZED, 401);
		if (!cfgTId) throw new AppError(MESSAGES.GENERAL.VALIDATION.MISSING_FIELDS, 400);

		const currentUsername = user?.username;
		if (!currentUsername) throw new AppError(MESSAGES.GENERAL.VALIDATION.INVALID_REQUEST, 400);

		const { isDocente, isEstudiante } = this.getRoleFlags(user);
		if (!isDocente && !isEstudiante)
			throw new AppError(MESSAGES.GENERAL.AUTHORIZATION.FORBIDDEN, 403);

		return this.repository.findEvaluacionesByCfgTAndUser(cfgTId, currentUsername, { isDocente, isEstudiante });
	}

	getScopesByCfgT(cfgTId) {
		return this.repository.findScopeWithNamesByCfgTId(cfgTId);
	}
}

module.exports = CfgTService;
