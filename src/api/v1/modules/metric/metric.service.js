
const { analyzeFromAggregated } = require('../ai/comment-analysis.service');
const CfgTRepository = require('../app/cfg-t/cfg-t.repository');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');


async function CfgId(cfgTId, search, sort) {
    // Instanciar el repositorio y llamar el método
    const repo = new CfgTRepository();
    return repo.findCfgByIdWithPair(cfgTId, search, sort);
}

/**
 * Format a Date or date-like value to YYYY-MM-DD.
 * Falls back to empty string if invalid.
 */
function formatDate(value) {
    if (!value) return '';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    } catch {
        return '';
    }
}
/**
 * Format current date-time in America/Bogota timezone.
 * Returns string like YYYY-MM-DD HH:mm:ss (America/Bogota).
 */
function formatDateTimeBogota(value) {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) return '';
    const fmt = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    // es-CO gives DD/MM/YYYY, convert to YYYY-MM-DD
    const parts = fmt.formatToParts(d);
    const by = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const date = `${by.year}-${by.month}-${by.day}`;
    const time = `${by.hour}:${by.minute}:${by.second}`;
    return `${date} ${time}`;
}

async function evaluationSummary(query) {
	return repo.getEvaluationSummary(query);
}

async function evaluationSummaryByProgram(query) {
    return repo.getEvaluationSummaryByProgram(query);
}

async function docenteStats(query, search, sort) {
	const { page, limit, ...filterQuery } = query;
	if (!filterQuery.docente) {
		return repo.getAllDocentesStats({ ...filterQuery, page: parseInt(page) || 1, limit: parseInt(limit) || 10 }, search, sort);
	}
	return repo.getDocenteStats(filterQuery);
}

async function ranking(query) {
	return repo.getRanking(query);
}

async function docenteAspectMetrics(query) {
    return repo.getDocenteAspectMetrics(query);
}

const repo = require('./metric.repository');
async function docenteMateriaMetrics(query) {
    const materiasStats = await repo.getDocenteMateriaMetrics(query);
    const cfg_t = query.cfg_t;
    const docente = query.docente;
    const materias = await Promise.all((materiasStats?.materias || []).map(async m => {
        const aspectData = await repo.getDocenteAspectMetrics({ cfg_t, docente, codigo_materia: m.codigo_materia });
        const notaFinal = aspectData?.resultado_final?.nota_final_ponderada ?? null;
        const materiaObj = {
            codigo_materia: String(m.codigo_materia || ''),
            nombre_materia: m.nombre_materia || String(m.codigo_materia || ''),
            nom_programa: m.nom_programa,
            semestre: m.semestre,
            total_evaluaciones: m.total_evaluaciones,
            total_realizadas: m.total_realizadas,
            total_pendientes: m.total_pendientes,
            total_evaluaciones_registradas: m.total_evaluaciones_registradas,
            total_estudiantes_registrados: m.total_estudiantes_registrados,
            porcentaje_cumplimiento: m.porcentaje_cumplimiento != null ? Number(m.porcentaje_cumplimiento.toFixed(2)) : m.porcentaje_cumplimiento,
            eval: {
                total_respuestas: aspectData?.evaluacion_estudiantes?.total_respuestas ?? null,
                total_cmt: aspectData?.evaluacion_estudiantes?.total_cmt ?? null,
                total_cmt_gen: aspectData?.evaluacion_estudiantes?.total_cmt_gen ?? null,
                suma_cmt: aspectData?.evaluacion_estudiantes?.suma_cmt ?? null,
                nota_final_ponderada: aspectData?.resultado_final?.nota_final_ponderada ?? null
            }
        };
        if (m.grupo) {
            materiaObj.grupo = m.grupo;
        }
        if (m.grupos) {
            materiaObj.grupos = await Promise.all(m.grupos.map(async g => {
                const aspectDataGrupo = await repo.getDocenteAspectMetrics({ cfg_t, docente, codigo_materia: m.codigo_materia, grupo: g.grupo });
                const {
                    suma,
                    promedio_general,
                    desviacion_general,
                    total_aspectos,
                    nota_final_ponderada, 
                    ...rest
                } = g;
                return {
                    ...rest,
                    porcentaje_cumplimiento: g.porcentaje_cumplimiento != null ? Number(g.porcentaje_cumplimiento.toFixed(2)) : g.porcentaje_cumplimiento,
                    eval: {
                        total_respuestas: aspectDataGrupo?.evaluacion_estudiantes?.total_respuestas ?? null,
                        total_cmt: aspectDataGrupo?.evaluacion_estudiantes?.total_cmt ?? null,
                        total_cmt_gen: aspectDataGrupo?.evaluacion_estudiantes?.total_cmt_gen ?? null,
                        suma_cmt: aspectDataGrupo?.evaluacion_estudiantes?.suma_cmt ?? null,
                        nota_final_ponderada: aspectDataGrupo?.resultado_final?.nota_final_ponderada ?? null
                    }
                };
            }));
        }
        return materiaObj;
    }));
    return {
        docente: materiasStats?.docente,
        nombre_docente: materiasStats?.nombre_docente,
        materias
    };
}

