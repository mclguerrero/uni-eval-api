
const { analyzeFromAggregated } = require('../ai/comment-analysis.service');
const { resolveProviderForUser } = require('../ai/ai-key/ai-key.service');
const { runQueue } = require('../ai/analysis.queue');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const aspectChartCanvas = new ChartJSNodeCanvas({
    width: 1600,
    height: 920,
    backgroundColour: 'white'
});

const ASPECT_CHART_ORDER = [
    'Evaluación justa',
    'Puntualidad y asistencia',
    'Metodología de enseñanza',
    'Dominio del tema'
];


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

function normalizeChartText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function toChartNumber(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return null;
    return Number(numberValue.toFixed(2));
}

function resolvePromedioForDocx(item) {
    const candidates = [
        item?.promedio,
        item?.eval?.nota_final_ponderada,
        item?.eval?.promedio_general,
        item?.promedio_general
    ];

    for (const candidate of candidates) {
        const parsed = toChartNumber(candidate);
        if (parsed != null) return parsed;
    }

    return 0;
}

function buildAspectChartBars(aspectos = []) {
    const safeAspectos = Array.isArray(aspectos) ? aspectos : [];
    const byName = new Map(
        safeAspectos.map((item) => [
            normalizeChartText(item?.nombre ?? item?.aspecto_nombre ?? item?.label),
            item
        ])
    );

    const orderedBars = ASPECT_CHART_ORDER.map((label) => {
        const source = byName.get(normalizeChartText(label));
        const value = toChartNumber(source?.promedio ?? source?.promedio_general ?? source?.value);
        if (value == null) return null;
        return { label, value };
    }).filter(Boolean);

    if (orderedBars.length) return orderedBars;

    return safeAspectos
        .map((item) => ({
            label: String(item?.nombre ?? item?.aspecto_nombre ?? item?.label ?? '').trim(),
            value: toChartNumber(item?.promedio ?? item?.promedio_general ?? item?.value)
        }))
        .filter((item) => item.label && item.value != null);
}

const aspectValueLabelsPlugin = {
    id: 'aspectValueLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const dataset = chart.data.datasets?.[0];
        if (!dataset) return;

        ctx.save();
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const rawValue = dataset.data?.[index];
            if (rawValue == null) return;

            const label = Number(rawValue).toFixed(2);
            ctx.fillText(label, bar.x + 18, bar.y);
        });

        ctx.restore();
    }
};


async function buildAspectBarChartImage(aspectos = []) {
    const bars = buildAspectChartBars(aspectos);
    if (!bars.length) return null;

    const configuration = {
        type: 'bar',
        plugins: [aspectValueLabelsPlugin],
        data: {
            labels: bars.map((item) => item.label),
            datasets: [{
                label: 'Promedio por aspecto',
                data: bars.map((item) => item.value),
                backgroundColor: [
                    'rgba(15, 118, 110, 0.92)',
                    'rgba(59, 130, 246, 0.92)',
                    'rgba(249, 115, 22, 0.92)',
                    'rgba(168, 85, 247, 0.92)'
                ],
                borderColor: [
                    'rgba(15, 118, 110, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(249, 115, 22, 1)',
                    'rgba(168, 85, 247, 1)'
                ],
                borderWidth: 1,
                borderRadius: 16,
                barThickness: 56,
                maxBarThickness: 62,
                hoverBackgroundColor: [
                    'rgba(15, 118, 110, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(249, 115, 22, 1)',
                    'rgba(168, 85, 247, 1)'
                ]
            }]
        },
        options: {
            responsive: false,
            animation: false,
            indexAxis: 'y',
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Resultados por aspecto',
                    color: '#111827',
                    font: {
                        size: 36,
                        weight: 'bold'
                    },
                    padding: {
                        top: 8,
                        bottom: 18
                    }
                },
                subtitle: {
                    display: true,
                    text: 'Escala de 1 a 5. Valores mostrados al final de cada barra.',
                    color: '#6B7280',
                    font: {
                        size: 20,
                        weight: 'normal'
                    },
                    padding: {
                        bottom: 16
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: '#374151',
                        font: {
                            size: 20,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.28)',
                        lineWidth: 1
                    },
                    border: {
                        color: '#CBD5E1'
                    }
                },
                y: {
                    ticks: {
                        color: '#111827',
                        font: {
                            size: 26,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    }
                }
            },
            layout: {
                padding: {
                    top: 18,
                    right: 110,
                    bottom: 20,
                    left: 22
                }
            },
            elements: {
                bar: {
                    borderSkipped: false
                }
            }
        }
    };

    return aspectChartCanvas.renderToDataURL(configuration);
}

