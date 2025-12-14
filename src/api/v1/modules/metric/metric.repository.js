const { localPrisma, userPrisma } = require('../../../../prisma/clients');

// Build dynamic filters for the remote academic view
function buildVistaWhere({ sede, periodo, programa, semestre, grupo }) {
	const where = {};
	if (sede) where.NOMBRE_SEDE = sede;
	if (periodo) where.PERIODO = periodo;
	if (programa) where.NOM_PROGRAMA = programa;
	if (semestre) where.SEMESTRE = semestre;
	if (grupo) where.GRUPO = grupo;
	return where;
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
				select: { eval_id: true }
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

	return {
		generales: {
			total_evaluaciones: totalEvaluaciones,
			// Evaluations registered in local (records created), regardless of responses
			total_evaluaciones_registradas: await localPrisma.eval.count({ where: { id_configuracion: cfgId } }),
			total_realizadas: realizadas,
			total_pendientes: pendientes,
			total_estudiantes: totalEstudiantes,
			// Students who have entered and loaded their courses (unique in local eval), regardless of answering
			total_estudiantes_registrados: (await localPrisma.eval.findMany({
				where: { id_configuracion: cfgId },
				select: { estudiante: true }
			})).reduce((set, e) => {
				if (e.estudiante) set.add(e.estudiante);
				return set;
			}, new Set()).size,
			total_estudiantes_pendientes: totalEstudiantesPendientes,
			total_docentes: totalDocentes,
			total_docentes_pendientes: totalDocentesPendientes
		}
	};
}