async function docenteMateriaCompletion(query) {
    return repo.getDocenteMateriaCompletion(query);
}

async function docenteComments(query) {
    const { userPrisma } = require('../../../../prisma/clients');
    
    // Obtener datos de métricas
    const metricsData = await repo.getDocenteCommentsWithMetrics(query);
    
    // Recuperar el nombre del docente desde userPrisma.vista_academica_insitus
    if (query.docente) {
        try {
            const docente = await userPrisma.vista_academica_insitus.findFirst({
                where: { 
                    ID_DOCENTE: String(query.docente),
                    NOT: { DOCENTE: 'DOCENTE SIN ASIGNAR' }
                },
                select: { DOCENTE: true, ID_DOCENTE: true }
            });
            
            if (docente) {
                metricsData.docente_nombre = docente.DOCENTE;
                metricsData.docente_id = docente.ID_DOCENTE;
            }
        } catch (e) {
            console.warn(`[docenteComments] Error recuperando nombre del docente: ${e.message}`);
        }
    }
    
    return metricsData;
}

function parseJsonSafe(text, fallback = {}) {
    if (text == null) return fallback;
    if (typeof text === 'object') return text; // Already parsed JSON from Prisma
    if (typeof text !== 'string') return fallback;
    try { return JSON.parse(text); } catch {}
    const match = text.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
        try { return JSON.parse(match[0]); } catch {}
    }
    return fallback;
}

function hasTextComments(data) {
    const general = Array.isArray(data?.cmt_gen) ? data.cmt_gen : [];
    const hasGeneral = general.some((c) => String(c || '').trim().length > 0);
    if (hasGeneral) return true;

    const aspectos = Array.isArray(data?.aspectos) ? data.aspectos : [];
    return aspectos.some((asp) => {
        const comments = Array.isArray(asp?.cmt) ? asp.cmt : [];
        return comments.some((c) => String(c || '').trim().length > 0);
    });
}

