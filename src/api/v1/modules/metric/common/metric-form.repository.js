const { localPrisma, authPrisma, userPrisma } = require('../../../../../prisma/clients');

// Build dynamic filters for the remote academic view
function buildVistaWhere({ sede, periodo, programa, semestre, grupo }) {
	const where = {};
	if (sede) where.NOMBRE_SEDE = sede;
	if (periodo) where.PERIODO = periodo;
	if (programa) where.NOM_PROGRAMA = programa;
	if (semestre) where.SEMESTRE = semestre;
	if (grupo) where.GRUPO = grupo;

	// Excluir docente sin asignar
	where.NOT = { DOCENTE: 'DOCENTE SIN ASIGNAR' };
	return where;
}

function parseRolMixIds(rol_mix_ids) {
	if (!rol_mix_ids) return [];
	if (typeof rol_mix_ids === 'string') {
		return rol_mix_ids
			.split(',')
			.map((id) => Number(id))
			.filter((id) => Number.isFinite(id));
	}
	if (Array.isArray(rol_mix_ids)) {
		return rol_mix_ids
			.map((id) => Number(id))
			.filter((id) => Number.isFinite(id));
	}
	return [];
}

async function resolveRoleUserIds(roleMixIds) {
	if (!roleMixIds.length) return null;

	const roles = await localPrisma.rol_mix.findMany({
		where: { id: { in: roleMixIds } },
		select: { id: true, origen: true, rol_origen_id: true }
	});

	if (!roles.length) return new Set();

	const authRoleIds = [];
	const appRoleIds = [];
	for (const role of roles) {
		const roleId = Number(role?.rol_origen_id);
		if (!Number.isFinite(roleId)) continue;
		if (role?.origen === 'AUTH') authRoleIds.push(roleId);
		if (role?.origen === 'APP') appRoleIds.push(roleId);
	}

	const userIds = new Set();

	if (authRoleIds.length) {
		const authUsers = await authPrisma.datalogin.findMany({
			where: { user_idrole: { in: Array.from(new Set(authRoleIds)) } },
			select: { user_id: true, user_username: true }
		});
		for (const user of authUsers) {
			if (user?.user_id != null) userIds.add(String(user.user_id));
			if (user?.user_username) userIds.add(String(user.user_username));
		}
	}

	if (appRoleIds.length) {
		const appUsers = await localPrisma.user_rol.findMany({
			where: { rol_id: { in: Array.from(new Set(appRoleIds)) } },
			select: { user_id: true }
		});
		for (const user of appUsers) {
			if (user?.user_id != null) userIds.add(String(user.user_id));
		}
	}

	return userIds;
}

function toNumberOrNull(value) {
	if (value == null) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function getMostFrequentValue(counterMap) {
	if (!(counterMap instanceof Map) || !counterMap.size) return null;
	let bestValue = null;
	let bestCount = -1;
	for (const [value, count] of counterMap.entries()) {
		if (count > bestCount) {
			bestValue = value;
			bestCount = count;
		}
	}
	return bestValue;
}

function getUsuarioFromEval(ev) {
	return ev.docente || ev.estudiante || null;
}

function applySearchSortPagination(items, pagination = {}, search = {}, sort = {}, defaultSortBy = 'promedio_general') {
	let data = Array.isArray(items) ? [...items] : [];

	if (search?.isActive && search?.term) {
		const term = search.caseSensitive ? String(search.term) : String(search.term).toLowerCase();
		data = data.filter((row) => {
			const text = String(row.usuario || '');
			const haystack = search.caseSensitive ? text : text.toLowerCase();
			return haystack.includes(term);
		});
	}

	const sortBy = sort?.sortBy || defaultSortBy;
	const sortOrder = sort?.sortOrder === 'asc' ? 'asc' : 'desc';
	const factor = sortOrder === 'asc' ? 1 : -1;

	data.sort((a, b) => {
		const av = a?.[sortBy];
		const bv = b?.[sortBy];
		if (av == null && bv == null) return 0;
		if (av == null) return 1;
		if (bv == null) return -1;
		if (typeof av === 'string' || typeof bv === 'string') {
			return factor * String(av).localeCompare(String(bv));
		}
		return factor * (Number(av) - Number(bv));
	});

	const page = Math.max(1, Number(pagination?.page) || 1);
	const limit = Math.max(1, Number(pagination?.limit) || 10);
	const total = data.length;
	const start = (page - 1) * limit;
	const paginated = data.slice(start, start + limit);

	return {
		data: paginated,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit) || 1
		}
	};
}

async function getScoreMapByAeId(aeIds) {
	if (!aeIds.length) return new Map();
	const aes = await localPrisma.a_e.findMany({
		where: { id: { in: aeIds } },
		select: {
			id: true,
			cfg_e: { select: { puntaje: true } },
			cfg_a: {
				select: {
					ca_map: {
						select: {
							aspecto: { select: { id: true, nombre: true } }
						}
					}
				}
			}
		}
	});

	const map = new Map();
	for (const ae of aes) {
		map.set(ae.id, {
			puntaje: ae.cfg_e?.puntaje != null ? Number(ae.cfg_e.puntaje) : null,
			aspecto_id: ae.cfg_a?.ca_map?.aspecto?.id || null,
			aspecto_nombre: ae.cfg_a?.ca_map?.aspecto?.nombre || null
		});
	}
	return map;
}

