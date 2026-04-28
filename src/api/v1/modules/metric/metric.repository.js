const { localPrisma, userPrisma } = require('../../../../prisma/clients');

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

// Calculate the most frequent value in an array (mode)
function getMostFrequent(values) {
	if (!values || values.length === 0) return null;
	const frequency = {};
	let maxCount = 0;
	let mostFrequent = null;
	
	for (const value of values) {
		if (value == null) continue;
		frequency[value] = (frequency[value] || 0) + 1;
		if (frequency[value] > maxCount) {
			maxCount = frequency[value];
			mostFrequent = value;
		}
	}
	
	return mostFrequent;
}

async function mapWithConcurrency(items, mapper, concurrency = 8) {
	if (!Array.isArray(items) || items.length === 0) return [];
	const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
	const results = new Array(items.length);
	let nextIndex = 0;

	async function worker() {
		while (true) {
			const current = nextIndex;
			nextIndex += 1;
			if (current >= items.length) return;
			results[current] = await mapper(items[current], current);
		}
	}

	await Promise.all(Array.from({ length: safeConcurrency }, () => worker()));
	return results;
}

async function computeEvaluationMetricsFromVista(vista, cfgId) {
	const estudiantesSet = new Set(vista.map(v => v.ID_ESTUDIANTE).filter(Boolean));
	const docentesSet = new Set(vista.map(v => v.ID_DOCENTE).filter(Boolean));

	const totalEstudiantes = estudiantesSet.size;
	const totalDocentes = docentesSet.size;

	// Map universe per (student, docente, asignatura, grupo)
	const universeKeys = vista
		.filter(v => v.ID_ESTUDIANTE && v.ID_DOCENTE)
		.map(v => `${v.ID_ESTUDIANTE}::${v.ID_DOCENTE}::${v.COD_ASIGNATURA}::${v.GRUPO}`);

	// Local evals for cfg and within filtered people
	const evals = (totalEstudiantes && totalDocentes)
		? await localPrisma.eval.findMany({
				where: {
					id_configuracion: cfgId,
					estudiante: { in: Array.from(estudiantesSet) },
					docente: { in: Array.from(docentesSet) }
				},
				select: { id: true, estudiante: true, docente: true, codigo_materia: true }
			})
		: [];

	const evalIds = evals.map(e => e.id);
	const evalDetAny = evalIds.length
		? await localPrisma.eval_det.findMany({
				where: { eval_id: { in: evalIds } },
				select: { eval_id: true, cmt: true }
			})
		: [];
	const evalsWithResponses = new Set(evalDetAny.map(d => d.eval_id));

	// Count realizadas only for evals that have at least one response
	const realizadas = evals.filter(e => evalsWithResponses.has(e.id)).length;

	// Total evaluaciones expected equals count of universe rows
	const totalEvaluaciones = universeKeys.length;
	const pendientes = Math.max(totalEvaluaciones - realizadas, 0);

	// Per-student completion: a student is "completed" only if every universe course row has a realized eval
	const universeByStudent = new Map();
	for (const v of vista) {
		if (!v.ID_ESTUDIANTE || !v.ID_DOCENTE) continue;
		const list = universeByStudent.get(v.ID_ESTUDIANTE) || [];
		list.push(`${v.ID_ESTUDIANTE}::${v.ID_DOCENTE}::${v.COD_ASIGNATURA}::${v.GRUPO}`);
		universeByStudent.set(v.ID_ESTUDIANTE, list);
	}

	// Build set of realized keys from local evals with responses
	const realizedKeys = new Set(
		evals
			.filter(e => evalsWithResponses.has(e.id))
			.map(e => `${e.estudiante}::${e.docente}::${Number(e.codigo_materia) || ''}::${''}`)
	);

	let completedStudents = 0;
	for (const [student, keys] of universeByStudent.entries()) {
		// For completion, ensure every key has a realized eval; match by student + docente + COD_ASIGNATURA
		const allDone = keys.every(k => {
			const [s, d, cod] = k.split('::');
			const keySimple = `${s}::${d}::${cod}::`;
			return realizedKeys.has(keySimple);
		});
		if (allDone) completedStudents += 1;
	}
	const totalEstudiantesPendientes = totalEstudiantes - completedStudents;

	// Per-docente completion: docente is "completed" only if all their students have completed all their evaluations
	const studentsByDocente = new Map();
	for (const v of vista) {
		if (!v.ID_DOCENTE || !v.ID_ESTUDIANTE) continue;
		const set = studentsByDocente.get(v.ID_DOCENTE) || new Set();
		set.add(v.ID_ESTUDIANTE);
		studentsByDocente.set(v.ID_DOCENTE, set);
	}

	let completedDocentes = 0;
	for (const [doc, stuSet] of studentsByDocente.entries()) {
		// docente completed if every student in their set is in completedStudents set
		const allStudentsCompleted = Array.from(stuSet).every(stu => {
			const keys = universeByStudent.get(stu) || [];
			return keys.every(k => {
				const [s, d, cod] = k.split('::');
				if (d !== doc) return true; // only consider pairs with this docente
				const keySimple = `${s}::${d}::${cod}::`;
				return realizedKeys.has(keySimple);
			});
		});
		if (allStudentsCompleted) completedDocentes += 1;
	}
	const totalDocentesPendientes = totalDocentes - completedDocentes;

	const total_evaluaciones_registradas = evals.length;
	const total_estudiantes_registrados = new Set(evals.map(e => e.estudiante).filter(Boolean)).size;

	return {
		total_evaluaciones: totalEvaluaciones,
		total_evaluaciones_registradas,
		total_realizadas: realizadas,
		total_pendientes: pendientes,
		total_estudiantes: totalEstudiantes,
		total_estudiantes_registrados,
		total_estudiantes_pendientes: totalEstudiantesPendientes,
		total_docentes: totalDocentes,
		total_docentes_pendientes: totalDocentesPendientes
	};
}

async function getEvaluationSummary({ cfg_t, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');

	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });

	// Universe from remote view (each row is a course-registration to be evaluated)
	const vista = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_ESTUDIANTE: true, ID_DOCENTE: true, COD_ASIGNATURA: true, GRUPO: true }
	});

	const estudiantesSet = new Set(vista.map(v => v.ID_ESTUDIANTE).filter(Boolean));
	const docentesSet = new Set(vista.map(v => v.ID_DOCENTE).filter(Boolean));

	const totalEstudiantes = estudiantesSet.size;
	const totalDocentes = docentesSet.size;

	// Map universe per (student, docente, asignatura, grupo)
	const universeKeys = vista
		.filter(v => v.ID_ESTUDIANTE && v.ID_DOCENTE)
		.map(v => `${v.ID_ESTUDIANTE}::${v.ID_DOCENTE}::${v.COD_ASIGNATURA}::${v.GRUPO}`);

	// Local evals for cfg and within filtered people
	const evals = await localPrisma.eval.findMany({
		where: {
			id_configuracion: cfgId,
			estudiante: { in: Array.from(estudiantesSet) },
			docente: { in: Array.from(docentesSet) }
		},
		select: { id: true, estudiante: true, docente: true, codigo_materia: true, cmt_gen: true }
	});

	const evalIds = evals.map(e => e.id);
	const evalDetAny = evalIds.length
		? await localPrisma.eval_det.findMany({
				where: { eval_id: { in: evalIds } },
				select: { eval_id: true, cmt: true }
			})
		: [];
	const evalsWithResponses = new Set(evalDetAny.map(d => d.eval_id));

	// Count realizadas only for evals that have at least one response
	const realizadas = evals.filter(e => evalsWithResponses.has(e.id)).length;

	// Total evaluaciones expected equals count of universe rows
	const totalEvaluaciones = universeKeys.length;
	const pendientes = Math.max(totalEvaluaciones - realizadas, 0);

	// Per-student completion: a student is "completed" only if every universe course row has a realized eval
	const universeByStudent = new Map();
	for (const v of vista) {
		if (!v.ID_ESTUDIANTE || !v.ID_DOCENTE) continue;
		const list = universeByStudent.get(v.ID_ESTUDIANTE) || [];
		list.push(`${v.ID_ESTUDIANTE}::${v.ID_DOCENTE}::${v.COD_ASIGNATURA}::${v.GRUPO}`);
		universeByStudent.set(v.ID_ESTUDIANTE, list);
	}

	// Build set of realized keys from local evals with responses
	const realizedKeys = new Set(
		evals
			.filter(e => evalsWithResponses.has(e.id))
			.map(e => `${e.estudiante}::${e.docente}::${Number(e.codigo_materia) || ''}::${''}`)
	);

	let completedStudents = 0;
	for (const [student, keys] of universeByStudent.entries()) {
		// For completion, ensure every key has a realized eval; match by student + docente + COD_ASIGNATURA
		const allDone = keys.every(k => {
			const [s, d, cod, grp] = k.split('::');
			const keySimple = `${s}::${d}::${cod}::`;
			return realizedKeys.has(keySimple);
		});
		if (allDone) completedStudents += 1;
	}
	const totalEstudiantesPendientes = totalEstudiantes - completedStudents;

	// Per-docente completion: docente is "completed" only if all their students have completed all their evaluations
	const studentsByDocente = new Map();
	for (const v of vista) {
		if (!v.ID_DOCENTE || !v.ID_ESTUDIANTE) continue;
		const set = studentsByDocente.get(v.ID_DOCENTE) || new Set();
		set.add(v.ID_ESTUDIANTE);
		studentsByDocente.set(v.ID_DOCENTE, set);
	}

	let completedDocentes = 0;
	for (const [doc, stuSet] of studentsByDocente.entries()) {
		// docente completed if every student in their set is in completedStudents set
		const allStudentsCompleted = Array.from(stuSet).every(stu => {
			const keys = universeByStudent.get(stu) || [];
			return keys.every(k => {
				const [s, d, cod, grp] = k.split('::');
				if (d !== doc) return true; // only consider pairs with this docente
				const keySimple = `${s}::${d}::${cod}::`;
				return realizedKeys.has(keySimple);
			});
		});
		if (allStudentsCompleted) completedDocentes += 1;
	}
	const totalDocentesPendientes = totalDocentes - completedDocentes;

	// Only apply dynamic filters if there are results in the filtered view
	// If no filters are applied and vista is empty, count all registrations for cfg_t
	const hasFilters = Boolean(sede || periodo || programa || semestre || grupo);
	const evalCountWhere = {
		id_configuracion: cfgId,
		...(hasFilters && { estudiante: { in: Array.from(estudiantesSet) }, docente: { in: Array.from(docentesSet) } })
	};

	const total_evaluaciones_registradas = await localPrisma.eval.count({ where: evalCountWhere });
	
	const estudiantesRegWhere = {
		id_configuracion: cfgId,
		...(hasFilters && { estudiante: { in: Array.from(estudiantesSet) }, docente: { in: Array.from(docentesSet) } })
	};
	const total_estudiantes_registrados = (await localPrisma.eval.findMany({
		where: estudiantesRegWhere,
		select: { estudiante: true }
	})).reduce((set, e) => {
		if (e.estudiante) set.add(e.estudiante);
		return set;
	}, new Set()).size;

	return {
		generales: {
			total_evaluaciones: totalEvaluaciones,
			// Evaluations registered in local (records created), regardless of responses
			total_evaluaciones_registradas,
			total_realizadas: realizadas,
			total_pendientes: pendientes,
			total_estudiantes: totalEstudiantes,
			// Students who have entered and loaded their courses (unique in local eval), regardless of answering
			total_estudiantes_registrados,
			total_estudiantes_pendientes: totalEstudiantesPendientes,
			total_docentes: totalDocentes,
			total_docentes_pendientes: totalDocentesPendientes
		}
	};
}