async function getDocenteStats({ cfg_t, docente, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');

	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });
	whereVista.ID_DOCENTE = docente;

	const vista = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_ESTUDIANTE: true, COD_ASIGNATURA: true, GRUPO: true }
	});
	const estudiantesSet = new Set(vista.map(v => v.ID_ESTUDIANTE).filter(Boolean));

	// Universe expected: count of rows (student-docente-materia-grupo)
	const universeKeys = vista
		.filter(v => v.ID_ESTUDIANTE)
		.map(v => `${v.ID_ESTUDIANTE}::${docente}::${v.COD_ASIGNATURA}::${v.GRUPO}`);

	const evals = await localPrisma.eval.findMany({
		where: { id_configuracion: cfgId, docente },
		select: { id: true, estudiante: true, docente: true, codigo_materia: true }
	});
	const evalIds = evals.map(e => e.id);

	const detalles = await localPrisma.eval_det.findMany({
		where: { eval_id: { in: evalIds } },
		select: { eval_id: true, a_e_id: true }
	});

	// Count aspects answered
	const totalAspectos = new Set(detalles.map(d => d.a_e_id)).size;

	// Realizadas: number of evals that have at least one response in eval_det
	const evalsWithResponses = new Set(detalles.map(d => d.eval_id));
	const totalRealizadas = evals.filter(e => evalsWithResponses.has(e.id)).length;

	// Registradas: all local eval records for cfg + docente (regardless of answers)
	const totalRegistradas = await localPrisma.eval.count({ where: { id_configuracion: cfgId, docente } });

	// Estudiantes registrados: unique estudiantes with at least one local eval for cfg + docente
	const totalEstudiantesRegistrados = (await localPrisma.eval.findMany({
		where: { id_configuracion: cfgId, docente },
		select: { estudiante: true }
	})).reduce((set, e) => {
		if (e.estudiante) set.add(e.estudiante);
		return set;
	}, new Set()).size;

	// Compute docente score via a_e -> cfg_e.puntaje (exclude open questions with no scale/puntaje)
	const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
	let promedioGeneral = null;
	let desviacionGeneral = null;
	let suma = 0;

	if (aeIds.length) {
		const aeRecords = await localPrisma.a_e.findMany({ where: { id: { in: aeIds } }, select: { id: true, aspecto_id: true, escala_id: true } });
		const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.aspecto_id]));
		const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));
		const escalaIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
		const cfgE = await localPrisma.cfg_e.findMany({ where: { escala_id: { in: escalaIds } }, select: { escala_id: true, puntaje: true } });
		const puntajeByEscala = new Map(cfgE.map(c => [c.escala_id, Number(c.puntaje)]));
		
		// Aggregate by aspect to calculate aspect-level averages
		const aspectScores = new Map();
		for (const d of detalles) {
			const aspectoId = aspectoByAe.get(d.a_e_id);
			if (!aspectoId) continue;
			const esc = escalaByAe.get(d.a_e_id);
			const val = esc ? puntajeByEscala.get(esc) : undefined;
			if (typeof val === 'number') {
				const entry = aspectScores.get(aspectoId) || { sum: 0, count: 0 };
				entry.sum += val;
				entry.count += 1;
				aspectScores.set(aspectoId, entry);
			}
		}
		
		// Calculate average per aspect and global metrics
		const aspectAverages = [];
		for (const entry of aspectScores.values()) {
			const avg = entry.sum / entry.count;
			aspectAverages.push(avg);
			suma += entry.sum;
		}
		
		if (aspectAverages.length) {
			promedioGeneral = suma / aspectAverages.length;
			const mean = promedioGeneral;
			const variance = aspectAverages.reduce((acc, avg) => acc + Math.pow(avg - mean, 2), 0) / aspectAverages.length;
			desviacionGeneral = Math.sqrt(variance);
		}
	}

	// Expected evaluations equals universe rows
	const totalEvaluaciones = universeKeys.length;
	const porcentajeCumplimiento = totalEvaluaciones ? (totalRealizadas / totalEvaluaciones) * 100 : 0;
	const totalPendientes = Math.max(totalEvaluaciones - totalRealizadas, 0);

	return {
		docente,
		promedio_general: promedioGeneral,
		desviacion_general: desviacionGeneral,
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
		select: { ID_DOCENTE: true, ID_ESTUDIANTE: true }
	});
	const byDocente = new Map();
	for (const v of vista) {
		if (!v.ID_DOCENTE) continue;
		const entry = byDocente.get(v.ID_DOCENTE) || { students: new Set() };
		entry.students.add(v.ID_ESTUDIANTE);
		byDocente.set(v.ID_DOCENTE, entry);
	}

	// Global average for Bayesian adjustment
	const globalScores = await localPrisma.eval_det.findMany({ select: { a_e_id: true } });
	let globalAvg = 0;
	if (globalScores.length) {
		const aeIds = Array.from(new Set(globalScores.map(d => d.a_e_id)));
		const aeRecords = await localPrisma.a_e.findMany({ where: { id: { in: aeIds } }, select: { escala_id: true } });
		const escalaIds = aeRecords.map(r => r.escala_id).filter(Boolean);
		const cfgE = await localPrisma.cfg_e.findMany({ where: { escala_id: { in: escalaIds } }, select: { puntaje: true } });
		const scores = cfgE.map(c => Number(c.puntaje));
		if (scores.length) globalAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
	}

	const m = 20; // smoothing constant
	const results = [];

	for (const [docente, info] of byDocente.entries()) {
		const evals = await localPrisma.eval.findMany({ where: { id_configuracion: cfgId, docente }, select: { id: true } });
		const evalIds = evals.map(e => e.id);
		const detalles = evalIds.length ? await localPrisma.eval_det.findMany({ where: { eval_id: { in: evalIds } }, select: { a_e_id: true } }) : [];
		const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
		let avg = null;
		if (aeIds.length) {
			const aeRecords = await localPrisma.a_e.findMany({ where: { id: { in: aeIds } }, select: { escala_id: true } });
			const escalaIds = aeRecords.map(r => r.escala_id).filter(Boolean);
			const cfgE = await localPrisma.cfg_e.findMany({ where: { escala_id: { in: escalaIds } }, select: { puntaje: true } });
			const scores = cfgE.map(c => Number(c.puntaje));
			if (scores.length) avg = scores.reduce((a, b) => a + b, 0) / scores.length;
		}
		const v = evalIds.length; // number of evaluations completed for docente
		const bayesian = avg == null ? 0 : (v / (v + m)) * avg + (m / (v + m)) * globalAvg;
		results.push({ docente, avg: avg ?? 0, adjusted: bayesian, realizados: v, universo: info.students.size });
	}

	results.sort((a, b) => b.adjusted - a.adjusted);
	return { ranking: results };
}