async function validateCfgTipoForm(cfgId, tipoFormId) {
	const cfg = await localPrisma.cfg_t.findUnique({
		where: { id: cfgId },
		select: { id: true, tipo_form_id: true }
	});
	if (!cfg) throw new Error('cfg_t no existe');
	if (cfg.tipo_form_id !== tipoFormId) {
		throw new Error(`cfg_t ${cfgId} no pertenece al tipo_form ${tipoFormId}`);
	}
}

function createMetricFormRepository({ tipoFormId, allowMateria = false }) {
	async function getEvalBase(query) {
		const cfgId = Number(query?.cfg_t);
		if (!cfgId) throw new Error('cfg_t is required');
		await validateCfgTipoForm(cfgId, tipoFormId);

		const usuario = query?.usuario ? String(query.usuario) : null;
		const codigoMateria = query?.codigo_materia ? String(query.codigo_materia) : null;
		const roleMixIds = parseRolMixIds(query?.rol_mix ?? query?.rol_mix_ids);

		const whereVista = buildVistaWhere({
			sede: query?.sede,
			periodo: query?.periodo,
			programa: query?.programa,
			semestre: query?.semestre,
			grupo: query?.grupo
		});

		const vista = await userPrisma.vista_academica_insitus.findMany({
			where: whereVista,
			select: { ID_ESTUDIANTE: true, ID_DOCENTE: true }
		});

		const allowedEstudiantes = new Set(vista.map((v) => v.ID_ESTUDIANTE).filter(Boolean));
		const allowedDocentes = new Set(vista.map((v) => v.ID_DOCENTE).filter(Boolean));

		const strictRoleUserIds = await resolveRoleUserIds(roleMixIds);

		const where = { id_configuracion: cfgId };

		const andClauses = [];
		const scopedUserClauses = [];
		if (allowedEstudiantes.size > 0) {
			scopedUserClauses.push({ estudiante: { in: Array.from(allowedEstudiantes) } });
		}
		if (allowedDocentes.size > 0) {
			scopedUserClauses.push({ docente: { in: Array.from(allowedDocentes) } });
		}

		if (!scopedUserClauses.length) {
			return {
				cfgId,
				evals: [],
				detalles: [],
				scoreMap: new Map(),
				meta: { totalEncuestasUniverse: 0, universeUserIds: new Set() }
			};
		}

		andClauses.push({ OR: scopedUserClauses });

		if (strictRoleUserIds !== null) {
			if (!strictRoleUserIds.size) {
				return {
					cfgId,
					evals: [],
					detalles: [],
					scoreMap: new Map(),
					meta: { totalEncuestasUniverse: 0, universeUserIds: new Set() }
				};
			}
			const roleScopedIds = Array.from(strictRoleUserIds);
			andClauses.push({
				OR: [
					{ estudiante: { in: roleScopedIds } },
					{ docente: { in: roleScopedIds } }
				]
			});
		}

		if (usuario) {
			andClauses.push({ OR: [{ docente: usuario }, { estudiante: usuario }] });
		}

		if (allowMateria && codigoMateria) {
			where.codigo_materia = codigoMateria;
		}

		if (andClauses.length) {
			where.AND = andClauses;
		}

		const universeUserIds = new Set();
		for (const id of allowedEstudiantes) universeUserIds.add(String(id));
		for (const id of allowedDocentes) universeUserIds.add(String(id));

		if (strictRoleUserIds !== null) {
			for (const id of Array.from(universeUserIds)) {
				if (!strictRoleUserIds.has(id)) universeUserIds.delete(id);
			}
		}

		if (usuario) {
			for (const id of Array.from(universeUserIds)) {
				if (id !== usuario) universeUserIds.delete(id);
			}
		}

		const evals = await localPrisma.eval.findMany({
			where,
			select: {
				id: true,
				estudiante: true,
				docente: true,
				codigo_materia: true,
				cmt_gen: true
			}
		});

		const evalIds = evals.map((e) => e.id);
		const detalles = evalIds.length
			? await localPrisma.eval_det.findMany({
					where: { eval_id: { in: evalIds } },
					select: { eval_id: true, a_e_id: true, cmt: true }
			  })
			: [];

		const aeIds = Array.from(new Set(detalles.map((d) => d.a_e_id).filter(Boolean)));
		const scoreMap = await getScoreMapByAeId(aeIds);

		return {
			cfgId,
			evals,
			detalles,
			scoreMap,
			meta: {
				totalEncuestasUniverse: universeUserIds.size,
				universeUserIds
			}
		};
	}

	async function getSummary(query) {
		const { evals, detalles, scoreMap, meta } = await getEvalBase(query);
		const withResponses = new Set(detalles.map((d) => d.eval_id));
		const usuarios = new Set(evals.map(getUsuarioFromEval).filter(Boolean));
		const materias = new Set(evals.map((e) => e.codigo_materia).filter(Boolean));

		let sumaTotal = 0;
		for (const d of detalles) {
			const score = scoreMap.get(d.a_e_id)?.puntaje;
			if (score != null) sumaTotal += Number(score);
		}

		const totalRespuestas = detalles.length;
		const promedioGeneral = totalRespuestas ? Number((sumaTotal / totalRespuestas).toFixed(4)) : null;

		if (tipoFormId === 2) {
			const usuariosRealizados = new Set(
				evals
					.filter((e) => withResponses.has(e.id))
					.map((e) => getUsuarioFromEval(e))
					.filter(Boolean)
					.map((u) => String(u))
			);

			for (const uid of Array.from(usuariosRealizados)) {
				if (!meta?.universeUserIds?.has(uid)) usuariosRealizados.delete(uid);
			}

			const totalEncuestas = Number(meta?.totalEncuestasUniverse || 0);
			const totalRealizadas = usuariosRealizados.size;
			const totalPendientes = Math.max(totalEncuestas - totalRealizadas, 0);

			return {
				generales: {
					tipo_form_id: tipoFormId,
					total_encuestas: totalEncuestas,
					total_realizadas: totalRealizadas,
					total_pendientes: totalPendientes
				}
			};
		}

		return {
			generales: {
				tipo_form_id: tipoFormId,
				total_evaluaciones_registradas: evals.length,
				total_realizadas: withResponses.size,
				total_pendientes: Math.max(evals.length - withResponses.size, 0),
				total_usuarios: usuarios.size,
				total_materias: materias.size,
				total_respuestas: totalRespuestas,
				suma_total: Number(sumaTotal.toFixed(4)),
				promedio_general: promedioGeneral
			}
		};
	}

	async function getSummaryByProgram(query) {
		if (tipoFormId !== 2) {
			throw new Error('summary by program is available only for encuesta (tipo_form_id=2)');
		}

		const programaSeleccionado = query?.programa ? String(query.programa) : null;
		const summaryQuery = { ...query };
		delete summaryQuery.programa;

		const { evals, detalles, meta } = await getEvalBase(summaryQuery);
		const withResponses = new Set(detalles.map((d) => d.eval_id));
		const usuariosRealizados = new Set(
			evals
				.filter((e) => withResponses.has(e.id))
				.map((e) => getUsuarioFromEval(e))
				.filter(Boolean)
				.map((u) => String(u))
		);

		const vistaRows = await getScopedVistaRows(
			summaryQuery,
			{},
			{
				ID_ESTUDIANTE: true,
				ID_DOCENTE: true,
				NOM_PROGRAMA: true,
				SEMESTRE: true,
				GRUPO: true
			}
		);

		const semestresDelProgramaSeleccionado = new Set();
		if (programaSeleccionado) {
			for (const row of vistaRows) {
				if (String(row?.NOM_PROGRAMA || 'SIN_PROGRAMA') === programaSeleccionado && row?.SEMESTRE) {
					semestresDelProgramaSeleccionado.add(row.SEMESTRE);
				}
			}
		}

		const byPrograma = new Map();
		for (const row of vistaRows) {
			const nombrePrograma = row?.NOM_PROGRAMA || 'SIN_PROGRAMA';
			if (!byPrograma.has(nombrePrograma)) {
				byPrograma.set(nombrePrograma, {
					nombre: nombrePrograma,
					rows: [],
					semestres: new Set(),
					usuarios: new Set(),
					byGrupo: new Map()
				});
			}

			const programaEntry = byPrograma.get(nombrePrograma);
			programaEntry.rows.push(row);
			if (row?.SEMESTRE) programaEntry.semestres.add(row.SEMESTRE);

			if (row?.ID_ESTUDIANTE != null) programaEntry.usuarios.add(String(row.ID_ESTUDIANTE));
			if (row?.ID_DOCENTE != null) programaEntry.usuarios.add(String(row.ID_DOCENTE));

			const grupoNombre = row?.GRUPO || 'SIN_GRUPO';
			if (!programaEntry.byGrupo.has(grupoNombre)) {
				programaEntry.byGrupo.set(grupoNombre, new Set());
			}
			if (row?.ID_ESTUDIANTE != null) programaEntry.byGrupo.get(grupoNombre).add(String(row.ID_ESTUDIANTE));
			if (row?.ID_DOCENTE != null) programaEntry.byGrupo.get(grupoNombre).add(String(row.ID_DOCENTE));
		}

		const universoPermitido = meta?.universeUserIds instanceof Set ? meta.universeUserIds : new Set();
		for (const uid of Array.from(usuariosRealizados)) {
			if (!universoPermitido.has(uid)) usuariosRealizados.delete(uid);
		}

		const programas = [];
		for (const [nombrePrograma, programaEntry] of byPrograma.entries()) {
			if (programaSeleccionado && semestresDelProgramaSeleccionado.size > 0) {
				const hayInterseccion = Array.from(programaEntry.semestres).some((s) => semestresDelProgramaSeleccionado.has(s));
				if (!hayInterseccion) continue;
			}

			const usuariosPrograma = new Set(Array.from(programaEntry.usuarios).filter((uid) => universoPermitido.has(uid)));
			const totalEncuestas = usuariosPrograma.size;
			const totalRealizadas = Array.from(usuariosPrograma).filter((uid) => usuariosRealizados.has(uid)).length;
			const totalPendientes = Math.max(totalEncuestas - totalRealizadas, 0);

			const grupos = Array.from(programaEntry.byGrupo.entries()).map(([grupo, usuariosGrupoSet]) => {
				const usuariosGrupo = Array.from(usuariosGrupoSet).filter((uid) => universoPermitido.has(uid));
				const realizadasGrupo = usuariosGrupo.filter((uid) => usuariosRealizados.has(uid)).length;
				return {
					grupo,
					metricas: {
						total_encuestas: usuariosGrupo.length,
						total_realizadas: realizadasGrupo,
						total_pendientes: Math.max(usuariosGrupo.length - realizadasGrupo, 0)
					}
				};
			});

			grupos.sort((a, b) => String(a.grupo).localeCompare(String(b.grupo)));

			const programaData = {
				nombre: nombrePrograma,
				metricas: {
					total_encuestas: totalEncuestas,
					total_realizadas: totalRealizadas,
					total_pendientes: totalPendientes
				},
				grupos
			};

			if (programaSeleccionado && nombrePrograma === programaSeleccionado) {
				programaData.selected = true;
			}

			programas.push(programaData);
		}

		return { programas };
	}

	async function getUsuarios(query, search, sort, pagination) {
		const { evals, detalles, scoreMap } = await getEvalBase(query);
		const byUsuario = new Map();
		const evalById = new Map(evals.map((e) => [e.id, e]));

		for (const ev of evals) {
			const usuario = getUsuarioFromEval(ev);
			if (!usuario) continue;
			if (!byUsuario.has(usuario)) {
				byUsuario.set(usuario, {
					usuario,
					total_evaluaciones_registradas: 0,
					total_realizadas: 0,
					total_respuestas: 0,
					suma_total: 0,
					promedio_general: null,
					porcentaje_cumplimiento: 0
				});
			}
			byUsuario.get(usuario).total_evaluaciones_registradas += 1;
		}

		const respondedEvalsByUsuario = new Map();
		for (const d of detalles) {
			const ev = evalById.get(d.eval_id);
			if (!ev) continue;
			const usuario = getUsuarioFromEval(ev);
			if (!usuario) continue;
			const row = byUsuario.get(usuario);
			if (!row) continue;
			row.total_respuestas += 1;
			const score = scoreMap.get(d.a_e_id)?.puntaje;
			if (score != null) row.suma_total += Number(score);

			if (!respondedEvalsByUsuario.has(usuario)) respondedEvalsByUsuario.set(usuario, new Set());
			respondedEvalsByUsuario.get(usuario).add(d.eval_id);
		}

		for (const row of byUsuario.values()) {
			const realizadas = respondedEvalsByUsuario.get(row.usuario)?.size || 0;
			row.total_realizadas = realizadas;
			row.total_pendientes = Math.max(row.total_evaluaciones_registradas - realizadas, 0);
			row.promedio_general = row.total_respuestas ? Number((row.suma_total / row.total_respuestas).toFixed(4)) : null;
			row.suma_total = Number(row.suma_total.toFixed(4));
			row.porcentaje_cumplimiento = row.total_evaluaciones_registradas
				? Number(((realizadas * 100) / row.total_evaluaciones_registradas).toFixed(2))
				: 0;
		}

		return applySearchSortPagination(Array.from(byUsuario.values()), pagination, search, sort);
	}

	async function getRanking(query) {
		const result = await getUsuarios(query, {}, { sortBy: 'promedio_general', sortOrder: 'desc' }, { page: 1, limit: 1000 });
		return {
			ranking: result.data.map((item, index) => ({
				posicion: index + 1,
				...item
			}))
		};
	}

	async function getAspectos(query) {
		const { detalles, scoreMap } = await getEvalBase(query);
		const agg = new Map();
		let sumaTotal = 0;
		let totalRespuestas = 0;

		for (const d of detalles) {
			const meta = scoreMap.get(d.a_e_id);
			if (!meta?.aspecto_id) continue;
			const entry = agg.get(meta.aspecto_id) || {
				aspecto_id: meta.aspecto_id,
				nombre: meta.aspecto_nombre,
				total_respuestas: 0,
				suma: 0,
				promedio: null,
				comentarios: 0
			};
			entry.total_respuestas += 1;
			if (meta.puntaje != null) {
				const score = Number(meta.puntaje);
				entry.suma += score;
				sumaTotal += score;
				totalRespuestas += 1;
			}
			if (String(d.cmt || '').trim().length > 0) entry.comentarios += 1;
			agg.set(meta.aspecto_id, entry);
		}

		const aspectos = Array.from(agg.values()).map((a) => ({
			...a,
			suma: Number(a.suma.toFixed(4)),
			promedio: a.total_respuestas ? Number((a.suma / a.total_respuestas).toFixed(4)) : null
		}));

		aspectos.sort((a, b) => Number(b.promedio ?? -Infinity) - Number(a.promedio ?? -Infinity));
		const notaGeneral = totalRespuestas ? Number((sumaTotal / totalRespuestas).toFixed(4)) : null;
		const response = {
			aspectos,
			total_respuestas: totalRespuestas,
			suma_total: Number(sumaTotal.toFixed(4)),
			nota_general: notaGeneral
		};

		if (tipoFormId === 2) {
			response.nota_final_encuesta = notaGeneral;
		}

		return response;
	}

	async function getScopedVistaRows(query, extraWhere = {}, select = {}) {
		const whereVista = {
			...buildVistaWhere({
				sede: query?.sede,
				periodo: query?.periodo,
				programa: query?.programa,
				semestre: query?.semestre,
				grupo: query?.grupo
			}),
			...extraWhere
		};

		let rows = await userPrisma.vista_academica_insitus.findMany({ where: whereVista, select });

		const roleMixIds = parseRolMixIds(query?.rol_mix ?? query?.rol_mix_ids);
		const strictRoleUserIds = await resolveRoleUserIds(roleMixIds);
		if (strictRoleUserIds !== null) {
			rows = rows.filter((r) => strictRoleUserIds.has(String(r.ID_ESTUDIANTE || '')) || strictRoleUserIds.has(String(r.ID_DOCENTE || '')));
		}

		return rows;
	}

	async function getDocentesAspectos(query, search = {}, sort = {}, pagination = {}) {
		const { evals, detalles } = await getEvalBase(query);
		const withResponses = new Set(detalles.map((d) => d.eval_id));

		const respondedByDocenteMateriaEst = new Set();
		for (const ev of evals) {
			if (!withResponses.has(ev.id)) continue;
			const docenteId = String(ev.docente || '');
			const materiaCode = String(ev.codigo_materia || 'SIN_MATERIA');
			const estudianteId = String(ev.estudiante || '');
			if (!docenteId || !estudianteId) continue;
			respondedByDocenteMateriaEst.add(`${docenteId}|${materiaCode}|${estudianteId}`);
		}

		const vistaRows = await getScopedVistaRows(
			query,
			{},
			{
				ID_DOCENTE: true,
				DOCENTE: true,
				COD_ASIGNATURA: true,
				ASIGNATURA: true,
				NOM_PROGRAMA: true,
				SEMESTRE: true,
				GRUPO: true,
				ID_ESTUDIANTE: true
			}
		);

		const byDocente = new Map();
		const seenRows = new Set();

		for (const row of vistaRows) {
			const docenteId = String(row?.ID_DOCENTE || '');
			if (!docenteId) continue;
			const docenteNombreNormalizado = String(row?.DOCENTE || '').replace(/\s+/g, ' ').trim().toUpperCase();
			if (docenteId === '3115' || docenteNombreNormalizado === 'DOCENTE SIN ASIGNAR') continue;
			const nombreDocente = row?.DOCENTE || null;
			const materiaCode = row?.COD_ASIGNATURA != null ? String(row.COD_ASIGNATURA) : 'SIN_MATERIA';
			const materiaNombre = row?.ASIGNATURA || null;
			const programaNombre = row?.NOM_PROGRAMA || null;
			const semestreNombre = row?.SEMESTRE || null;
			const grupoNombre = row?.GRUPO || 'SIN_GRUPO';
			const estudianteId = String(row?.ID_ESTUDIANTE || '');
			if (!estudianteId) continue;

			const uniqueRowKey = `${docenteId}|${materiaCode}|${grupoNombre}|${estudianteId}`;
			if (seenRows.has(uniqueRowKey)) continue;
			seenRows.add(uniqueRowKey);

			if (!byDocente.has(docenteId)) {
				byDocente.set(docenteId, {
					docente: docenteId,
					nombre_docente: nombreDocente,
					total_evaluaciones: 0,
					total_realizadas: 0,
					total_pendientes: 0,
					materiasMap: new Map()
				});
			}

			const docenteEntry = byDocente.get(docenteId);
			if (!docenteEntry.nombre_docente && nombreDocente) docenteEntry.nombre_docente = nombreDocente;
			docenteEntry.total_evaluaciones += 1;

			if (!docenteEntry.materiasMap.has(materiaCode)) {
				docenteEntry.materiasMap.set(materiaCode, {
					codigo_materia: materiaCode,
					nombre_materia: materiaNombre,
					nom_programa: null,
					semestre: null,
					total_evaluaciones: 0,
					total_realizadas: 0,
					total_pendientes: 0,
					porcentaje_cumplimiento: 0,
					gruposMap: new Map(),
					nomProgramaCountMap: new Map(),
					semestreCountMap: new Map()
				});
			}

			const materiaEntry = docenteEntry.materiasMap.get(materiaCode);
			if (!materiaEntry.nombre_materia && materiaNombre) materiaEntry.nombre_materia = materiaNombre;
			if (programaNombre) {
				materiaEntry.nomProgramaCountMap.set(
					programaNombre,
					(materiaEntry.nomProgramaCountMap.get(programaNombre) || 0) + 1
				);
			}
			if (semestreNombre) {
				materiaEntry.semestreCountMap.set(
					semestreNombre,
					(materiaEntry.semestreCountMap.get(semestreNombre) || 0) + 1
				);
			}
			materiaEntry.total_evaluaciones += 1;

			if (!materiaEntry.gruposMap.has(grupoNombre)) {
				materiaEntry.gruposMap.set(grupoNombre, {
					grupo: grupoNombre,
					total_evaluaciones: 0,
					total_realizadas: 0,
					total_pendientes: 0
				});
			}

			const grupoEntry = materiaEntry.gruposMap.get(grupoNombre);
			grupoEntry.total_evaluaciones += 1;

			const wasResponded = respondedByDocenteMateriaEst.has(`${docenteId}|${materiaCode}|${estudianteId}`);
			if (wasResponded) {
				docenteEntry.total_realizadas += 1;
				materiaEntry.total_realizadas += 1;
				grupoEntry.total_realizadas += 1;
			}
		}

		const rows = Array.from(byDocente.values()).map((docenteEntry) => {
			docenteEntry.total_pendientes = Math.max(docenteEntry.total_evaluaciones - docenteEntry.total_realizadas, 0);

			const materias = Array.from(docenteEntry.materiasMap.values()).map((materiaEntry) => {
				materiaEntry.nom_programa = getMostFrequentValue(materiaEntry.nomProgramaCountMap);
				materiaEntry.semestre = getMostFrequentValue(materiaEntry.semestreCountMap);
				materiaEntry.total_pendientes = Math.max(materiaEntry.total_evaluaciones - materiaEntry.total_realizadas, 0);
				materiaEntry.porcentaje_cumplimiento = materiaEntry.total_evaluaciones
					? Number(((materiaEntry.total_realizadas * 100) / materiaEntry.total_evaluaciones).toFixed(2))
					: 0;

				const grupos = Array.from(materiaEntry.gruposMap.values()).map((grupoEntry) => ({
					...grupoEntry,
					total_pendientes: Math.max(grupoEntry.total_evaluaciones - grupoEntry.total_realizadas, 0)
				}));

				grupos.sort((a, b) => String(a.grupo).localeCompare(String(b.grupo)));

				return {
					codigo_materia: materiaEntry.codigo_materia,
					nombre_materia: materiaEntry.nombre_materia,
					nom_programa: materiaEntry.nom_programa,
					semestre: materiaEntry.semestre,
					total_evaluaciones: materiaEntry.total_evaluaciones,
					total_realizadas: materiaEntry.total_realizadas,
					total_pendientes: materiaEntry.total_pendientes,
					porcentaje_cumplimiento: materiaEntry.porcentaje_cumplimiento,
					grupos
				};
			});

			materias.sort((a, b) => Number(b.total_evaluaciones) - Number(a.total_evaluaciones));

			return {
				docente: docenteEntry.docente,
				nombre_docente: docenteEntry.nombre_docente,
				total_evaluaciones: docenteEntry.total_evaluaciones,
				total_realizadas: docenteEntry.total_realizadas,
				total_pendientes: docenteEntry.total_pendientes,
				materias
			};
		});

		let filtered = rows;
		if (search?.isActive && search?.term) {
			const term = search.caseSensitive ? String(search.term) : String(search.term).toLowerCase();
			filtered = rows.filter((r) => {
				const text = String(r.nombre_docente || '');
				const haystack = search.caseSensitive ? text : text.toLowerCase();
				return haystack.includes(term);
			});
		}

		const sortBy = sort?.sortBy || 'total_evaluaciones';
		const sortOrder = sort?.sortOrder === 'asc' ? 'asc' : 'desc';
		const factor = sortOrder === 'asc' ? 1 : -1;
		filtered.sort((a, b) => {
			const av = a?.[sortBy];
			const bv = b?.[sortBy];
			if (av == null && bv == null) return 0;
			if (av == null) return 1;
			if (bv == null) return -1;
			if (typeof av === 'string' || typeof bv === 'string') {
				return factor * String(av).localeCompare(String(bv));
			}
			return factor * (Number(av) - Number(bv));
		});

		const page = Math.max(1, Number(pagination?.page) || 1);
		const limit = Math.max(1, Number(pagination?.limit) || 10);
		const total = filtered.length;
		const start = (page - 1) * limit;

		return {
			data: filtered.slice(start, start + limit),
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit) || 1
			}
		};
	}

	async function getDocenteMaterias(query) {
		const docente = String(query?.docente || '');
		if (!docente) throw new Error('docente is required');

		const { evals, detalles, scoreMap } = await getEvalBase(query);
		const evalsDocente = evals.filter((e) => String(e.docente || '') === docente);
		const evalById = new Map(evalsDocente.map((e) => [e.id, e]));
		const evalIdsDoc = new Set(evalsDocente.map((e) => e.id));
		const detallesDocente = detalles.filter((d) => evalIdsDoc.has(d.eval_id));

		const vistaRows = await getScopedVistaRows(
			query,
			{ ID_DOCENTE: docente },
			{ ID_DOCENTE: true, DOCENTE: true, COD_ASIGNATURA: true, ASIGNATURA: true, ID_ESTUDIANTE: true }
		);

		const nombreDocente = vistaRows.find((r) => r.DOCENTE)?.DOCENTE || null;
		const metaByMateria = new Map();
		for (const row of vistaRows) {
			const code = row.COD_ASIGNATURA != null ? String(row.COD_ASIGNATURA) : 'SIN_MATERIA';
			const entry = metaByMateria.get(code) || {
				codigo_materia: code,
				nombre_materia: row.ASIGNATURA || null,
				estudiantes: new Set()
			};
			if (row.ID_ESTUDIANTE) entry.estudiantes.add(String(row.ID_ESTUDIANTE));
			metaByMateria.set(code, entry);
		}

		const byMateria = new Map();
		for (const ev of evalsDocente) {
			const code = ev.codigo_materia ? String(ev.codigo_materia) : 'SIN_MATERIA';
			const entry = byMateria.get(code) || {
				codigo_materia: code,
				total_encuestas_registradas: 0,
				total_realizadas: 0,
				total_pendientes: 0,
				total_respuestas: 0,
				suma_total: 0,
				promedio_general: null
			};
			entry.total_encuestas_registradas += 1;
			byMateria.set(code, entry);
		}

		const respondedByMateria = new Map();
		for (const d of detallesDocente) {
			const ev = evalById.get(d.eval_id);
			if (!ev) continue;
			const code = ev.codigo_materia ? String(ev.codigo_materia) : 'SIN_MATERIA';
			const row = byMateria.get(code);
			if (!row) continue;
			row.total_respuestas += 1;
			const score = scoreMap.get(d.a_e_id)?.puntaje;
			if (score != null) row.suma_total += Number(score);
			if (!respondedByMateria.has(code)) respondedByMateria.set(code, new Set());
			respondedByMateria.get(code).add(d.eval_id);
		}

		const materias = Array.from(byMateria.values()).map((row) => {
			const meta = metaByMateria.get(row.codigo_materia);
			const totalEsperadas = meta?.estudiantes?.size || row.total_encuestas_registradas;
			const realizadas = respondedByMateria.get(row.codigo_materia)?.size || 0;
			return {
				...row,
				nombre_materia: meta?.nombre_materia || null,
				total_encuestas: totalEsperadas,
				total_realizadas: realizadas,
				total_pendientes: Math.max(totalEsperadas - realizadas, 0),
				suma_total: Number(row.suma_total.toFixed(4)),
				promedio_general: row.total_respuestas ? Number((row.suma_total / row.total_respuestas).toFixed(4)) : null
			};
		});

		materias.sort((a, b) => Number(b.promedio_general ?? -Infinity) - Number(a.promedio_general ?? -Infinity));

		return {
			docente,
			nombre_docente: nombreDocente,
			materias
		};
	}

	async function getDocenteMateriaCompletion(query) {
		const docente = String(query?.docente || '');
		if (!docente) throw new Error('docente is required');
		const codigoMateria = String(query?.codigo_materia || '');
		if (!codigoMateria) throw new Error('codigo_materia is required');
		const cfgId = Number(query?.cfg_t);
		if (!cfgId) throw new Error('cfg_t is required');

		const codigoMatNum = Number(codigoMateria);
		const extraWhere = { ID_DOCENTE: docente };
		if (!Number.isNaN(codigoMatNum)) extraWhere.COD_ASIGNATURA = codigoMatNum;

		const vistaRows = await getScopedVistaRows(
			query,
			extraWhere,
			{
				ID_ESTUDIANTE: true,
				PRIMER_APELLIDO: true,
				SEGUNDO_APELLIDO: true,
				PRIMER_NOMBRE: true,
				SEGUNDO_NOMBRE: true,
				GRUPO: true,
				DOCENTE: true
			}
		);

		const studentIdsFromVista = Array.from(
			new Set(
				vistaRows
					.map((row) => (row?.ID_ESTUDIANTE != null ? String(row.ID_ESTUDIANTE) : null))
					.filter(Boolean)
			)
		);

		const aliasToStudentId = new Map();
		const aliasesByStudentId = new Map();
		for (const studentId of studentIdsFromVista) {
			aliasToStudentId.set(studentId, studentId);
			aliasesByStudentId.set(studentId, new Set([studentId]));
		}

		if (studentIdsFromVista.length) {
			const numericStudentIds = studentIdsFromVista
				.map((value) => Number(value))
				.filter((value) => Number.isFinite(value));

			const authUsers = await authPrisma.datalogin.findMany({
				where: {
					OR: [
						{ user_id: { in: numericStudentIds } },
						{ user_username: { in: studentIdsFromVista } }
					]
				},
				select: { user_id: true, user_username: true }
			});

			for (const user of authUsers) {
				const uid = user?.user_id != null ? String(user.user_id) : null;
				const uname = user?.user_username ? String(user.user_username) : null;

				if (uid && aliasesByStudentId.has(uid)) {
					const set = aliasesByStudentId.get(uid);
					set.add(uid);
					if (uname) set.add(uname);
				}
				if (uname && aliasesByStudentId.has(uname)) {
					const set = aliasesByStudentId.get(uname);
					set.add(uname);
					if (uid) set.add(uid);
				}

				if (uid) aliasToStudentId.set(uid, uid);
				if (uname && !aliasToStudentId.has(uname)) aliasToStudentId.set(uname, uname);
			}
		}

		const { evals, detalles } = await getEvalBase(query);
		const evalsByStudent = evals.filter((ev) => {
			if (!ev?.estudiante) return false;
			return aliasToStudentId.has(String(ev.estudiante));
		});
		const evalIds = new Set(evalsByStudent.map((e) => e.id));
		const withResp = new Set(
			detalles
				.filter((d) => evalIds.has(d.eval_id))
				.map((d) => d.eval_id)
		);

		const completedAliases = new Set(
			evalsByStudent
				.filter((ev) => withResp.has(ev.id))
				.map((ev) => (ev?.estudiante != null ? String(ev.estudiante) : null))
				.filter(Boolean)
		);

		const completedIds = new Set();
		for (const [studentId, aliases] of aliasesByStudentId.entries()) {
			for (const alias of aliases) {
				if (completedAliases.has(alias)) {
					completedIds.add(studentId);
					break;
				}
			}
		}

		const byGrupo = new Map();
		for (const row of vistaRows) {
			if (!row?.ID_ESTUDIANTE) continue;
			const grupo = row.GRUPO || 'SIN_GRUPO';
			const entry = byGrupo.get(grupo) || { grupo, students: new Map() };
			if (!entry.students.has(String(row.ID_ESTUDIANTE))) {
				entry.students.set(String(row.ID_ESTUDIANTE), {
					id: String(row.ID_ESTUDIANTE),
					nombre: [row.PRIMER_APELLIDO, row.SEGUNDO_APELLIDO, row.PRIMER_NOMBRE, row.SEGUNDO_NOMBRE]
						.filter(Boolean)
						.join(' ')
						.replace(/\s+/g, ' ')
						.trim()
				});
			}
			byGrupo.set(grupo, entry);
		}

		const grupos = [];
		for (const { grupo, students } of byGrupo.values()) {
			const allStudents = Array.from(students.values());
			grupos.push({
				grupo,
				completados: allStudents.filter((s) => completedIds.has(s.id)),
				pendientes: allStudents.filter((s) => !completedIds.has(s.id))
			});
		}

		const nombreDocente = vistaRows.find((r) => r.DOCENTE)?.DOCENTE || null;

		return {
			docente,
			nombre_docente: nombreDocente,
			codigo_materia: codigoMateria,
			grupos
		};
	}

	async function getUsuarioMaterias(query) {
		if (!allowMateria) throw new Error('Este tipo_form no usa métricas por materia');
		if (!query?.usuario) throw new Error('usuario is required');
		const usuario = String(query.usuario);
		const { evals, detalles, scoreMap } = await getEvalBase({ ...query, usuario });
		const evalById = new Map(evals.map((e) => [e.id, e]));
		const byMateria = new Map();

		for (const ev of evals) {
			const key = ev.codigo_materia || 'SIN_MATERIA';
			if (!byMateria.has(key)) {
				byMateria.set(key, {
					codigo_materia: ev.codigo_materia,
					total_evaluaciones_registradas: 0,
					total_realizadas: 0,
					total_respuestas: 0,
					suma_total: 0,
					promedio_general: null
				});
			}
			byMateria.get(key).total_evaluaciones_registradas += 1;
		}

		const respondedByMateria = new Map();
		for (const d of detalles) {
			const ev = evalById.get(d.eval_id);
			if (!ev) continue;
			const key = ev.codigo_materia || 'SIN_MATERIA';
			const row = byMateria.get(key);
			if (!row) continue;
			row.total_respuestas += 1;
			const score = scoreMap.get(d.a_e_id)?.puntaje;
			if (score != null) row.suma_total += Number(score);
			if (!respondedByMateria.has(key)) respondedByMateria.set(key, new Set());
			respondedByMateria.get(key).add(d.eval_id);
		}

		for (const [key, row] of byMateria.entries()) {
			const realizadas = respondedByMateria.get(key)?.size || 0;
			row.total_realizadas = realizadas;
			row.total_pendientes = Math.max(row.total_evaluaciones_registradas - realizadas, 0);
			row.promedio_general = row.total_respuestas ? Number((row.suma_total / row.total_respuestas).toFixed(4)) : null;
			row.suma_total = Number(row.suma_total.toFixed(4));
		}

		return {
			usuario,
			materias: Array.from(byMateria.values()).sort((a, b) => Number(b.promedio_general ?? -Infinity) - Number(a.promedio_general ?? -Infinity))
		};
	}

	async function getUsuarioMateriaCompletion(query) {
		if (!allowMateria) throw new Error('Este tipo_form no usa métricas por materia');
		if (!query?.usuario) throw new Error('usuario is required');
		if (!query?.codigo_materia) throw new Error('codigo_materia is required');
		const usuario = String(query.usuario);
		const codigo_materia = String(query.codigo_materia);
		const data = await getUsuarioMaterias({ ...query, usuario });
		const materia = data.materias.find((m) => String(m.codigo_materia) === codigo_materia);
		if (!materia) {
			return {
				usuario,
				codigo_materia,
				total_evaluaciones_registradas: 0,
				total_realizadas: 0,
				total_pendientes: 0,
				porcentaje_cumplimiento: 0
			};
		}
		const porcentaje = materia.total_evaluaciones_registradas
			? Number(((materia.total_realizadas * 100) / materia.total_evaluaciones_registradas).toFixed(2))
			: 0;
		return {
			usuario,
			codigo_materia,
			total_evaluaciones_registradas: materia.total_evaluaciones_registradas,
			total_realizadas: materia.total_realizadas,
			total_pendientes: materia.total_pendientes,
			porcentaje_cumplimiento: porcentaje
		};
	}

	return {
		getSummary,
		getSummaryByProgram,
		getRanking,
		getUsuarios,
		getAspectos,
		getDocentesAspectos,
		getDocenteMaterias,
		getDocenteMateriaCompletion,
		getUsuarioMaterias,
		getUsuarioMateriaCompletion
	};
}

module.exports = {
	buildVistaWhere,
	createMetricFormRepository
};