async function getEvaluationSummaryByProgram({ cfg_t, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');

	const whereVista = buildVistaWhere({ sede, periodo, semestre, grupo });

	const vista = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_ESTUDIANTE: true, ID_DOCENTE: true, COD_ASIGNATURA: true, GRUPO: true, NOM_PROGRAMA: true, SEMESTRE: true }
	});

	// Si se especificó un programa, obtener los semestres de ese programa
	let semestresDelProgramaSeleccionado = new Set();
	if (programa) {
		for (const v of vista) {
			if (v.NOM_PROGRAMA === programa && v.SEMESTRE) {
				semestresDelProgramaSeleccionado.add(v.SEMESTRE);
			}
		}
	}

	const byPrograma = new Map();
	for (const v of vista) {
		const programaNombre = v.NOM_PROGRAMA || 'SIN_PROGRAMA';
		const list = byPrograma.get(programaNombre) || [];
		list.push(v);
		byPrograma.set(programaNombre, list);
	}

	const programas = [];
	for (const [nombre, rows] of byPrograma.entries()) {
		// Si se especificó un programa, filtrar solo programas que compartan al menos un semestre
		if (programa && semestresDelProgramaSeleccionado.size > 0) {
			const semestresDeEsteProg = new Set(rows.map(r => r.SEMESTRE).filter(Boolean));
			const hayInterseccion = Array.from(semestresDeEsteProg).some(s => semestresDelProgramaSeleccionado.has(s));
			if (!hayInterseccion) continue;
		}

		const metricas = await computeEvaluationMetricsFromVista(rows, cfgId);

		const byGrupo = new Map();
		for (const r of rows) {
			const grupoNombre = r.GRUPO || 'SIN_GRUPO';
			const list = byGrupo.get(grupoNombre) || [];
			list.push(r);
			byGrupo.set(grupoNombre, list);
		}

		const grupos = [];
		for (const [grupo, rowsGrupo] of byGrupo.entries()) {
			const metricasGrupo = await computeEvaluationMetricsFromVista(rowsGrupo, cfgId);
			grupos.push({ grupo, metricas: metricasGrupo });
		}

		const programaObj = { nombre, metricas, grupos };
		// Marcar el programa seleccionado
		if (programa && nombre === programa) {
			programaObj.selected = true;
		}
		programas.push(programaObj);
	}

	return { programas };
}

async function getAllDocentesStats({ cfg_t, sede, periodo, programa, semestre, grupo, page = 1, limit = 10 }, search = {}, sort = {}) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');

	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });

	// ============================================================
	// STEP 1: Get UNIQUE docentes from vista with DISTINCT
	// This reduces the dataset size significantly
	// ⚠️ IMPORTANT: distinct requires orderBy in Prisma
	// ============================================================
	const vistaDistinct = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_DOCENTE: true, DOCENTE: true },
		distinct: ['ID_DOCENTE'],
		orderBy: { ID_DOCENTE: 'asc' } // ✅ Required for distinct to work properly
	});

	// ============================================================
	// STEP 2: Apply search filter on docente name (in memory, small dataset)
	// ============================================================
	let filteredDocentes = vistaDistinct;
	if (search?.isActive && search?.term) {
		const searchTerm = search.caseSensitive ? search.term : search.term.toLowerCase();
		filteredDocentes = vistaDistinct.filter(item => {
			const nombreDocente = item.DOCENTE || '';
			const searchableText = search.caseSensitive ? nombreDocente : nombreDocente.toLowerCase();
			// ✅ Use includes() to search ANYWHERE in the name (substring search)
			return searchableText.includes(searchTerm);
		});
	}

	// ============================================================
	// STEP 3: Apply sorting on docente names (in memory, small dataset)
	// ============================================================
	if (sort?.sortBy === 'nombre_docente' && sort?.sortOrder) {
		const order = sort.sortOrder === 'desc' ? -1 : 1;
		filteredDocentes.sort((a, b) => {
			const aVal = a.DOCENTE || '';
			const bVal = b.DOCENTE || '';
			return order * String(aVal).localeCompare(String(bVal));
		});
	}

	const total = filteredDocentes.length;
	const skip = (page - 1) * limit;
	const metricSortActive = Boolean(sort?.sortBy && sort?.sortBy !== 'nombre_docente' && sort?.sortOrder);

	let data = [];

	if (metricSortActive) {
		// For metric-based sorting, compute all matching docentes first,
		// then sort globally and paginate to keep pages stable.
		const allResults = await mapWithConcurrency(filteredDocentes, (docente) => getDocenteStats({
			cfg_t,
			docente: docente.ID_DOCENTE,
			sede,
			periodo,
			programa,
			semestre,
			grupo
		}), 8);

		const { sortBy, sortOrder } = sort;
		const order = sortOrder === 'desc' ? -1 : 1;
		allResults.sort((a, b) => {
			let aVal = a?.[sortBy];
			let bVal = b?.[sortBy];

			if (aVal == null) aVal = sortOrder === 'desc' ? -Infinity : Infinity;
			if (bVal == null) bVal = sortOrder === 'desc' ? -Infinity : Infinity;

			return order * (Number(aVal) - Number(bVal));
		});

		data = allResults.slice(skip, skip + limit);
	} else {
		// For name sorting (already applied), paginate first then compute page stats.
		const paginatedDocentes = filteredDocentes.slice(skip, skip + limit);
		data = await mapWithConcurrency(paginatedDocentes, (docente) => getDocenteStats({
			cfg_t,
			docente: docente.ID_DOCENTE,
			sede,
			periodo,
			programa,
			semestre,
			grupo
		}), 8);
	}

	return {
		data,
		pagination: {
			page,
			limit,
			total,
			pages: Math.ceil(total / limit) || 1
		}
	};
}

async function getDocenteStats({ cfg_t, docente, sede, periodo, programa, semestre, grupo, page = 1, limit = 10 }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) {
		return getAllDocentesStats({ cfg_t, sede, periodo, programa, semestre, grupo, page, limit });
	}

	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });
	whereVista.ID_DOCENTE = docente;

	const vista = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_ESTUDIANTE: true, COD_ASIGNATURA: true, GRUPO: true, DOCENTE: true }
	});
	const estudiantesSet = new Set(vista.map(v => v.ID_ESTUDIANTE).filter(Boolean));

	// Universe expected: count of rows (student-docente-materia-grupo)
	const universeKeys = vista
		.filter(v => v.ID_ESTUDIANTE)
		.map(v => `${v.ID_ESTUDIANTE}::${docente}::${v.COD_ASIGNATURA}::${v.GRUPO}`);

	const evalWhere = {
		id_configuracion: cfgId,
		docente,
		estudiante: { in: Array.from(estudiantesSet) }
	};
	const evals = await localPrisma.eval.findMany({
		where: evalWhere,
		select: { id: true, estudiante: true, docente: true, codigo_materia: true }
	});
	const evalIds = evals.map(e => e.id);

	const detalles = evalIds.length
		? await localPrisma.eval_det.findMany({
				where: { eval_id: { in: evalIds } },
				select: { eval_id: true, a_e_id: true }
			})
		: [];

	// Count aspects answered
	const totalAspectos = new Set(detalles.map(d => d.a_e_id)).size;

	// Realizadas: number of evals that have at least one response in eval_det
	const evalsWithResponses = new Set(detalles.map(d => d.eval_id));
	const totalRealizadas = evals.filter(e => evalsWithResponses.has(e.id)).length;

	// Registradas: all local eval records for cfg + docente (regardless of answers)
	const totalRegistradas = evals.length;

	// Estudiantes registrados: unique estudiantes with at least one local eval for cfg + docente
	const totalEstudiantesRegistrados = evals.reduce((set, e) => {
		if (e.estudiante) set.add(e.estudiante);
		return set;
	}, new Set()).size;

	// Compute docente score via a_e -> cfg_e.puntaje (exclude open questions with no scale/puntaje)
	const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
	let promedioGeneral = null;
	let desviacionGeneral = null;
	let suma = 0;
	const totalRespuestas = detalles.length;

	if (aeIds.length) {
		const aeRecords = await localPrisma.a_e.findMany({ 
			where: { id: { in: aeIds } }, 
			include: { cfg_a: { include: { ca_map: true } } }
		});
		const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.cfg_a?.ca_map?.aspecto_id]));
		const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));
		const escalaIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
		const cfgE = await localPrisma.cfg_e.findMany({ where: { id: { in: escalaIds } }, select: { id: true, puntaje: true } });
		const puntajeByEscala = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));
		
		// Aggregate all responses and by aspect
		const aspectScores = new Map();
		const aspectAverages = [];
		for (const d of detalles) {
			const realAspectId = aspectoByAe.get(d.a_e_id);
			if (!realAspectId) continue;
			const esc = escalaByAe.get(d.a_e_id);
			const val = esc ? puntajeByEscala.get(esc) : undefined;
			if (typeof val === 'number') {
				suma += val;
				const entry = aspectScores.get(realAspectId) || { sum: 0, count: 0 };
				entry.sum += val;
				entry.count += 1;
				aspectScores.set(realAspectId, entry);
			}
		}
		
		// Build aspect averages for standard deviation calculation
		for (const entry of aspectScores.values()) {
			const avg = entry.sum / entry.count;
			aspectAverages.push(avg);
		}
		
		// Calculate promedio_general: suma total / total respuestas
		if (totalRespuestas > 0) {
			promedioGeneral = suma / totalRespuestas;
			// Calculate standard deviation based on aspect averages
			if (aspectAverages.length > 0) {
				const mean = promedioGeneral;
				const variance = aspectAverages.reduce((acc, avg) => acc + Math.pow(avg - mean, 2), 0) / aspectAverages.length;
				desviacionGeneral = Math.sqrt(variance);
			}
		}
	}

	// Expected evaluations equals universe rows
	const totalEvaluaciones = universeKeys.length;
	const porcentajeCumplimiento = totalEvaluaciones ? (totalRealizadas / totalEvaluaciones) * 100 : 0;
	const totalPendientes = Math.max(totalEvaluaciones - totalRealizadas, 0);

	const nombreDocente = vista.length > 0 ? vista[0].DOCENTE : null;

	// Get autoevaluacion metrics and calculate final weighted score
	const PESO_ESTUDIANTES = 0.8;
	const PESO_AUTOEVALUACION = 0.2;
	
	const autoevaluacion = await getAutoevaluacionMetrics(docente);
	let notaFinalPonderada = null;
	let ponderadoEstudiantes = null;
	let ponderadoAutoevaluacion = null;

	// Calculate ponderado for evaluacion (80%)
	if (promedioGeneral != null) {
		ponderadoEstudiantes = promedioGeneral * PESO_ESTUDIANTES;
	}

	// Calculate ponderado for autoevaluacion (20%) if available
	if (autoevaluacion && autoevaluacion.promedio_general != null) {
		ponderadoAutoevaluacion = autoevaluacion.promedio_general * PESO_AUTOEVALUACION;
	}

	// Calculate final weighted score if both are available
	if (ponderadoEstudiantes != null && ponderadoAutoevaluacion != null) {
		notaFinalPonderada = ponderadoEstudiantes + ponderadoAutoevaluacion;
	}

	return {
		docente,
		nombre_docente: nombreDocente,
		promedio_general: promedioGeneral,
		desviacion_general: desviacionGeneral,
		nota_final_ponderada: notaFinalPonderada,
		total_evaluaciones: totalEvaluaciones,
		total_realizadas: totalRealizadas,
		total_pendientes: totalPendientes,
		total_evaluaciones_registradas: totalRegistradas,
		total_estudiantes_registrados: totalEstudiantesRegistrados,
		total_aspectos: totalAspectos,
		porcentaje_cumplimiento: porcentajeCumplimiento,
		suma
	};
}