async function mapWithConcurrency(items, concurrency, mapper) {
    if (!Array.isArray(items) || !items.length) return [];
    const limit = Math.max(1, Number(concurrency) || 1);
    const results = new Array(items.length);
    let current = 0;

    async function worker() {
        while (true) {
            const idx = current;
            current += 1;
            if (idx >= items.length) return;
            results[idx] = await mapper(items[idx], idx);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

async function deleteCmtAiCompat(localPrisma, { cfgId, docente, codigo_materia }) {
    try {
        await localPrisma.cmt_ai.deleteMany({
            where: {
                cfg_t_id: cfgId,
                docente: String(docente),
                codigo_materia: String(codigo_materia)
            }
        });
    } catch (err) {
        if (String(err?.message || '').includes('Unknown argument `docente`')) {
            await localPrisma.cmt_ai.deleteMany({
                where: { cfg_t_id: cfgId }
            });
            return;
        }
        throw err;
    }
}

async function createCmtAiCompat(localPrisma, records) {
    if (!records.length) return;
    try {
        await localPrisma.cmt_ai.createMany({ data: records });
    } catch (err) {
        if (String(err?.message || '').includes('Unknown argument `docente`')) {
            const sanitized = records.map((r) => ({
                cfg_t_id: r.cfg_t_id,
                aspecto_id: r.aspecto_id,
                conclusion: r.conclusion,
                conclusion_gen: r.conclusion_gen,
                fortaleza: r.fortaleza,
                debilidad: r.debilidad
            }));
            await localPrisma.cmt_ai.createMany({ data: sanitized });
            return;
        }
        throw err;
    }
}

async function docenteCommentsAnalysis(query) {
	const { localPrisma } = require('../../../../prisma/clients');
	const cfgId = Number(query.cfg_t);
	
	// 1. Obtener todas las materias del docente para esta configuración
	const evalRecords = await localPrisma.eval.findMany({
		where: {
			id_configuracion: cfgId,
			docente: String(query.docente)
		},
		select: { codigo_materia: true },
		distinct: ['codigo_materia']
	});
	
	const materias = evalRecords
		.map(r => r.codigo_materia)
		.filter(Boolean);
	
	// Si se especifica una materia, analizar solo esa
	const materiasAAnalizar = query.codigo_materia ? [String(query.codigo_materia)] : materias;
	
	if (!materiasAAnalizar.length) {
		return {
			success: false,
			message: 'No hay evaluaciones para analizar'
		};
	}
	
    // 2. Analizar materias con concurrencia controlada
    const resultadosRaw = await mapWithConcurrency(materiasAAnalizar, 2, async (codigo_materia) => {
        const dataMateria = await repo.getDocenteCommentsWithMetrics({
            ...query,
            codigo_materia
        });

        if (!dataMateria.total_respuestas) {
            return {
                codigo_materia,
                estado: 'sin_respuestas'
            };
        }

        const hasComments = hasTextComments(dataMateria);

        // 3. Limpiar registros previos para este docente, materia y cfg_t
        await deleteCmtAiCompat(localPrisma, {
            cfgId,
            docente: query.docente,
            codigo_materia
        });

        if (!hasComments) {
            return {
                codigo_materia,
                estado: 'sin_comentarios'
            };
        }

        const analisisIA = await analyzeFromAggregated(dataMateria, query.docente);

        if (analisisIA.analisis) {
            const cmtAiRecords = [];
            for (const aspecto of analisisIA.analisis.aspectos || []) {
                cmtAiRecords.push({
                    cfg_t_id: cfgId,
                    docente: String(query.docente),
                    codigo_materia: String(codigo_materia),
                    aspecto_id: aspecto.aspecto_id,
                    conclusion: aspecto.conclusion || null,
                    conclusion_gen: analisisIA.analisis.conclusion_general || null,
                    fortaleza: analisisIA.analisis.fortalezas || [],
                    debilidad: analisisIA.analisis.debilidades || []
                });
            }

            await createCmtAiCompat(localPrisma, cmtAiRecords);
        }

        return {
            codigo_materia,
            estado: 'analizado',
            analisis: analisisIA
        };
    });

    const resultados = resultadosRaw.filter(Boolean);
	
	// 4. Retornar el análisis generado
	return {
		success: true,
		docente: query.docente,
		materias_analizadas: materiasAAnalizar,
		resultados
	};
}

async function generateDocxReport({
    cfg_t,
    docente,
    codigo_materia,
    ai_mode,
    sede,
    periodo,
    programa,
    semestre,
    grupo
}) {
    if (!cfg_t || !docente) throw new Error('cfg_t y docente son requeridos');

    const { localPrisma } = require('../../../../prisma/clients');
    const cfgId = Number(cfg_t);

    // ================================
    // 1. Obtener datos para Word
    // - docenteAspectMetrics: fuente oficial de métricas por aspecto (lo pintado en Word)
    // - docenteComments: comentarios + conclusiones IA/cache
    // ================================

    // Obtener la data de los endpoints ya procesada
    // Obtener los datos listos desde los endpoints
    const aspectosEndpoint = await docenteAspectMetrics({
        cfg_t,
        docente,
        codigo_materia,
        sede,
        periodo,
        programa,
        semestre,
        grupo
    });
    const materiasEndpoint = await docenteMateriaMetrics({
        cfg_t,
        docente,
        codigo_materia,
        sede,
        periodo,
        programa,
        semestre,
        grupo
    });

    const evalEndpoint = await CfgId(cfgId);

    // Preparar la data para el template (sin cálculos, solo mapeo directo)
    const data = {
    // ---- CAMPOS PLANOS (para evitar problemas) ----
    aspectos_docente: aspectosEndpoint?.docente,
    aspectos_escala_maxima: aspectosEndpoint?.escala_maxima,
    aspectos_promedio_general: aspectosEndpoint?.evaluacion_estudiantes?.promedio_general,
    aspectos_total_respuestas: aspectosEndpoint?.evaluacion_estudiantes?.total_respuestas,
    aspectos_total_cmt: aspectosEndpoint?.evaluacion_estudiantes?.total_cmt,
    aspectos_nota_final: aspectosEndpoint?.resultado_final?.nota_final_ponderada,

    materias_docente: materiasEndpoint?.docente,
    materias_nombre_docente: materiasEndpoint?.nombre_docente,

    informe_fecha: formatDate(Date.now()),
    informe_fecha_hora: formatDateTimeBogota(Date.now()),

    // ---- DEJAS ESTO TAL CUAL PARA LOOPS ----
    aspectos_list: aspectosEndpoint?.evaluacion_estudiantes?.aspectos || [],
    materias_list: materiasEndpoint?.materias || [],
    eval_list: evalEndpoint || [],
    };

    // DEBUG: Mostrar la data final que se pasa al template
    console.log('[DOCX REPORT DATA]', JSON.stringify(data, null, 2));

    // Cargar la plantilla DOCX
    const templatePath = path.resolve(__dirname, '../../templates/Carta_UniPutumayo.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '[[', end: ']]' },
    });

    try {
        doc.render(data);
    } catch (e) {
        const explanation = e.properties?.explanation || e.message;
        throw new Error(`Error en plantilla DOCX: ${explanation}`);
    }

    return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = {
    evaluationSummary,
    evaluationSummaryByProgram,
    docenteStats,
    ranking,
    docenteAspectMetrics,
    docenteMateriaMetrics,
    docenteMateriaCompletion,
    docenteComments,
    docenteCommentsAnalysis,
    generateDocxReport,
};