async function evaluationSummary(query) {
	return repo.getEvaluationSummary(query);
}

async function evaluationSummaryByProgram(query) {
    return repo.getEvaluationSummaryByProgram(query);
}

async function docenteStats(query, search, sort) {
	const { page, limit, ...filterQuery } = query;
	const includeEval = String(filterQuery.include_eval ?? 'false').toLowerCase() === 'true';
	if (!filterQuery.docente) {
        const allDocentes = await repo.getAllDocentesStats(
            { ...filterQuery, page: parseInt(page) || 1, limit: parseInt(limit) || 10 },
            search,
            sort
        );

        const data = includeEval
            ? await Promise.all((allDocentes?.data || []).map(async (item) => {
                const aspectData = await repo.getDocenteAspectMetrics({
                    cfg_t: filterQuery.cfg_t,
                    docente: item?.docente,
                    sede: filterQuery.sede,
                    periodo: filterQuery.periodo,
                    programa: filterQuery.programa,
                    semestre: filterQuery.semestre,
                    grupo: filterQuery.grupo
                });

                return {
                    docente: item?.docente,
                    nombre_docente: item?.nombre_docente,
                    total_evaluaciones: item?.total_evaluaciones ?? 0,
                    total_realizadas: item?.total_realizadas ?? 0,
                    total_pendientes: item?.total_pendientes ?? 0,
                    total_evaluaciones_registradas: item?.total_evaluaciones_registradas ?? 0,
                    total_estudiantes_registrados: item?.total_estudiantes_registrados ?? 0,
                    porcentaje_cumplimiento: item?.porcentaje_cumplimiento != null
                        ? Number(Number(item.porcentaje_cumplimiento).toFixed(2))
                        : 0,
                    eval: {
                        total_respuestas: aspectData?.evaluacion_estudiantes?.total_respuestas ?? null,
                        total_cmt: aspectData?.evaluacion_estudiantes?.total_cmt ?? null,
                        total_cmt_gen: aspectData?.evaluacion_estudiantes?.total_cmt_gen ?? null,
                        suma_cmt: aspectData?.evaluacion_estudiantes?.suma_cmt ?? null,
                        nota_final_ponderada: aspectData?.resultado_final?.nota_final_ponderada ?? null
                    }
                };
            }))
            : (allDocentes?.data || []).map((item) => ({
                docente: item?.docente,
                nombre_docente: item?.nombre_docente,
                total_evaluaciones: item?.total_evaluaciones ?? 0,
                total_realizadas: item?.total_realizadas ?? 0,
                total_pendientes: item?.total_pendientes ?? 0,
                total_evaluaciones_registradas: item?.total_evaluaciones_registradas ?? 0,
                total_estudiantes_registrados: item?.total_estudiantes_registrados ?? 0,
                porcentaje_cumplimiento: item?.porcentaje_cumplimiento != null
                    ? Number(Number(item.porcentaje_cumplimiento).toFixed(2))
                    : 0
            }));

        return {
            data,
            pagination: allDocentes?.pagination
        };
	}
    const baseStats = await repo.getDocenteStats(filterQuery);
    const aspectData = await repo.getDocenteAspectMetrics({
        cfg_t: filterQuery.cfg_t,
        docente: filterQuery.docente,
        sede: filterQuery.sede,
        periodo: filterQuery.periodo,
        programa: filterQuery.programa,
        semestre: filterQuery.semestre,
        grupo: filterQuery.grupo
    });

    return {
        docente: baseStats?.docente,
        nombre_docente: baseStats?.nombre_docente,
        total_evaluaciones: baseStats?.total_evaluaciones ?? 0,
        total_realizadas: baseStats?.total_realizadas ?? 0,
        total_pendientes: baseStats?.total_pendientes ?? 0,
        total_evaluaciones_registradas: baseStats?.total_evaluaciones_registradas ?? 0,
        total_estudiantes_registrados: baseStats?.total_estudiantes_registrados ?? 0,
        porcentaje_cumplimiento: baseStats?.porcentaje_cumplimiento != null
            ? Number(Number(baseStats.porcentaje_cumplimiento).toFixed(2))
            : 0,
        eval: {
            total_respuestas: aspectData?.evaluacion_estudiantes?.total_respuestas ?? null,
            total_cmt: aspectData?.evaluacion_estudiantes?.total_cmt ?? null,
            total_cmt_gen: aspectData?.evaluacion_estudiantes?.total_cmt_gen ?? null,
            suma_cmt: aspectData?.evaluacion_estudiantes?.suma_cmt ?? null,
            nota_final_ponderada: aspectData?.resultado_final?.nota_final_ponderada ?? null
        }
    };
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



/**
 * Elimina registros previos de cmt_ai para la combinación exacta de docente+materia+contexto.
 * Incluye los filtros opcionales de contexto (periodo, sede, programa, semestre)
 * para no borrar análisis de otros contextos del mismo docente/materia.
 */
async function deleteCmtAiForDocente(prisma, { cfgId, docente, codigo_materia, periodo, sede, programa, semestre }) {
    const where = {
        cfg_t_id:       cfgId,
        docente:        String(docente),
        codigo_materia: String(codigo_materia),
    };
    if (periodo)  where.periodo  = periodo;
    if (sede)     where.sede     = sede;
    if (programa) where.programa = programa;
    if (semestre) where.semestre = semestre;

    await prisma.cmt_ai.deleteMany({ where });
}

async function saveCmtAiRecords(localPrisma, records) {
    if (!records.length) return;
    await localPrisma.cmt_ai.createMany({ data: records });
}

/**
 * Ejecuta análisis de comentarios docentes con filtros arbitrarios.
 *
 * Filtros aceptados en `query`:
 *   cfg_t          (requerido) — id de la configuración de tipo
 *   user_id        (requerido para usar key propia del usuario)
 *   periodo        (opcional)
 *   sede           (opcional)
 *   programa       (opcional)
 *   semestre       (opcional)
 *   grupo          (opcional) — restringe a un único grupo
 *   docente        (opcional) — restringe a un único docente
 *   codigo_materia (opcional) — restringe a una única materia
 *
 * Jerarquía de agrupación:
 *   periodo → sede → programa → semestre → docente → materia → grupo
 *
 * Cada combinación (sede, programa, semestre, docente, materia) se analiza
 * de forma independiente. Si tiene más de un grupo se genera un consolidado.
 */
async function docenteCommentsAnalysis(query) {
    const { localPrisma } = require('../../../../prisma/clients');
    const cfgId  = Number(query.cfg_t);
    const userId = query.user_id ? Number(query.user_id) : null;

    if (!cfgId) throw Object.assign(new Error('cfg_t es requerido'), { status: 400 });

    // 1. Resolver proveedor de IA del usuario (fallback: Ollama global)
    const { provider, keyId } = await resolveProviderForUser(userId);

    // 2. Construir filtro de consulta con todos los parámetros recibidos
    const evalWhere = { id_configuracion: cfgId };
    if (query.periodo)         evalWhere.periodo        = String(query.periodo);
    if (query.sede)            evalWhere.sede            = String(query.sede);
    if (query.programa)        evalWhere.programa        = String(query.programa);
    if (query.semestre)        evalWhere.semestre        = String(query.semestre);
    if (query.grupo)           evalWhere.grupo           = String(query.grupo);
    if (query.docente)         evalWhere.docente         = String(query.docente);
    if (query.codigo_materia)  evalWhere.codigo_materia  = String(query.codigo_materia);

    // 3. Cargar todos los evals que cumplen los filtros
    const evals = await localPrisma.eval.findMany({
        where:  evalWhere,
        select: {
            id: true,
            periodo: true, sede: true, programa: true, semestre: true,
            grupo: true, docente: true, codigo_materia: true, cmt_gen: true,
        },
    });

    if (!evals.length) {
        return { success: false, message: 'No hay evaluaciones para los filtros dados' };
    }

    // 4. Cargar eval_det para todos los evals en una sola consulta
    const evalIds = evals.map(e => e.id);
    const detalles = await localPrisma.eval_det.findMany({
        where:  { eval_id: { in: evalIds } },
        select: { eval_id: true, cmt: true },
    });

    const cmtByEval = new Map();
    for (const d of detalles) {
        if ((d.cmt || '').trim()) {
            if (!cmtByEval.has(d.eval_id)) cmtByEval.set(d.eval_id, []);
            cmtByEval.get(d.eval_id).push(d.cmt.trim());
        }
    }

    // 5. Agrupar por (periodo, sede, programa, semestre, docente, codigo_materia)
    //    y dentro de cada grupo, recolectar comentarios por grupo académico
    const materiaMap = new Map();
    for (const ev of evals) {
        const key = [
            ev.periodo || '', ev.sede || '', ev.programa || '',
            ev.semestre || '', ev.docente || '', ev.codigo_materia || '',
        ].join('|');

        if (!materiaMap.has(key)) {
            materiaMap.set(key, {
                periodo:        ev.periodo,
                sede:           ev.sede,
                programa:       ev.programa,
                semestre:       ev.semestre,
                docente:        ev.docente,
                codigo_materia: ev.codigo_materia,
                grupoMap:       new Map(),
            });
        }

        const mat = materiaMap.get(key);
        const g   = ev.grupo || 'SIN_GRUPO';
        if (!mat.grupoMap.has(g)) mat.grupoMap.set(g, []);
        if ((ev.cmt_gen || '').trim()) mat.grupoMap.get(g).push(ev.cmt_gen.trim());
        for (const cmt of (cmtByEval.get(ev.id) || [])) mat.grupoMap.get(g).push(cmt);
    }

    const materiasAAnalizar = Array.from(materiaMap.values());

    // 6. Analizar cada combinación docente+materia con concurrencia controlada
    const resultadosRaw = await runQueue(materiasAAnalizar, async (mat) => {
        const grupos = Array.from(mat.grupoMap.entries())
            .map(([grupo, comentarios]) => ({ grupo, comentarios }));

        const tieneContenido = grupos.some(g => g.comentarios.length > 0);

        // Eliminar análisis previos para esta combinación exacta
        await deleteCmtAiForDocente(localPrisma, {
            cfgId,
            docente:        mat.docente,
            codigo_materia: mat.codigo_materia,
            periodo:        mat.periodo,
            sede:           mat.sede,
            programa:       mat.programa,
            semestre:       mat.semestre,
        });

        if (!tieneContenido) {
            return {
                docente: mat.docente, codigo_materia: mat.codigo_materia,
                periodo: mat.periodo, sede: mat.sede,
                programa: mat.programa, semestre: mat.semestre,
                estado: 'sin_comentarios',
            };
        }

        // Ejecutar análisis IA (con chunking automático si es necesario)
        const analisisIA = await analyzeFromAggregated(
            { docente: mat.docente, codigo_materia: mat.codigo_materia, grupos },
            provider
        );

        // Persistir resultados
        if (analisisIA.analisis) {
            const { grupos: gruposAnalysis, conclusion_general, fortalezas, debilidades } = analisisIA.analisis;
            const records = [];

            // Un registro por grupo analizado
            for (const g of gruposAnalysis) {
                records.push({
                    cfg_t_id:       cfgId,
                    docente:        mat.docente,
                    codigo_materia: mat.codigo_materia,
                    periodo:        mat.periodo,
                    sede:           mat.sede,
                    programa:       mat.programa,
                    semestre:       mat.semestre,
                    grupo:          g.grupo,
                    user_ai_key_id: keyId,
                    conclusion:     g.conclusion  || null,
                    fortaleza:      g.fortalezas  || [],
                    debilidad:      g.debilidades || [],
                });
            }

            // Registro consolidado (solo cuando hay más de un grupo)
            if (gruposAnalysis.length > 1) {
                records.push({
                    cfg_t_id:       cfgId,
                    docente:        mat.docente,
                    codigo_materia: mat.codigo_materia,
                    periodo:        mat.periodo,
                    sede:           mat.sede,
                    programa:       mat.programa,
                    semestre:       mat.semestre,
                    grupo:          null,
                    user_ai_key_id: keyId,
                    conclusion:     conclusion_general || null,
                    fortaleza:      fortalezas  || [],
                    debilidad:      debilidades || [],
                });
            }

            await saveCmtAiRecords(localPrisma, records);
        }

        return {
            docente:        mat.docente,
            codigo_materia: mat.codigo_materia,
            periodo:        mat.periodo,
            sede:           mat.sede,
            programa:       mat.programa,
            semestre:       mat.semestre,
            estado:         'analizado',
        };
    }, { concurrency: 2 });

    return {
        success:            true,
        proveedor:          provider.getName(),
        materias_analizadas: materiasAAnalizar.length,
        resultados:         resultadosRaw.filter(Boolean),
    };
}

async function generateDocxReport({
    cfg_t,
    docente,
    codigo_materia,
    sede,
    periodo,
    programa,
    semestre,
    grupo,
}) {
    if (!cfg_t) throw new Error('cfg_t es requerido');

    const { localPrisma, userPrisma } = require('../../../../prisma/clients');
    const { buildEvaluationReport } = require('./docx-report.builder');

    const cfgId = Number(cfg_t);

    // 1. Obtener lista de docentes a incluir en el reporte
    const evalWhere = { id_configuracion: cfgId };
    if (docente)        evalWhere.docente        = String(docente);
    if (codigo_materia) evalWhere.codigo_materia = String(codigo_materia);
    if (periodo)        evalWhere.periodo        = String(periodo);
    if (sede)           evalWhere.sede           = String(sede);
    if (programa)       evalWhere.programa       = String(programa);
    if (semestre)       evalWhere.semestre       = String(semestre);
    if (grupo)          evalWhere.grupo          = String(grupo);

    const evalsDistinct = await localPrisma.eval.findMany({
        where:  evalWhere,
        select: { docente: true },
        distinct: ['docente'],
    });

    if (!evalsDistinct.length) throw new Error('No hay evaluaciones para los filtros dados');

    const docenteIds = evalsDistinct.map(e => e.docente).filter(Boolean);

    // 2. Resolver nombres de docentes desde userPrisma
    let nombresMap = new Map();
    try {
        const registros = await userPrisma.vista_academica_insitus.findMany({
            where: {
                ID_DOCENTE: { in: docenteIds },
                NOT: { DOCENTE: 'DOCENTE SIN ASIGNAR' },
            },
            select: { ID_DOCENTE: true, DOCENTE: true },
            distinct: ['ID_DOCENTE'],
        });
        for (const r of registros) nombresMap.set(r.ID_DOCENTE, r.DOCENTE);
    } catch { /* userPrisma puede no estar disponible en todos los entornos */ }

    // 3. Para cada docente, recopilar: aspectos, materias, cmt_ai, chart
    const filterBase = { cfg_t, codigo_materia, sede, periodo, programa, semestre, grupo };

    const docentesData = await Promise.all(docenteIds.map(async (doc_id) => {
        const q = { ...filterBase, docente: doc_id };

        const [aspectos, materiasRaw, cmtAiRecords] = await Promise.all([
            docenteAspectMetrics(q),
            docenteMateriaMetrics(q),
            localPrisma.cmt_ai.findMany({
                where: {
                    cfg_t_id:       cfgId,
                    docente:        String(doc_id),
                    ...(codigo_materia && { codigo_materia: String(codigo_materia) }),
                    ...(periodo  && { periodo:  String(periodo)  }),
                    ...(sede     && { sede:     String(sede)     }),
                    ...(programa && { programa: String(programa) }),
                    ...(semestre && { semestre: String(semestre) }),
                    ...(grupo    && { grupo:    String(grupo)    }),
                },
                select: {
                    codigo_materia: true,
                    grupo:          true,
                    conclusion:     true,
                    fortaleza:      true,
                    debilidad:      true,
                },
            }),
        ]);

        // Indexar cmt_ai por "codigo_materia|grupo" para acceso O(1)
        const cmtAiMap = new Map();
        for (const r of cmtAiRecords) {
            cmtAiMap.set(`${r.codigo_materia}|${r.grupo ?? 'null'}`, r);
        }

        const chartAspectos = Array.isArray(aspectos?.evaluacion_estudiantes?.aspectos)
            ? aspectos.evaluacion_estudiantes.aspectos
            : [];
        const chartImage = await buildAspectBarChartImage(chartAspectos);

        const materias = (materiasRaw?.materias ?? []).map((m) => ({
            ...m,
            promedio: resolvePromedioForDocx(m),
            grupos: Array.isArray(m.grupos)
                ? m.grupos.map(g => ({ ...g, promedio: resolvePromedioForDocx(g) }))
                : m.grupos,
        }));

        return {
            docente:        doc_id,
            nombre_docente: nombresMap.get(doc_id) ?? null,
            nota_final:     aspectos?.resultado_final?.nota_final_ponderada ?? null,
            aspectos,
            materias,
            cmtAiMap,
            chartImage,
        };
    }));

    // 4. Construir y devolver el buffer DOCX
    return buildEvaluationReport({
        docentes:  docentesData,
        periodo:   periodo  ?? null,
        sede:      sede     ?? null,
        programa:  programa ?? null,
        semestre:  semestre ?? null,
        grupo:     grupo    ?? null,
        fecha_hora: formatDateTimeBogota(Date.now()),
    });
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