async function getRanking({ cfg_t, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });

	const vista = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_DOCENTE: true, ID_ESTUDIANTE: true, DOCENTE: true }
	});
	const byDocente = new Map();
	for (const v of vista) {
		if (!v.ID_DOCENTE) continue;
		const entry = byDocente.get(v.ID_DOCENTE) || { students: new Set(), nombre: v.DOCENTE };
		entry.students.add(v.ID_ESTUDIANTE);
		byDocente.set(v.ID_DOCENTE, entry);
	}

	const docenteIds = Array.from(byDocente.keys());
	const estudianteIds = Array.from(new Set(vista.map(v => v.ID_ESTUDIANTE).filter(Boolean)));
	if (!docenteIds.length || !estudianteIds.length) {
		return {
			ranking: [],
			meta: {
				m: 20,
				global_avg: 0,
				participacion_promedio: 0,
				total_docentes: 0,
				docentes_con_respuestas: 0,
				docentes_sin_respuestas: 0
			}
		};
	}

	const evals = await localPrisma.eval.findMany({
		where: {
			id_configuracion: cfgId,
			docente: { in: docenteIds },
			estudiante: { in: estudianteIds }
		},
		select: {
			id: true,
			docente: true,
			estudiante: true,
			cmt_gen: true
		}
	});

	const evalById = new Map(evals.map(e => [e.id, e]));
	const evalIds = evals.map(e => e.id);
	const detalles = evalIds.length
		? await localPrisma.eval_det.findMany({
				where: { eval_id: { in: evalIds } },
				select: { eval_id: true, a_e_id: true, cmt: true }
			})
		: [];

	const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
	const aeRecords = aeIds.length
		? await localPrisma.a_e.findMany({ where: { id: { in: aeIds } }, select: { id: true, escala_id: true } })
		: [];
	const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));
	const cfgEIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
	const cfgE = cfgEIds.length
		? await localPrisma.cfg_e.findMany({ where: { id: { in: cfgEIds } }, select: { id: true, puntaje: true } })
		: [];
	const puntajeByCfgEId = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));

	const statsByDocente = new Map();
	for (const [docente, info] of byDocente.entries()) {
		statsByDocente.set(docente, {
			docente,
			nombre_docente: info.nombre || null,
			universo: info.students.size,
			suma_puntajes: 0,
			total_respuestas: 0,
			puntajes: [],
			comentarios_cmt: 0,
			comentarios_cmt_gen: 0,
			respuestas_estudiantes_set: new Set()
		});
	}

	for (const e of evals) {
		const st = statsByDocente.get(e.docente);
		if (!st) continue;
		if (String(e.cmt_gen || '').trim().length > 0) st.comentarios_cmt_gen += 1;
	}

	for (const d of detalles) {
		const e = evalById.get(d.eval_id);
		if (!e) continue;
		const st = statsByDocente.get(e.docente);
		if (!st) continue;

		const escalaId = escalaByAe.get(d.a_e_id);
		const puntaje = escalaId ? puntajeByCfgEId.get(escalaId) : undefined;
		if (typeof puntaje === 'number') {
			st.suma_puntajes += puntaje;
			st.total_respuestas += 1;
			st.puntajes.push(puntaje);
			if (e.estudiante) st.respuestas_estudiantes_set.add(e.estudiante);
		}

		if (String(d.cmt || '').trim().length > 0) {
			st.comentarios_cmt += 1;
		}
	}

	const docentesConRespuestas = Array.from(statsByDocente.values()).filter(d => d.total_respuestas > 0);
	const docentesSinRespuestas = Array.from(statsByDocente.values()).filter(d => d.total_respuestas === 0);

	function median(values) {
		if (!values.length) return 0;
		const sorted = [...values].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	}

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function roundToTwo(value) {
		if (typeof value !== 'number' || Number.isNaN(value)) return value;
		return Number(value.toFixed(2));
	}

	const totalRespuestasPorDocente = docentesConRespuestas.map(d => d.total_respuestas);
	const medianRaw = median(totalRespuestasPorDocente);
	const m = clamp(medianRaw || 20, 10, 50);

	let globalSum = 0;
	let globalCount = 0;
	for (const d of docentesConRespuestas) {
		globalSum += d.suma_puntajes;
		globalCount += d.total_respuestas;
	}
	const globalAvg = globalCount > 0 ? globalSum / globalCount : 0;

	const participaciones = docentesConRespuestas
		.filter(d => d.universo > 0)
		.map(d => d.respuestas_estudiantes_set.size / d.universo);
	const participacionPromedio = participaciones.length
		? participaciones.reduce((acc, p) => acc + p, 0) / participaciones.length
		: 0;

	const results = await Promise.all(docentesConRespuestas.map(async (d) => {
		const promedioDocente = d.total_respuestas > 0 ? d.suma_puntajes / d.total_respuestas : 0;
		const desviacion = d.total_respuestas > 0
			? Math.sqrt(d.puntajes.reduce((acc, x) => acc + Math.pow(x - promedioDocente, 2), 0) / d.total_respuestas)
			: null;

		const v = d.total_respuestas;
		const adjusted = (v / (v + m)) * promedioDocente + (m / (v + m)) * globalAvg;

		const respuestasUnicas = d.respuestas_estudiantes_set.size;
		const participacion = d.universo > 0 ? (respuestasUnicas / d.universo) : 0;
		const factorParticipacion = participacionPromedio > 0
			? Math.sqrt((participacion + participacionPromedio) / (2 * participacionPromedio))
			: 1;
		const factorConfianza = Math.min(1, v / m);
		const scoreRank = adjusted * factorParticipacion * factorConfianza;

		// Get all stats from getDocenteStats
		const docenteStats = await getDocenteStats({ cfg_t, docente: d.docente, sede, periodo, programa, semestre, grupo });
		
		// Get eval metrics from getDocenteAspectMetrics for this docente
		const aspectMetrics = await getDocenteAspectMetrics({ cfg_t, docente: d.docente });
		const evalData = {
			total_respuestas: aspectMetrics?.evaluacion_estudiantes?.total_respuestas ?? v,
			total_cmt: aspectMetrics?.evaluacion_estudiantes?.total_cmt ?? 0,
			total_cmt_gen: aspectMetrics?.evaluacion_estudiantes?.total_cmt_gen ?? 0,
			suma_cmt: aspectMetrics?.evaluacion_estudiantes?.suma_cmt ?? 0,
			nota_final_ponderada: aspectMetrics?.resultado_final?.nota_final_ponderada ?? aspectMetrics?.evaluacion_estudiantes?.promedio_general ?? roundToTwo(promedioDocente)
		};

		return {
			docente: d.docente,
			nombre_docente: d.nombre_docente,
			total_evaluaciones: docenteStats?.total_evaluaciones ?? 0,
			total_realizadas: docenteStats?.total_realizadas ?? 0,
			total_pendientes: docenteStats?.total_pendientes ?? 0,
			total_evaluaciones_registradas: docenteStats?.total_evaluaciones_registradas ?? 0,
			total_estudiantes_registrados: docenteStats?.total_estudiantes_registrados ?? 0,
			porcentaje_cumplimiento: docenteStats?.porcentaje_cumplimiento != null ? roundToTwo(docenteStats.porcentaje_cumplimiento) : 0,
			score_rank: roundToTwo(scoreRank),
			promedio_docente: roundToTwo(promedioDocente),
			promedio_evaluacion: roundToTwo(promedioDocente),
			adjusted: roundToTwo(adjusted),
			universo: d.universo,
			desviacion_estandar: desviacion == null ? null : roundToTwo(desviacion),
			eval: evalData,
			factores: {
				v,
				m,
				global_avg: roundToTwo(globalAvg),
				participacion_promedio: roundToTwo(participacionPromedio),
				factor_participacion: roundToTwo(factorParticipacion),
				factor_confianza: roundToTwo(factorConfianza)
			},
			calculo: {
				promedio_docente: {
					suma_puntajes: d.suma_puntajes,
					total_respuestas: v,
					formula: 'SUM(puntajes) / total_respuestas'
				},
				adjusted: {
					formula: '(v/(v+m))*promedio_docente + (m/(v+m))*global_avg'
				},
				score_rank: {
					formula: 'adjusted * factor_participacion * factor_confianza'
				}
			}
		};
	}));

	results.sort((a, b) => {
		if (b.score_rank !== a.score_rank) return b.score_rank - a.score_rank;
		const cmtA = a.eval?.suma_cmt ?? 0;
		const cmtB = b.eval?.suma_cmt ?? 0;
		if (cmtB !== cmtA) return cmtB - cmtA;
		const respA = a.eval?.total_respuestas ?? 0;
		const respB = b.eval?.total_respuestas ?? 0;
		if (respB !== respA) return respB - respA;
		const desvA = a.desviacion_estandar == null ? Number.POSITIVE_INFINITY : a.desviacion_estandar;
		const desvB = b.desviacion_estandar == null ? Number.POSITIVE_INFINITY : b.desviacion_estandar;
		return desvA - desvB;
	});

	const zeroResults = await Promise.all(docentesSinRespuestas.map(async (d) => {
		// Get all stats from getDocenteStats
		const docenteStats = await getDocenteStats({ cfg_t, docente: d.docente, sede, periodo, programa, semestre, grupo });
		
		// Get eval metrics from getDocenteAspectMetrics for docentes sin respuestas
		const aspectMetrics = await getDocenteAspectMetrics({ cfg_t, docente: d.docente });
		const evalData = {
			total_respuestas: aspectMetrics?.evaluacion_estudiantes?.total_respuestas ?? 0,
			total_cmt: aspectMetrics?.evaluacion_estudiantes?.total_cmt ?? 0,
			total_cmt_gen: aspectMetrics?.evaluacion_estudiantes?.total_cmt_gen ?? 0,
			suma_cmt: aspectMetrics?.evaluacion_estudiantes?.suma_cmt ?? 0,
			nota_final_ponderada: aspectMetrics?.resultado_final?.nota_final_ponderada ?? aspectMetrics?.evaluacion_estudiantes?.promedio_general ?? 0.00
		};

		return {
			docente: d.docente,
			nombre_docente: d.nombre_docente,
			total_evaluaciones: docenteStats?.total_evaluaciones ?? 0,
			total_realizadas: docenteStats?.total_realizadas ?? 0,
			total_pendientes: docenteStats?.total_pendientes ?? 0,
			total_evaluaciones_registradas: docenteStats?.total_evaluaciones_registradas ?? 0,
			total_estudiantes_registrados: docenteStats?.total_estudiantes_registrados ?? 0,
			porcentaje_cumplimiento: docenteStats?.porcentaje_cumplimiento != null ? roundToTwo(docenteStats.porcentaje_cumplimiento) : 0,
			score_rank: 0.00,
			promedio_docente: 0.00,
			promedio_evaluacion: 0.00,
			adjusted: 0.00,
			universo: d.universo,
			desviacion_estandar: null,
			eval: evalData,
			factores: {
				v: 0,
				m,
				global_avg: roundToTwo(globalAvg),
				participacion_promedio: roundToTwo(participacionPromedio),
				factor_participacion: 0.00,
				factor_confianza: 0.00
			},
			calculo: {
				promedio_docente: {
					suma_puntajes: 0,
					total_respuestas: 0,
					formula: 'SUM(puntajes) / total_respuestas'
				},
				adjusted: {
					formula: '(v/(v+m))*promedio_docente + (m/(v+m))*global_avg'
				},
				score_rank: {
					formula: 'adjusted * factor_participacion * factor_confianza'
				}
			},
			sin_respuestas: true
		};
	}));

	return {
		ranking: [...results, ...zeroResults],
		meta: {
			m,
			global_avg: roundToTwo(globalAvg),
			participacion_promedio: roundToTwo(participacionPromedio),
			total_docentes: statsByDocente.size,
			docentes_con_respuestas: docentesConRespuestas.length,
			docentes_sin_respuestas: docentesSinRespuestas.length
		}
	};
}