async function getDocenteCompletion({ cfg_t, docente, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');

	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });
	whereVista.ID_DOCENTE = docente;

	const vista = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_ESTUDIANTE: true, PRIMER_APELLIDO: true, SEGUNDO_APELLIDO: true, PRIMER_NOMBRE: true, SEGUNDO_NOMBRE: true, DOCENTE: true }
	});
	const nameById = new Map(
		vista
			.filter(v => v.ID_ESTUDIANTE)
			.map(v => [
				v.ID_ESTUDIANTE,
				[ v.PRIMER_APELLIDO, v.SEGUNDO_APELLIDO, v.PRIMER_NOMBRE, v.SEGUNDO_NOMBRE ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
			])
	);
	const allStudents = Array.from(new Set(vista.map(v => v.ID_ESTUDIANTE).filter(Boolean))).map(id => ({ id, nombre: nameById.get(id) || null }));

	const realizados = await localPrisma.eval.findMany({
		where: { id_configuracion: cfgId, docente },
		select: { estudiante: true }
	});
	const doneSet = new Set(realizados.map(r => r.estudiante).filter(Boolean));

	const completados = allStudents.filter(s => doneSet.has(s.id));
	const pendientes = allStudents.filter(s => !doneSet.has(s.id));

	const docenteNombre = vista.find(v => v.DOCENTE)?.DOCENTE || null;
	return { docente, docente_nombre: docenteNombre, completados, pendientes };
}

async function getDocenteAspectMetrics({ cfg_t, docente, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');

	// Filter evals for this docente
	const evals = await localPrisma.eval.findMany({
		where: { id_configuracion: cfgId, docente },
		select: { id: true }
	});
	const evalIds = evals.map(e => e.id);
	if (!evalIds.length) return { docente, aspectos: [] };

	// Get all responses with aspect IDs
	const detalles = await localPrisma.eval_det.findMany({
		where: { eval_id: { in: evalIds } },
		select: { a_e_id: true }
	});
	const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
	if (!aeIds.length) return { docente, aspectos: [] };

	// Map a_e -> aspecto_id and escala_id
	const aeRecords = await localPrisma.a_e.findMany({
		where: { id: { in: aeIds } },
		select: { id: true, aspecto_id: true, escala_id: true }
	});
	const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.aspecto_id]));
	const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

	// Load puntajes for all scales
	const escalaIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
	const cfgE = await localPrisma.cfg_e.findMany({
		where: { cfg_t_id: cfgId, escala_id: { in: escalaIds } },
		select: { escala_id: true, puntaje: true }
	});
	const puntajeByEscala = new Map(cfgE.map(c => [c.escala_id, Number(c.puntaje)]));

	// Aggregate per aspecto
	const agg = new Map();
	for (const d of detalles) {
		const asp = aspectoByAe.get(d.a_e_id);
		if (!asp) continue;
		const escala = escalaByAe.get(d.a_e_id);
		const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
		const entry = agg.get(asp) || { aspecto_id: asp, count: 0, sum: 0, scores: [] };
		entry.count += 1;
		if (typeof puntaje === 'number') {
			entry.sum += puntaje;
			entry.scores.push(puntaje);
		}
		agg.set(asp, entry);
	}

	const aspectos = [];
	let sumaTotal = 0;
	let totalRespuestas = detalles.length; // includes open questions
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
			total_respuestas: entry.count,
			suma: entry.sum
		};
		// Only include promedio/desviacion when they are null (open questions with no scale)
		// For closed questions (scored), omit promedio/desviacion to match desired response shape
		if (avg == null) {
			item.promedio = null;
			item.desviacion = null;
		}
		aspectos.push(item);
	}

	// Optional: join aspecto names
	const aspectoIds = aspectos.map(a => a.aspecto_id);
	if (aspectoIds.length) {
		const aspectosInfo = await localPrisma.aspecto.findMany({ where: { id: { in: aspectoIds } }, select: { id: true, nombre: true } });
		const nameById = new Map(aspectosInfo.map(a => [a.id, a.nombre]));
		for (const a of aspectos) a.nombre = nameById.get(a.aspecto_id) || null;
	}

	// Global promedio = suma_total / total de aspectos con escala (scored aspects)
	let promedio = null;
	let desviacion = null;
	const numScoredAspects = aspectAverages.length;
	if (numScoredAspects > 0) {
		promedio = sumaTotal / numScoredAspects;
		const mean = promedio;
		const variance = aspectAverages.reduce((acc, a) => acc + Math.pow(a - mean, 2), 0) / numScoredAspects;
		desviacion = Math.sqrt(variance);
	}

	return { docente, suma_total: sumaTotal, total_respuestas: totalRespuestas, promedio, desviacion, aspectos };
}