// Helper function to get autoevaluacion metrics for a docente
async function getAutoevaluacionMetrics(docenteId) {
	// Find active autoevaluacion cfg_t (tipo_form_id = 3)
	const cfgT = await localPrisma.cfg_t.findFirst({
		where: { 
			tipo_form_id: 3,
			es_activo: true
		},
		orderBy: { fecha_creacion: 'desc' }
	});

	if (!cfgT) return null;

	// Get autoevaluacion evals for this docente
	const evals = await localPrisma.eval.findMany({
		where: { 
			id_configuracion: cfgT.id, 
			docente: docenteId 
		},
		select: { id: true }
	});
	const evalIds = evals.map(e => e.id);

	if (!evalIds.length) return null;

	// Get all responses with aspect IDs
		const detalles = await localPrisma.eval_det.findMany({
			where: { eval_id: { in: evalIds } },
			select: { a_e_id: true, cmt: true }
		});
	const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));

	if (!aeIds.length) return null;

	// Map a_e -> real aspecto and escala_id
	const aeRecords = await localPrisma.a_e.findMany({
		where: { id: { in: aeIds } },
		include: {
			cfg_a: {
				include: {
					ca_map: {
						include: {
							aspecto: true
						}
					}
				}
			}
		}
	});

	// Store the actual aspecto object (id and name) mapped by a_e.id
	const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.cfg_a?.ca_map?.aspecto]));
	const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

	// Load puntajes for all scales (a_e.escala_id points to cfg_e.id)
	const cfgEIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
	const cfgE = await localPrisma.cfg_e.findMany({
		where: { id: { in: cfgEIds } },
		select: { id: true, puntaje: true }
	});
	const puntajeByEscala = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));

	// Aggregate per real aspecto
	const agg = new Map();
	for (const d of detalles) {
		const asp = aspectoByAe.get(d.a_e_id); // This is the actual aspecto record
		if (!asp) continue;
		const escala = escalaByAe.get(d.a_e_id);
		const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
		const entry = agg.get(asp.id) || { aspecto_id: asp.id, nombre: asp.nombre, count: 0, sum: 0 };
		entry.count += 1;
		if (typeof puntaje === 'number') {
			entry.sum += puntaje;
		}
		agg.set(asp.id, entry);
	}

	const aspectos = [];
	let sumaTotal = 0;
	let totalRespuestas = detalles.length;
	
	for (const entry of agg.values()) {
		const promedio = entry.count > 0 ? entry.sum / entry.count : null;
		sumaTotal += entry.sum;
		
		const item = {
			aspecto_id: entry.aspecto_id,
			nombre: entry.nombre,
			total_respuestas: entry.count,
			suma: entry.sum,
			promedio: promedio
		};
		aspectos.push(item);
	}

	const promedioGeneral = aspectos.length > 0 ? sumaTotal / totalRespuestas : null;

	return {
		suma_total: sumaTotal,
		total_respuestas: totalRespuestas,
		promedio_general: promedioGeneral,
		aspectos
	};
}

// Helper function to get autoevaluacion metrics for multiple docentes
async function getAutoevaluacionMetricsForDocentes(docentesList) {
	if (!docentesList || !docentesList.length) return null;
	const uniqueDocentes = Array.from(new Set(docentesList.filter(Boolean).map(String)));
	if (!uniqueDocentes.length) return null;

	const cfgT = await localPrisma.cfg_t.findFirst({
		where: {
			tipo_form_id: 3,
			es_activo: true
		},
		orderBy: { fecha_creacion: 'desc' }
	});

	if (!cfgT) return null;

	// Aspectos esperados para la autoevaluación activa
	const cfgARecords = await localPrisma.cfg_a.findMany({
		where: { cfg_t_id: cfgT.id },
		include: {
			ca_map: {
				include: {
					aspecto: true
				}
			}
		}
	});
	const expectedAspectos = cfgARecords
		.map((r) => r.ca_map?.aspecto)
		.filter((asp) => asp && asp.id)
		.reduce((acc, asp) => {
			if (!acc.some((x) => x.id === asp.id)) {
				acc.push({ id: asp.id, nombre: asp.nombre });
			}
			return acc;
		}, []);

	const evals = await localPrisma.eval.findMany({
		where: {
			id_configuracion: cfgT.id,
			docente: { in: uniqueDocentes }
		},
		select: { id: true, docente: true }
	});
	const evalIds = evals.map(e => e.id);
	const docenteByEvalId = new Map(evals.map((e) => [e.id, String(e.docente)]));

	const detalles = await localPrisma.eval_det.findMany({
		where: { eval_id: { in: evalIds } },
		select: { a_e_id: true, eval_id: true, cmt: true }
	});
	const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));

	// Map a_e -> real aspecto and escala_id
	const aeRecords = aeIds.length
		? await localPrisma.a_e.findMany({
			where: { id: { in: aeIds } },
			include: {
				cfg_a: {
					include: {
						ca_map: {
							include: {
								aspecto: true
							}
						}
					}
				}
			}
		})
		: [];

	// Store the actual aspecto object (id and name) mapped by a_e.id
	const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.cfg_a?.ca_map?.aspecto]));
	const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

	const cfgEIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
	const cfgE = cfgEIds.length
		? await localPrisma.cfg_e.findMany({
			where: { id: { in: cfgEIds } },
			select: { id: true, puntaje: true }
		})
		: [];
	const puntajeByEscala = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));

	// Aggregate per real aspecto
	const agg = new Map();
	for (const asp of expectedAspectos) {
		agg.set(asp.id, { aspecto_id: asp.id, nombre: asp.nombre, count: 0, sum: 0 });
	}
	const docentesConRespuestas = new Set();
	for (const d of detalles) {
		const asp = aspectoByAe.get(d.a_e_id); // This is the actual aspecto record
		if (!asp) continue;
		const docenteId = docenteByEvalId.get(d.eval_id);
		if (docenteId) docentesConRespuestas.add(docenteId);
		const escala = escalaByAe.get(d.a_e_id);
		const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
		const entry = agg.get(asp.id) || { aspecto_id: asp.id, nombre: asp.nombre, count: 0, sum: 0 };
		entry.count += 1;
		if (typeof puntaje === 'number') {
			entry.sum += puntaje;
		}
		agg.set(asp.id, entry);
	}

	// Docentes que no respondieron autoevaluación: cuentan como respuesta en 0.0 por aspecto
	const docentesSinRespuesta = uniqueDocentes.filter((docId) => !docentesConRespuestas.has(docId));
	if (docentesSinRespuesta.length > 0 && expectedAspectos.length > 0) {
		for (const asp of expectedAspectos) {
			const entry = agg.get(asp.id) || { aspecto_id: asp.id, nombre: asp.nombre, count: 0, sum: 0 };
			entry.count += docentesSinRespuesta.length;
			agg.set(asp.id, entry);
		}
	}

	const aspectos = [];
	let sumaTotal = 0;
	let totalRespuestas = 0;
	for (const entry of agg.values()) {
		const promedio = entry.count > 0 ? entry.sum / entry.count : null;
		sumaTotal += entry.sum;
		totalRespuestas += entry.count;
		aspectos.push({
			aspecto_id: entry.aspecto_id,
			nombre: entry.nombre,
			total_respuestas: entry.count,
			suma: entry.sum,
			promedio: promedio
		});
	}

	const promedioGeneral = totalRespuestas > 0 ? sumaTotal / totalRespuestas : 0;

	return {
		suma_total: sumaTotal,
		total_respuestas: totalRespuestas,
		promedio_general: promedioGeneral,
		aspectos
	};
}

function buildZeroAutoevaluacionFromAspectos(aspectos = []) {
	const safeAspectos = Array.isArray(aspectos) ? aspectos : [];
	const totalAspectos = safeAspectos.length;
	return {
		suma_total: 0,
		total_respuestas: totalAspectos,
		promedio_general: 0,
		aspectos: safeAspectos.map((asp) => ({
			aspecto_id: asp.aspecto_id,
			nombre: asp.nombre,
			total_respuestas: 1,
			suma: 0,
			promedio: 0
		}))
	};
}

function roundDecimals(obj) {
	if (Array.isArray(obj)) {
		return obj.map(roundDecimals);
	} else if (obj && typeof obj === 'object') {
		const rounded = {};
		for (const [key, value] of Object.entries(obj)) {
			if (typeof value === 'number' && !Number.isInteger(value)) {
				rounded[key] = Number(value.toFixed(2));
			} else if (Array.isArray(value) || (value && typeof value === 'object')) {
				rounded[key] = roundDecimals(value);
			} else {
				rounded[key] = value;
			}
		}
		return rounded;
	}
	return obj;
}

async function getDocenteAspectMetrics({ cfg_t, docente, codigo_materia, sede, periodo, programa, semestre, grupo }) {
		// ...existing code...
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');

	const cfgRelation = await localPrisma.cfg_t_rel.findFirst({
		where: {
			OR: [
				{ cfg_eval_id: cfgId },
				{ cfg_autoeval_id: cfgId }
			]
		},
		select: { id: true }
	});
	const hasCfgPair = Boolean(cfgRelation);
	const hasVistaFilters = Boolean(sede || periodo || programa || semestre || grupo);

	let scopeByDocente = new Map();
	if (hasVistaFilters) {
		const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });
		if (docente) {
			whereVista.ID_DOCENTE = String(docente);
		}
		if (codigo_materia) {
			const codigoMatNum = Number(codigo_materia);
			if (!isNaN(codigoMatNum)) {
				whereVista.COD_ASIGNATURA = codigoMatNum;
			}
		}

		const vista = await userPrisma.vista_academica_insitus.findMany({
			where: whereVista,
			select: {
				ID_DOCENTE: true,
				ID_ESTUDIANTE: true,
				COD_ASIGNATURA: true
			}
		});

		scopeByDocente = vista.reduce((acc, row) => {
			const docenteId = row?.ID_DOCENTE ? String(row.ID_DOCENTE) : null;
			if (!docenteId) return acc;

			const entry = acc.get(docenteId) || {
				estudiantes: new Set(),
				materias: new Set()
			};

			if (row?.ID_ESTUDIANTE) entry.estudiantes.add(String(row.ID_ESTUDIANTE));
			if (row?.COD_ASIGNATURA != null) entry.materias.add(String(row.COD_ASIGNATURA));

			acc.set(docenteId, entry);
			return acc;
		}, new Map());
	}

	// Helper function to compute metrics for a single docente
	const computeMetricsForDocente = async (docenteId) => {
		const docenteKey = String(docenteId);
		const scope = hasVistaFilters ? scopeByDocente.get(docenteKey) : null;
		if (hasVistaFilters && (!scope || !scope.estudiantes.size || !scope.materias.size)) {
			return null;
		}

		// Filter evals for this docente
		const whereClause = { id_configuracion: cfgId, docente: docenteKey };
		if (scope) {
			whereClause.estudiante = { in: Array.from(scope.estudiantes) };
		}
		if (codigo_materia) {
			const codigoMateriaKey = String(codigo_materia);
			if (scope && !scope.materias.has(codigoMateriaKey)) {
				return null;
			}
			whereClause.codigo_materia = codigoMateriaKey;
		} else if (scope) {
			whereClause.codigo_materia = { in: Array.from(scope.materias) };
		}
		const evals = await localPrisma.eval.findMany({
			where: whereClause,
			select: { id: true }
		});
		const evalIds = evals.map(e => e.id);

		// Get all responses with aspect IDs
		const detalles = evalIds.length ? await localPrisma.eval_det.findMany({
			where: { eval_id: { in: evalIds } },
			select: { a_e_id: true, cmt: true }
		}) : [];
		const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));

		// If no data, return null to filter out
		if (!aeIds.length) return null;

		// Map a_e -> real aspecto and escala_id
		const aeRecords = await localPrisma.a_e.findMany({
			where: { id: { in: aeIds } },
			include: {
				cfg_a: {
					include: {
						ca_map: {
							include: {
								aspecto: true
							}
						}
					}
				}
			}
		});

		// Store the actual aspecto object (id and name) mapped by a_e.id
		const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.cfg_a?.ca_map?.aspecto]));
		const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

		// Load puntajes for all scales (a_e.escala_id points to cfg_e.id)
		const cfgEIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
		const cfgE = await localPrisma.cfg_e.findMany({
			where: { id: { in: cfgEIds } },
			select: { id: true, puntaje: true }
		});
		const puntajeByEscala = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));

		// Aggregate per real aspecto
		const agg = new Map();
		for (const d of detalles) {
			const asp = aspectoByAe.get(d.a_e_id); // This is the actual aspecto record
			if (!asp) continue;
			const escala = escalaByAe.get(d.a_e_id);
			const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
			const entry = agg.get(asp.id) || { aspecto_id: asp.id, nombre: asp.nombre, count: 0, sum: 0, scores: [] };
			entry.count += 1;
			if (typeof puntaje === 'number') {
				entry.sum += puntaje;
				entry.scores.push(puntaje);
			}
			agg.set(asp.id, entry);
		}

		const aspectos = [];
		let sumaTotal = 0;
		let totalRespuestas = detalles.length;
		const aspectAverages = [];
		for (const entry of agg.values()) {
			const avg = entry.scores.length ? entry.sum / entry.scores.length : null;
			let std = null;
			if (entry.scores.length) {
				const mean = avg;
				std = Math.sqrt(entry.scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / entry.scores.length);
			}
			sumaTotal += entry.sum;
			if (avg != null) {
				aspectAverages.push(avg);
			}
			const item = {
				aspecto_id: entry.aspecto_id,
				nombre: entry.nombre,
				total_respuestas: entry.count,
				suma: entry.sum,
				promedio: avg
			};
			aspectos.push(item);
		}

		let promedio = null;
		let desviacion = null;
		const numScoredAspects = aspectAverages.length;
		if (totalRespuestas > 0) {
			promedio = sumaTotal / totalRespuestas;
		}
		if (numScoredAspects > 0) {
			const mean = promedio ?? 0;
			const variance = aspectAverages.reduce((acc, a) => acc + Math.pow(a - mean, 2), 0) / numScoredAspects;
			desviacion = Math.sqrt(variance);
		}

		return { docenteId, suma_total: sumaTotal, total_respuestas: totalRespuestas, promedio, desviacion, aspectos };
	};

	// If docente is provided, return metrics for single docente
	if (docente) {
		const docenteKey = String(docente);
		const scope = hasVistaFilters ? scopeByDocente.get(docenteKey) : null;
		if (hasVistaFilters && (!scope || !scope.estudiantes.size || !scope.materias.size)) {
			return { docente, codigo_materia: codigo_materia ? String(codigo_materia) : null, aspectos: [] };
		}

		const whereClause = { id_configuracion: cfgId, docente: docenteKey };
		if (scope) {
			whereClause.estudiante = { in: Array.from(scope.estudiantes) };
		}
		if (codigo_materia) {
			const codigoMateriaKey = String(codigo_materia);
			if (scope && !scope.materias.has(codigoMateriaKey)) {
				return { docente, codigo_materia: codigo_materia ? String(codigo_materia) : null, aspectos: [] };
			}
			whereClause.codigo_materia = codigoMateriaKey;
		} else if (scope) {
			whereClause.codigo_materia = { in: Array.from(scope.materias) };
		}
		const evals = await localPrisma.eval.findMany({
			where: whereClause,
			select: { id: true }
		});
		const evalIds = evals.map(e => e.id);
		if (!evalIds.length) return { docente, codigo_materia: codigo_materia ? String(codigo_materia) : null, aspectos: [] };

		const detalles = await localPrisma.eval_det.findMany({
			where: { eval_id: { in: evalIds } },
			select: { a_e_id: true, cmt: true }
		});
		const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
		if (!aeIds.length) return { docente, codigo_materia: codigo_materia ? String(codigo_materia) : null, aspectos: [] };

		// Comentarios generales: eval.cmt_gen no vacío
		const evalsFull = await localPrisma.eval.findMany({
			where: { id: { in: evalIds } },
			select: { id: true, cmt_gen: true, id_configuracion: true, estudiante: true, docente: true, codigo_materia: true }
		});
		// ...existing code...
		let total_cmt_gen = evalsFull.filter(e => (e.cmt_gen || '').trim().length > 0).length;
		if (!total_cmt_gen) total_cmt_gen = 0;
		// ...existing code...

		// Map a_e -> real aspecto and escala_id
		const aeRecords = await localPrisma.a_e.findMany({
			where: { id: { in: aeIds } },
			include: {
				cfg_a: {
					include: {
						ca_map: {
							include: {
								aspecto: true
							}
						}
					}
				}
			}
		});

		// Store the actual aspecto object (id and name) mapped by a_e.id
		const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.cfg_a?.ca_map?.aspecto]));
		const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

		const cfgEIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
		const cfgE = await localPrisma.cfg_e.findMany({
			where: { id: { in: cfgEIds } },
			select: { id: true, puntaje: true }
		});
		const puntajeByEscala = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));

		// Aggregate per real aspecto
		const agg = new Map();
		// Para cada aspecto, contar comentarios (cmt no vacío)
		for (const d of detalles) {
			const asp = aspectoByAe.get(d.a_e_id); // This is the actual aspecto record
			if (!asp) continue;
			const escala = escalaByAe.get(d.a_e_id);
			const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
			const entry = agg.get(asp.id) || { aspecto_id: asp.id, nombre: asp.nombre, count: 0, sum: 0, scores: [], total_cmt: 0 };
			entry.count += 1;
			if (typeof puntaje === 'number') {
				entry.sum += puntaje;
				entry.scores.push(puntaje);
			}
			if ((d.cmt || '').trim().length > 0) {
				entry.total_cmt += 1;
			}
			agg.set(asp.id, entry);
		}
		// Debug: mostrar todos los cmt de detalles
		// ...existing code...

		const aspectos = [];
		let sumaTotal = 0;
		let totalRespuestas = detalles.length;
		let suma_cmt = 0;
		const aspectAverages = [];
		for (const entry of agg.values()) {
			const avg = entry.scores.length ? entry.sum / entry.scores.length : null;
			let std = null;
			if (entry.scores.length) {
				const mean = avg;
				std = Math.sqrt(entry.scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / entry.scores.length);
			}
			sumaTotal += entry.sum;
			if (avg != null) {
				aspectAverages.push(avg);
			}
			// total_cmt ya está en entry
			const total_cmt = entry.total_cmt || 0;
			suma_cmt += total_cmt;
			const item = {
				aspecto_id: entry.aspecto_id,
				nombre: entry.nombre,
				total_respuestas: entry.count,
				suma: entry.sum,
				promedio: avg,
				total_cmt: total_cmt
			};
			aspectos.push(item);
		}

		let promedio = null;
		let desviacion = null;
		const numScoredAspects = aspectAverages.length;
		if (totalRespuestas > 0) {
			promedio = sumaTotal / totalRespuestas;
		}
		if (numScoredAspects > 0) {
			const mean = promedio ?? 0;
			const variance = aspectAverages.reduce((acc, a) => acc + Math.pow(a - mean, 2), 0) / numScoredAspects;
			desviacion = Math.sqrt(variance);
		}

		// Get autoevaluacion metrics only when cfg_t has related pair
		const autoevaluacion = hasCfgPair ? await getAutoevaluacionMetrics(docente) : null;

		// Build response with both evaluacion and autoevaluacion
		const PESO_ESTUDIANTES = hasCfgPair ? 0.8 : 1;
		const PESO_AUTOEVALUACION = hasCfgPair ? 0.2 : 0;
		const ESCALA_MAXIMA = 5;

		const evaluacionEstudiantes = {
			peso: PESO_ESTUDIANTES,
			suma_total: sumaTotal,
			total_respuestas: totalRespuestas,
			promedio_general: promedio,
			total_cmt: suma_cmt || 0,
			total_cmt_gen: total_cmt_gen || 0,
			suma_cmt: (suma_cmt || 0) + (total_cmt_gen || 0),
			ponderado: promedio != null ? promedio * PESO_ESTUDIANTES : null,
			desviacion: desviacion,
			aspectos: aspectos
		};

		const result = {
			docente,
			escala_maxima: ESCALA_MAXIMA,
			evaluacion_estudiantes: evaluacionEstudiantes
		};

		if (codigo_materia) result.codigo_materia = String(codigo_materia);

		const autoevaluacionBase = hasCfgPair
			? (autoevaluacion || buildZeroAutoevaluacionFromAspectos(aspectos))
			: { suma_total: 0, total_respuestas: 0, promedio_general: 0, aspectos: [] };
		const autoevaluacionDocente = {
			peso: PESO_AUTOEVALUACION,
			suma_total: autoevaluacionBase.suma_total,
			total_respuestas: autoevaluacionBase.total_respuestas,
			promedio_general: autoevaluacionBase.promedio_general,
			ponderado: (autoevaluacionBase.promedio_general ?? 0) * PESO_AUTOEVALUACION,
			aspectos: autoevaluacionBase.aspectos
		};

		   // Only include autoevaluacion_docente if it is not the default zero object
		   const isZeroAutoevaluacion = autoevaluacionDocente.peso === 0 &&
			   autoevaluacionDocente.suma_total === 0 &&
			   autoevaluacionDocente.total_respuestas === 0 &&
			   autoevaluacionDocente.promedio_general === 0 &&
			   autoevaluacionDocente.ponderado === 0 &&
			   Array.isArray(autoevaluacionDocente.aspectos) && autoevaluacionDocente.aspectos.length === 0;
		   if (!isZeroAutoevaluacion) {
			   result.autoevaluacion_docente = autoevaluacionDocente;
		   }

		const ponderadoEstudiantes = evaluacionEstudiantes.ponderado;
		const ponderadoAutoevaluacion = autoevaluacionDocente.ponderado;

		if (ponderadoEstudiantes != null && ponderadoAutoevaluacion != null) {
			result.resultado_final = {
				nota_final_ponderada: ponderadoEstudiantes + ponderadoAutoevaluacion
			};
		}

		return roundDecimals(result);
	}

	// If docente is not provided, aggregate metrics from all docentes
	let docentesList = [];
	if (hasVistaFilters) {
		docentesList = Array.from(scopeByDocente.keys());
	} else {
		const allDocentesEvals = await localPrisma.eval.findMany({
			where: { id_configuracion: cfgId },
			select: { docente: true },
			distinct: ['docente']
		});
		docentesList = Array.from(new Set(allDocentesEvals.map(e => e.docente).filter(Boolean)));
	}
	// Compute metrics for each docente
	const resultsByDocente = [];
	for (const doc of docentesList) {
		const metrics = await computeMetricsForDocente(doc);
		if (metrics) resultsByDocente.push(metrics);
	}

	// Aggregate all metrics into a single response
	const docentes = resultsByDocente.map(r => r.docenteId);
	let agregadoSumaTotal = 0;
	let agregadoTotalRespuestas = 0;
	const agregadoAspectos = new Map();
	const aspectAverages = [];

	for (const result of resultsByDocente) {
		agregadoSumaTotal += result.suma_total;
		agregadoTotalRespuestas += result.total_respuestas;
		if (result.promedio != null) {
			aspectAverages.push(result.promedio);
		}

		for (const asp of result.aspectos) {
			const key = asp.aspecto_id;
			if (!agregadoAspectos.has(key)) {
				agregadoAspectos.set(key, {
					aspecto_id: key,
					nombre: asp.nombre,
					total_respuestas: 0,
					suma: 0
				});
			}
			const entry = agregadoAspectos.get(key);
			entry.total_respuestas += asp.total_respuestas;
			entry.suma += asp.suma;
		}
	}

	let agregadoPromedio = null;
	let agregadoDesviacion = null;
	if (agregadoTotalRespuestas > 0) {
		agregadoPromedio = agregadoSumaTotal / agregadoTotalRespuestas;
	}
	if (aspectAverages.length > 0) {
		const mean = agregadoPromedio ?? 0;
		const variance = aspectAverages.reduce((acc, a) => acc + Math.pow(a - mean, 2), 0) / aspectAverages.length;
		agregadoDesviacion = Math.sqrt(variance);
	}

	// Calcular comentarios agregados de manera global (no por docente)
	// Buscar todos los evals y eval_det de la configuración
	       let total_cmt = 0;
	       let total_cmt_gen = 0;
	       let suma_cmt = 0;
	       // Buscar todos los evals de la configuración
	       const allEvals = await localPrisma.eval.findMany({
		       where: { id_configuracion: cfgId },
		       select: { id: true, cmt_gen: true }
	       });
	       // Contar comentarios generales (cmt_gen)
	       total_cmt_gen = allEvals.reduce((acc, e) => acc + (e.cmt_gen && e.cmt_gen.trim() ? 1 : 0), 0);
	       // Buscar todos los eval_det de esos evals
	       const allEvalIds = allEvals.map(e => e.id);
	       let allDetalles = [];
	       if (allEvalIds.length) {
		       allDetalles = await localPrisma.eval_det.findMany({
			       where: { eval_id: { in: allEvalIds } },
			       select: { a_e_id: true, cmt: true }
		       });
	       }
	       // Map a_e_id to aspecto_id
	       let aspectoIdByAeId = new Map();
	       if (allDetalles.length) {
		       const aeIds = Array.from(new Set(allDetalles.map(d => d.a_e_id)));
		       if (aeIds.length) {
			       const aeRecords = await localPrisma.a_e.findMany({
				       where: { id: { in: aeIds } },
				       include: {
					       cfg_a: {
						       include: {
							       ca_map: {
								       include: { aspecto: true }
							       }
						       }
					       }
				       }
			       });
			       for (const r of aeRecords) {
				       if (r && r.cfg_a && r.cfg_a.ca_map && r.cfg_a.ca_map.aspecto) {
					       aspectoIdByAeId.set(r.id, r.cfg_a.ca_map.aspecto.id);
				       }
			       }
		       }
	       }
	       // Contar comentarios por aspecto_id y total
	       let aspectoCmtMap = new Map();
	       for (const det of allDetalles) {
		       if (det.cmt && det.cmt.trim()) {
			       total_cmt += 1;
			       const aspectoId = aspectoIdByAeId.get(det.a_e_id);
			       if (aspectoId) {
				       if (!aspectoCmtMap.has(aspectoId)) aspectoCmtMap.set(aspectoId, 0);
				       aspectoCmtMap.set(aspectoId, aspectoCmtMap.get(aspectoId) + 1);
			       }
		       }
	       }
	       suma_cmt = total_cmt + total_cmt_gen;
	       // Actualizar aspectosFinales: solo incluir total_cmt por aspecto (no total_cmt_gen ni suma_cmt)
	       const aspectosFinales = Array.from(agregadoAspectos.values()).map(asp => ({
		       aspecto_id: asp.aspecto_id,
		       nombre: asp.nombre,
		       total_respuestas: asp.total_respuestas,
		       suma: asp.suma,
		       promedio: asp.total_respuestas ? asp.suma / asp.total_respuestas : null,
		       total_cmt: aspectoCmtMap.get(asp.aspecto_id) || 0
	       }));

	const PESO_ESTUDIANTES = hasCfgPair ? 0.8 : 1;
	const PESO_AUTOEVALUACION = hasCfgPair ? 0.2 : 0;
	const ESCALA_MAXIMA = 5;

	const autoevaluacion = hasCfgPair ? await getAutoevaluacionMetricsForDocentes(docentesList) : null;
	const evaluacionEstudiantes = {
		peso: PESO_ESTUDIANTES,
		suma_total: agregadoSumaTotal,
		total_respuestas: agregadoTotalRespuestas,
		promedio_general: agregadoPromedio,
		total_cmt: total_cmt,
		total_cmt_gen: total_cmt_gen,
		suma_cmt: total_cmt + total_cmt_gen,
		ponderado: agregadoPromedio != null ? agregadoPromedio * PESO_ESTUDIANTES : null,
		desviacion: agregadoDesviacion,
		aspectos: aspectosFinales
	};

	const result = {
		docente: docentes,
		escala_maxima: ESCALA_MAXIMA,
		evaluacion_estudiantes: evaluacionEstudiantes
	};

	const autoevaluacionBase = hasCfgPair
		? (autoevaluacion || buildZeroAutoevaluacionFromAspectos(aspectosFinales))
		: { suma_total: 0, total_respuestas: 0, promedio_general: 0, aspectos: [] };
	const autoevaluacionDocente = {
		peso: PESO_AUTOEVALUACION,
		suma_total: autoevaluacionBase.suma_total,
		total_respuestas: autoevaluacionBase.total_respuestas,
		promedio_general: autoevaluacionBase.promedio_general,
		ponderado: (autoevaluacionBase.promedio_general ?? 0) * PESO_AUTOEVALUACION,
		aspectos: autoevaluacionBase.aspectos
	};

	       // Only include autoevaluacion_docente if it is not the default zero object (same logic as single-docente branch)
	       const isZeroAutoevaluacion = autoevaluacionDocente.peso === 0 &&
		       autoevaluacionDocente.suma_total === 0 &&
		       autoevaluacionDocente.total_respuestas === 0 &&
		       autoevaluacionDocente.promedio_general === 0 &&
		       autoevaluacionDocente.ponderado === 0 &&
		       Array.isArray(autoevaluacionDocente.aspectos) && autoevaluacionDocente.aspectos.length === 0;
	       if (!isZeroAutoevaluacion) {
		       result.autoevaluacion_docente = autoevaluacionDocente;
	       }

	       if (evaluacionEstudiantes.ponderado != null && autoevaluacionDocente.ponderado != null) {
		       result.resultado_final = {
			       nota_final_ponderada: evaluacionEstudiantes.ponderado + autoevaluacionDocente.ponderado
		       };
	       }

	       return roundDecimals(result);
}