async function getDocenteMateriaMetrics({ cfg_t, docente, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');

	// Build filtered universe of courses (per docente)
	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });
	whereVista.ID_DOCENTE = docente;
	const cursos = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { COD_ASIGNATURA: true, ASIGNATURA: true, ID_ESTUDIANTE: true }
	});
	if (!cursos.length) return { docente, materias: [] };

	// Group by subject
	const byMateria = new Map();
	for (const c of cursos) {
		const key = String(c.COD_ASIGNATURA);
		const entry = byMateria.get(key) || { codigo: key, nombre: c.ASIGNATURA || null, estudiantes: new Set() };
		if (c.ID_ESTUDIANTE) entry.estudiantes.add(c.ID_ESTUDIANTE);
		byMateria.set(key, entry);
	}

	const materias = [];
	for (const { codigo, nombre, estudiantes } of byMateria.values()) {
		// evals for docente + materia
		const evals = await localPrisma.eval.findMany({
			where: { id_configuracion: cfgId, docente, codigo_materia: codigo },
			select: { id: true, estudiante: true }
		});
		const evalIds = evals.map(e => e.id);
		const detalles = evalIds.length ? await localPrisma.eval_det.findMany({ where: { eval_id: { in: evalIds } }, select: { eval_id: true, a_e_id: true } }) : [];
		const evalsWithResponses = new Set(detalles.map(d => d.eval_id));
		const totalRealizadas = evals.filter(e => evalsWithResponses.has(e.id)).length;

		// scoring via a_e -> cfg_e
		const aeIds = Array.from(new Set(detalles.map(d => d.a_e_id)));
		let suma = 0;
		let promedioGeneral = null;
		let desviacionGeneral = null;
		let totalAspectos = aeIds.length;
		if (aeIds.length) {
			const aeRecords = await localPrisma.a_e.findMany({ where: { id: { in: aeIds } }, select: { id: true, escala_id: true } });
			const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));
			const escalaIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
			const cfgE = await localPrisma.cfg_e.findMany({ where: { cfg_t_id: cfgId, escala_id: { in: escalaIds } }, select: { escala_id: true, puntaje: true } });
			const puntajeByEscala = new Map(cfgE.map(c => [c.escala_id, Number(c.puntaje)]));
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

		materias.push({
			codigo_materia: codigo,
			nombre_materia: nombre,
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
		});
	}

	return { docente, materias };
}