async function getDocenteMateriaMetrics({ cfg_t, docente, codigo_materia, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');

	// Build filtered universe of courses (per docente)
	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });
	whereVista.ID_DOCENTE = docente;
	if (codigo_materia) {
		// COD_ASIGNATURA is INT, convert string to number
		const codigoMatNum = Number(codigo_materia);
		if (!isNaN(codigoMatNum)) {
			whereVista.COD_ASIGNATURA = codigoMatNum;
		}
	}
	const cursos = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { COD_ASIGNATURA: true, ASIGNATURA: true, ID_ESTUDIANTE: true, DOCENTE: true, GRUPO: true, NOM_PROGRAMA: true, SEMESTRE: true }
	});
	if (!cursos.length) return { docente, materias: [] };

	const nombreDocente = cursos.length > 0 ? cursos[0].DOCENTE : null;

	// Get autoevaluacion metrics once for docente
	const autoevaluacion = await getAutoevaluacionMetrics(docente);
	const PESO_ESTUDIANTES = 0.8;
	const PESO_AUTOEVALUACION = 0.2;

	// Group by subject, then by grupo
	const byMateria = new Map();
	for (const c of cursos) {
		const key = String(c.COD_ASIGNATURA);
		const entry = byMateria.get(key) || { 
			codigo: key, 
			nombre: c.ASIGNATURA || null, 
			estudiantes: new Set(), 
			byGrupo: new Map(),
			programas: [],
			semestres: []
		};
		if (c.ID_ESTUDIANTE) entry.estudiantes.add(c.ID_ESTUDIANTE);
		if (c.NOM_PROGRAMA) entry.programas.push(c.NOM_PROGRAMA);
		if (c.SEMESTRE) entry.semestres.push(c.SEMESTRE);
		
		// Group by grupo within materia
		const grupoKey = c.GRUPO || 'SIN_GRUPO';
		const grupoEntry = entry.byGrupo.get(grupoKey) || { grupo: grupoKey, estudiantes: new Set() };
		if (c.ID_ESTUDIANTE) grupoEntry.estudiantes.add(c.ID_ESTUDIANTE);
		entry.byGrupo.set(grupoKey, grupoEntry);
		
		byMateria.set(key, entry);
	}

	const materias = [];
	for (const { codigo, nombre, estudiantes, byGrupo, programas, semestres } of byMateria.values()) {
		// evals for docente + materia
		const evals = await localPrisma.eval.findMany({
			where: { id_configuracion: cfgId, docente, codigo_materia: codigo },
			select: { id: true, estudiante: true }
		});
		const evalIds = evals.map(e => e.id);
		const detalles = evalIds.length ? await localPrisma.eval_det.findMany({ where: { eval_id: { in: evalIds } }, select: { eval_id: true, a_e_id: true, cmt: true } }) : [];
		const evalsWithResponses = new Set(detalles.map(d => String(d.eval_id)));
		const totalRealizadas = evals.filter(e => evalsWithResponses.has(String(e.id))).length;

		// scoring via a_e -> cfg_e
		const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
		let suma = 0;
		let promedioGeneral = null;
		let desviacionGeneral = null;
		let totalAspectos = aeIds.length;
		let escalaByAe = new Map();
		let puntajeByEscala = new Map();
		if (aeIds.length) {
			const aeRecords = await localPrisma.a_e.findMany({ where: { id: { in: aeIds } }, select: { id: true, escala_id: true } });
			escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));
			const cfgEIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
			const cfgE = await localPrisma.cfg_e.findMany({ where: { id: { in: cfgEIds } }, select: { id: true, puntaje: true } });
			puntajeByEscala = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));
			// Build per-response scores to compute promedio/desviacion
			const scores = [];
			for (const d of detalles) {
				const esc = escalaByAe.get(d.a_e_id);
				const val = esc ? puntajeByEscala.get(esc) : undefined;
				if (typeof val === 'number') {
					suma += val;
					scores.push(val);
				}
			}
			if (scores.length) {
				const sum = scores.reduce((a, b) => a + b, 0);
				promedioGeneral = sum / scores.length;
				const mean = promedioGeneral;
				const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / scores.length;
				desviacionGeneral = Math.sqrt(variance);
			}
		}

		const totalEvaluaciones = estudiantes.size; // expected per subject
		const totalPendientes = Math.max(totalEvaluaciones - totalRealizadas, 0);
		const porcentajeCumplimiento = totalEvaluaciones ? (totalRealizadas / totalEvaluaciones) * 100 : 0;
		const totalEvaluacionesRegistradas = await localPrisma.eval.count({ where: { id_configuracion: cfgId, docente, codigo_materia: codigo } });
		const totalEstudiantesRegistrados = (await localPrisma.eval.findMany({
			where: { id_configuracion: cfgId, docente, codigo_materia: codigo },
			select: { estudiante: true }
		})).reduce((set, e) => {
			if (e.estudiante) set.add(e.estudiante);
			return set;
		}, new Set()).size;

		// Calculate metrics per grupo
		const grupos = [];
		for (const { grupo, estudiantes: grupoEstudiantes } of byGrupo.values()) {
			const grupoEvals = evals.filter((e) => grupoEstudiantes.has(e.estudiante));
			const grupoEvalsIds = grupoEvals.map((e) => String(e.id));
			const grupoEvalsIdSet = new Set(grupoEvalsIds);
			const grupoDetalles = grupoEvalsIds.length
				? detalles.filter((d) => grupoEvalsIdSet.has(String(d.eval_id)))
				: [];
			
			const grupoEvalsWithResponses = new Set(grupoDetalles.map((d) => String(d.eval_id)));
			const grupoTotalRealizadas = grupoEvals.filter((e) => grupoEvalsWithResponses.has(String(e.id))).length;

			const grupoAeIds = Array.from(new Set(grupoDetalles.map(d => d.a_e_id)));
			let grupoSuma = 0;
			let grupoPromedioGeneral = null;
			let grupoDesviacionGeneral = null;
			let grupoTotalAspectos = grupoAeIds.length;
			
			if (grupoAeIds.length && escalaByAe.size) {
				const grupoScores = [];
				
				for (const d of grupoDetalles) {
					const esc = escalaByAe.get(d.a_e_id);
					const val = esc ? puntajeByEscala.get(esc) : undefined;
					if (typeof val === 'number') {
						grupoSuma += val;
						grupoScores.push(val);
					}
				}
				if (grupoScores.length) {
					const sum = grupoScores.reduce((a, b) => a + b, 0);
					grupoPromedioGeneral = sum / grupoScores.length;
					const mean = grupoPromedioGeneral;
					const variance = grupoScores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / grupoScores.length;
					grupoDesviacionGeneral = Math.sqrt(variance);
				}
			}

			const grupoTotalEvaluaciones = grupoEstudiantes.size;
			const grupoTotalPendientes = Math.max(grupoTotalEvaluaciones - grupoTotalRealizadas, 0);
			const grupoPorcentajeCumplimiento = grupoTotalEvaluaciones ? (grupoTotalRealizadas / grupoTotalEvaluaciones) * 100 : 0;
			const grupoTotalEvaluacionesRegistradas = grupoEvals.length;
			const grupoTotalEstudiantesRegistrados = grupoEvals.reduce((set, e) => {
				if (e.estudiante) set.add(e.estudiante);
				return set;
			}, new Set()).size;

			grupos.push({
				grupo,
				total_evaluaciones: grupoTotalEvaluaciones,
				total_realizadas: grupoTotalRealizadas,
				total_pendientes: grupoTotalPendientes,
				suma: grupoSuma,
				promedio_general: grupoPromedioGeneral,
				desviacion_general: grupoDesviacionGeneral,
				total_evaluaciones_registradas: grupoTotalEvaluacionesRegistradas,
				total_estudiantes_registrados: grupoTotalEstudiantesRegistrados,
				total_aspectos: grupoTotalAspectos,
				porcentaje_cumplimiento: grupoPorcentajeCumplimiento,
				nota_final_ponderada: grupoPromedioGeneral != null && autoevaluacion && autoevaluacion.promedio_general != null 
					? (grupoPromedioGeneral * PESO_ESTUDIANTES) + (autoevaluacion.promedio_general * PESO_AUTOEVALUACION)
					: null
			});
		}

		const materiaObj = {
			codigo_materia: codigo,
			nombre_materia: nombre,
			nom_programa: getMostFrequent(programas),
			semestre: getMostFrequent(semestres),
			total_evaluaciones: totalEvaluaciones,
			total_realizadas: totalRealizadas,
			total_pendientes: totalPendientes,
			suma,
			promedio_general: promedioGeneral,
			desviacion_general: desviacionGeneral,
			total_evaluaciones_registradas: totalEvaluacionesRegistradas,
			total_estudiantes_registrados: totalEstudiantesRegistrados,
			total_aspectos: totalAspectos,
			porcentaje_cumplimiento: porcentajeCumplimiento
		};

		// Calculate nota_final_ponderada for materia
		if (promedioGeneral != null && autoevaluacion && autoevaluacion.promedio_general != null) {
			const ponderadoEstudiantes = promedioGeneral * PESO_ESTUDIANTES;
			const ponderadoAutoevaluacion = autoevaluacion.promedio_general * PESO_AUTOEVALUACION;
			materiaObj.nota_final_ponderada = ponderadoEstudiantes + ponderadoAutoevaluacion;
		}

		// Si hay solo un grupo, mostrar solo el nombre del grupo como string
		// Si hay más de 1 grupo, crear el array con todos los detalles
		if (grupos.length === 1) {
			materiaObj.grupo = grupos[0].grupo;
		} else if (grupos.length > 1) {
			materiaObj.grupos = grupos;
		}

		materias.push(materiaObj);
	}

	return { docente, nombre_docente: nombreDocente, materias };
}

async function getDocenteMateriaCompletion({ cfg_t, docente, codigo_materia, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');
	if (!codigo_materia) throw new Error('codigo_materia is required');

	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });
	whereVista.ID_DOCENTE = docente;
	const codigoMatNum = Number(codigo_materia);
	if (!isNaN(codigoMatNum)) {
		whereVista.COD_ASIGNATURA = codigoMatNum;
	}

	const vista = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_ESTUDIANTE: true, PRIMER_APELLIDO: true, SEGUNDO_APELLIDO: true, PRIMER_NOMBRE: true, SEGUNDO_NOMBRE: true, GRUPO: true, DOCENTE: true }
	});

	// Group students by GRUPO
	const byGrupo = new Map();
	for (const v of vista) {
		if (!v.ID_ESTUDIANTE) continue;
		const grupoKey = v.GRUPO || 'SIN_GRUPO';
		const entry = byGrupo.get(grupoKey) || { grupo: grupoKey, students: new Map() };
		if (!entry.students.has(v.ID_ESTUDIANTE)) {
			entry.students.set(v.ID_ESTUDIANTE, {
				id: v.ID_ESTUDIANTE,
				nombre: [v.PRIMER_APELLIDO, v.SEGUNDO_APELLIDO, v.PRIMER_NOMBRE, v.SEGUNDO_NOMBRE]
					.filter(Boolean)
					.join(' ').replace(/\s+/g, ' ').trim()
			});
		}
		byGrupo.set(grupoKey, entry);
	}

	// Find evals for this docente + materia with responses
	const evals = await localPrisma.eval.findMany({
		where: { id_configuracion: cfgId, docente, codigo_materia: String(codigo_materia) },
		select: { id: true, estudiante: true }
	});
	const evalIds = evals.map(e => e.id);
	const det = evalIds.length ? await localPrisma.eval_det.findMany({ where: { eval_id: { in: evalIds } }, select: { eval_id: true, cmt: true } }) : [];
	const withResp = new Set(det.map(d => d.eval_id));
	const completedIds = new Set(evals.filter(e => withResp.has(e.id)).map(e => e.estudiante).filter(Boolean));

	// Build result per group
	const grupos = [];
	for (const { grupo, students } of byGrupo.values()) {
		const allStudents = Array.from(students.values());
		const completados = allStudents.filter(s => completedIds.has(s.id));
		const pendientes = allStudents.filter(s => !completedIds.has(s.id));
		grupos.push({ grupo, completados, pendientes });
	}

	const nombreDocente = vista.length > 0 ? vista[0].DOCENTE : null;

	return { docente, nombre_docente: nombreDocente, codigo_materia: String(codigo_materia), grupos };
}