async function getDocenteMateriaCompletion({ cfg_t, docente, codigo_materia, sede, periodo, programa, semestre, grupo }) {
	const cfgId = Number(cfg_t);
	if (!cfgId) throw new Error('cfg_t is required');
	if (!docente) throw new Error('docente is required');
	if (!codigo_materia) throw new Error('codigo_materia is required');

	const whereVista = buildVistaWhere({ sede, periodo, programa, semestre, grupo });
	whereVista.ID_DOCENTE = docente;
	whereVista.COD_ASIGNATURA = Number(codigo_materia);

	const vista = await userPrisma.vista_academica_insitus.findMany({
		where: whereVista,
		select: { ID_ESTUDIANTE: true, PRIMER_APELLIDO: true, SEGUNDO_APELLIDO: true, PRIMER_NOMBRE: true, SEGUNDO_NOMBRE: true }
	});
	const students = Array.from(
		new Map(
			vista
				.filter(v => v.ID_ESTUDIANTE)
				.map(v => [
					v.ID_ESTUDIANTE,
					{
						id: v.ID_ESTUDIANTE,
						nombre: [v.PRIMER_APELLIDO, v.SEGUNDO_APELLIDO, v.PRIMER_NOMBRE, v.SEGUNDO_NOMBRE]
							.filter(Boolean)
							.join(' ').replace(/\s+/g, ' ').trim()
					}
				])
		).values()
	);

	// Find evals for this docente + materia with responses
	const evals = await localPrisma.eval.findMany({
		where: { id_configuracion: cfgId, docente, codigo_materia: String(codigo_materia) },
		select: { id: true, estudiante: true }
	});
	const evalIds = evals.map(e => e.id);
	const det = evalIds.length ? await localPrisma.eval_det.findMany({ where: { eval_id: { in: evalIds } }, select: { eval_id: true } }) : [];
	const withResp = new Set(det.map(d => d.eval_id));
	const completedIds = new Set(evals.filter(e => withResp.has(e.id)).map(e => e.estudiante).filter(Boolean));

	const completados = students.filter(s => completedIds.has(s.id));
	const pendientes = students.filter(s => !completedIds.has(s.id));

	return { docente, codigo_materia: String(codigo_materia), completados, pendientes };
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

	const aeRecords = await localPrisma.a_e.findMany({
		where: { id: { in: aeIds } },
		select: { id: true, aspecto_id: true, escala_id: true }
	});
	const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.aspecto_id]));
	const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

	const escalaIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
	const cfgE = await localPrisma.cfg_e.findMany({
		where: { cfg_t_id: cfgId, escala_id: { in: escalaIds } },
		select: { escala_id: true, puntaje: true }
	});
	const puntajeByEscala = new Map(cfgE.map(c => [c.escala_id, Number(c.puntaje)]));

	const agg = new Map();
	for (const d of detalles) {
		const asp = aspectoByAe.get(d.a_e_id);
		if (!asp) continue;
		const escala = escalaByAe.get(d.a_e_id);
		const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
		const entry = agg.get(asp) || { aspecto_id: asp, count: 0, sum: 0, scores: [] };
		entry.count += 1;
		if (typeof puntaje === 'number') {
			entry.sum += puntaje;
			entry.scores.push(puntaje);
		}
		agg.set(asp, entry);
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
			total_respuestas: entry.count,
			suma: entry.sum,
			promedio: avg,
			desviacion: std,
		};
		aspectos.push(item);
	}

	const aspectoIds = aspectos.map(a => a.aspecto_id);
	if (aspectoIds.length) {
		const aspectosInfo = await localPrisma.aspecto.findMany({ where: { id: { in: aspectoIds } }, select: { id: true, nombre: true } });
		const nameById = new Map(aspectosInfo.map(a => [a.id, a.nombre]));
		for (const a of aspectos) a.nombre = nameById.get(a.aspecto_id) || null;
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

	// Cargar conclusiones/fortaleza/debilidad desde cmt_ai asociados a estos evals
	const cmtAi = await localPrisma.cmt_ai.findMany({
		where: { eval_id: { in: evalIds } },
		select: { aspecto_id: true, conclusion: true, conclusion_gen: true, fortaleza: true, debilidad: true }
	});
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

	const aeRecords = await localPrisma.a_e.findMany({
		where: { id: { in: aeIds } },
		select: { id: true, aspecto_id: true, escala_id: true }
	});
	const aspectoByAe = new Map(aeRecords.map(r => [r.id, r.aspecto_id]));
	const escalaByAe = new Map(aeRecords.map(r => [r.id, r.escala_id]));

	const escalaIds = Array.from(new Set(aeRecords.map(r => r.escala_id).filter(Boolean)));
	const cfgE = await localPrisma.cfg_e.findMany({
		where: { cfg_t_id: cfgId, escala_id: { in: escalaIds } },
		select: { escala_id: true, puntaje: true }
	});
	const puntajeByEscala = new Map(cfgE.map(c => [c.escala_id, Number(c.puntaje)]));

	const agg = new Map();
	for (const d of detalles) {
		const asp = aspectoByAe.get(d.a_e_id);
		if (!asp) continue;
		const escala = escalaByAe.get(d.a_e_id);
		const puntaje = escala ? puntajeByEscala.get(escala) : undefined;
		const entry = agg.get(asp) || { aspecto_id: asp, count: 0, sum: 0, scores: [], cmt: [] };
		entry.count += 1;
		if (typeof puntaje === 'number') {
			entry.sum += puntaje;
			entry.scores.push(puntaje);
		}
		const c = (d.cmt || '').trim();
		if (c.length || d.cmt === '') {
			// Include empty strings as requested in sample
			entry.cmt.push(d.cmt ?? '');
		}
		agg.set(asp, entry);
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
			total_respuestas: entry.count,
			suma: entry.sum,
			promedio: avg,
			desviacion: std,
			cmt: entry.cmt,
			conclusion: conclusionByAspect.get(entry.aspecto_id) || null
		};
		aspectos.push(item);
	}

	const aspectoIds = aspectos.map(a => a.aspecto_id);
	if (aspectoIds.length) {
		const aspectosInfo = await localPrisma.aspecto.findMany({ where: { id: { in: aspectoIds } }, select: { id: true, nombre: true } });
		const nameById = new Map(aspectosInfo.map(a => [a.id, a.nombre]));
		for (const a of aspectos) a.nombre = nameById.get(a.aspecto_id) || null;
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
		aspectos
	};
}

module.exports = {
	getEvaluationSummary,
	getDocenteStats,
	getRanking,
	getDocenteCompletion,
	getDocenteAspectMetrics,
	getDocenteMateriaMetrics,
	getDocenteMateriaCompletion,
	getDocenteMateriaAspectMetrics,
	getDocenteCommentsWithMetrics,
};