// Aspect metrics for a docente within a specific subject (codigo_materia)
async function getDocenteMateriaAspectMetrics({ cfg_t, docente, codigo_materia }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');
	if (!codigo_materia) throw new Error('codigo_materia is required');

	const evals = await localPrisma.eval.findMany({
		where: { id_configuracion: cfgId, docente, codigo_materia: String(codigo_materia) },
		select: { id: true }
	});
	const evalIds = evals.map(e => e.id);
	if (!evalIds.length) return { docente, codigo_materia: String(codigo_materia), suma_total: 0, total_respuestas: 0, promedio: null, desviacion: null, aspectos: [] };

	const detalles = await localPrisma.eval_det.findMany({
		where: { eval_id: { in: evalIds } },
		select: { a_e_id: true }
	});
	const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
	if (!aeIds.length) return { docente, codigo_materia: String(codigo_materia), suma_total: 0, total_respuestas: 0, promedio: null, desviacion: null, aspectos: [] };

	// Map a_e -> real aspecto and escala_id
	const aeRecords = await localPrisma.a_e.findMany({
		where: { id: { in: aeIds } },
		include: {
			cfg_a: {
				include: {
					ca_map: {
						include: {
							aspecto: true
						}
					}
				}
			}
		}
	});

	// Store the actual aspecto object (id and name) mapped by a_e.id
	const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.cfg_a?.ca_map?.aspecto]));
	const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

	const cfgEIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
	const cfgE = await localPrisma.cfg_e.findMany({
		where: { id: { in: cfgEIds } },
		select: { id: true, puntaje: true }
	});
	const puntajeByEscala = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));

	// Aggregate per real aspecto
	const agg = new Map();
	for (const d of detalles) {
		const asp = aspectoByAe.get(d.a_e_id); // This is the actual aspecto record
		if (!asp) continue;
		const escala = escalaByAe.get(d.a_e_id);
		const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
		const entry = agg.get(asp.id) || { aspecto_id: asp.id, nombre: asp.nombre, count: 0, sum: 0, scores: [] };
		entry.count += 1;
		if (typeof puntaje === 'number') {
			entry.sum += puntaje;
			entry.scores.push(puntaje);
		}
		agg.set(asp.id, entry);
	}

	const aspectos = [];
	let sumaTotal = 0;
	let totalRespuestas = detalles.length;
	const aspectAverages = [];
	for (const entry of agg.values()) {
		const avg = entry.scores.length ? entry.sum / entry.scores.length : null;
		let std = null;
		if (entry.scores.length) {
			const mean = avg;
			std = Math.sqrt(entry.scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / entry.scores.length);
		}
		sumaTotal += entry.sum;
		if (avg != null) {
			aspectAverages.push(avg);
		}
		const item = {
			aspecto_id: entry.aspecto_id,
			nombre: entry.nombre,
			total_respuestas: entry.count,
			suma: entry.sum,
			promedio: avg,
			desviacion: std,
		};
		aspectos.push(item);
	}

	let promedio = null;
	let desviacion = null;
	const numScoredAspects = aspectAverages.length;
	if (numScoredAspects > 0) {
		promedio = sumaTotal / numScoredAspects;
		const mean = promedio;
		const variance = aspectAverages.reduce((acc, a) => acc + Math.pow(a - mean, 2), 0) / numScoredAspects;
		desviacion = Math.sqrt(variance);
	}

	return { docente, codigo_materia: String(codigo_materia), suma_total: sumaTotal, total_respuestas: totalRespuestas, promedio, desviacion, aspectos };
}

// Metrics + comments for a docente; optional by materia
// Filters (sede, periodo, programa, semestre, grupo) accepted for consistency
async function getDocenteCommentsWithMetrics({ cfg_t, docente, codigo_materia, sede, periodo, programa, semestre, grupo }) {
	const parseJsonSafe = (text, fallback = []) => {
		if (text == null) return fallback;
		if (typeof text === 'object') return text;
		if (typeof text !== 'string') return fallback;
		try { return JSON.parse(text); } catch {}
		return fallback;
	};

	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');

	// Retrieve broader docente stats so we can return richer info when no evals are found
	let docenteStats = null;
	try {
		docenteStats = await getDocenteStats({ cfg_t, docente, sede, periodo, programa, semestre, grupo });
	} catch (err) {
		docenteStats = null;
	}

	const evalWhere = { id_configuracion: cfgId, docente };
	if (codigo_materia) evalWhere.codigo_materia = String(codigo_materia);

	const evals = await localPrisma.eval.findMany({
		where: evalWhere,
		select: { id: true, cmt_gen: true, codigo_materia: true }
	});
	const evalIds = evals.map(e => e.id);
	if (!evalIds.length) {
		return {
			docente,
			codigo_materia: codigo_materia ? String(codigo_materia) : undefined,
			suma_total: 0,
			total_respuestas: 0,
			promedio: null,
			desviacion: null,
			aspectos: [],
			...(docenteStats || {})
		};
	}

	// Collect a single general comment (first non-empty) to avoid duplicates
	const cmtGen = [];
	for (const e of evals) {
		const c = (e.cmt_gen || '').trim();
		if (c) {
			cmtGen.push(c);
			break;
		}
	}

	const detalles = await localPrisma.eval_det.findMany({
		where: { eval_id: { in: evalIds } },
		select: { a_e_id: true, cmt: true }
	});

	// Cargar conclusiones/fortaleza/debilidad desde cmt_ai.
	// Compatibilidad: algunos clientes Prisma no exponen docente/codigo_materia en cmt_ai.
	let cmtAi = [];
	try {
		cmtAi = await localPrisma.cmt_ai.findMany({
			where: {
				cfg_t_id: cfgId,
				docente: String(docente),
				codigo_materia: codigo_materia ? String(codigo_materia) : undefined
			},
			select: { aspecto_id: true, conclusion: true, conclusion_gen: true, fortaleza: true, debilidad: true }
		});
	} catch (err) {
		if (String(err?.message || '').includes('Unknown argument `docente`')) {
			cmtAi = await localPrisma.cmt_ai.findMany({
				where: { cfg_t_id: cfgId },
				select: { aspecto_id: true, conclusion: true, conclusion_gen: true, fortaleza: true, debilidad: true }
			});
		} else {
			throw err;
		}
	}
	const conclusionByAspect = new Map();
	for (const c of cmtAi) {
		if (c.aspecto_id) {
			const existing = conclusionByAspect.get(c.aspecto_id);
			if (!existing && c.conclusion) conclusionByAspect.set(c.aspecto_id, c.conclusion);
		}
	}
	const conclusionGen = (cmtAi.find(c => c.conclusion_gen)?.conclusion_gen) || null;
	const fortalezas = Array.from(new Set(cmtAi.flatMap(c => parseJsonSafe(c.fortaleza, [])).filter(Boolean)));
	const debilidades = Array.from(new Set(cmtAi.flatMap(c => parseJsonSafe(c.debilidad, [])).filter(Boolean)));

	const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
	if (!aeIds.length) {
		return {
			docente,
			codigo_materia: codigo_materia ? String(codigo_materia) : undefined,
			suma_total: 0,
			total_respuestas: detalles.length,
			promedio: null,
			desviacion: null,
			aspectos: []
		};
	}

	// Map a_e -> real aspecto and escala_id
	const aeRecords = await localPrisma.a_e.findMany({
		where: { id: { in: aeIds } },
		include: {
			cfg_a: {
				include: {
					ca_map: {
						include: {
							aspecto: true
						}
					}
				}
			}
		}
	});

	// Store the actual aspecto object (id and name) mapped by a_e.id
	const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.cfg_a?.ca_map?.aspecto]));
	const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

	const cfgEIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
	const cfgE = await localPrisma.cfg_e.findMany({
		where: { id: { in: cfgEIds } },
		select: { id: true, puntaje: true }
	});
	const puntajeByEscala = new Map(cfgE.map(c => [c.id, Number(c.puntaje)]));

	// Aggregate per real aspecto
	const agg = new Map();
	for (const d of detalles) {
		const asp = aspectoByAe.get(d.a_e_id); // This is the actual aspecto record
		if (!asp) continue;
		const escala = escalaByAe.get(d.a_e_id);
		const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
		const entry = agg.get(asp.id) || { aspecto_id: asp.id, nombre: asp.nombre, count: 0, sum: 0, scores: [], cmt: [] };
		entry.count += 1;
		if (typeof puntaje === 'number') {
			entry.sum += puntaje;
			entry.scores.push(puntaje);
		}
		const c = (d.cmt || '').trim();
		if (c.length || d.cmt === '') {
			entry.cmt.push(d.cmt ?? '');
		}
		agg.set(asp.id, entry);
	}

	const aspectos = [];
	let sumaTotal = 0;
	let totalRespuestas = detalles.length;
	const aspectAverages = [];
	for (const entry of agg.values()) {
		const avg = entry.scores.length ? entry.sum / entry.scores.length : null;
		let std = null;
		if (entry.scores.length) {
			const mean = avg;
			std = Math.sqrt(entry.scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / entry.scores.length);
		}
		sumaTotal += entry.sum;
		if (avg != null) aspectAverages.push(avg);
		const item = {
			aspecto_id: entry.aspecto_id,
			nombre: entry.nombre,
			total_respuestas: entry.count,
			suma: entry.sum,
			promedio: avg,
			desviacion: std,
			cmt: entry.cmt,
			conclusion: conclusionByAspect.get(entry.aspecto_id) || null
		};
		aspectos.push(item);
	}

	let promedio = null;
	let desviacion = null;
	const numScoredAspects = aspectAverages.length;
	if (numScoredAspects > 0) {
		promedio = sumaTotal / numScoredAspects;
		const mean = promedio;
		const variance = aspectAverages.reduce((acc, a) => acc + Math.pow(a - mean, 2), 0) / numScoredAspects;
		desviacion = Math.sqrt(variance);
	}

	return {
		docente,
		...(docenteStats || {}),
		codigo_materia: codigo_materia ? String(codigo_materia) : undefined,
		fortalezas: fortalezas.length ? fortalezas : null,
		debilidades: debilidades.length ? debilidades : null,
		conclusion_gen: conclusionGen,
		aspectos,
		total_respuestas: totalRespuestas
	};
}

module.exports = {
	getEvaluationSummary,
	getEvaluationSummaryByProgram,
	getDocenteStats,
	getAllDocentesStats,
	getRanking,
	getDocenteAspectMetrics,
	getDocenteMateriaMetrics,
	getDocenteMateriaCompletion,
	getDocenteCommentsWithMetrics,
};
