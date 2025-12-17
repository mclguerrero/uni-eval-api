const repo = require('./metric.repository');
const { analyzeFromAggregated } = require('../ai/comment-analysis.service');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
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

async function docenteStats(query) {
	return repo.getDocenteStats(query);
}

async function ranking(query) {
	return repo.getRanking(query);
}

async function docenteCompletion(query) {
	return repo.getDocenteCompletion(query);
}

async function docenteAspectMetrics(query) {
	return repo.getDocenteAspectMetrics(query);
}

async function docenteMateriaMetrics(query) {
	return repo.getDocenteMateriaMetrics(query);
}

async function docenteMateriaCompletion(query) {
	return repo.getDocenteMateriaCompletion(query);
}

async function docenteMateriaAspectMetrics(query) {
	return repo.getDocenteMateriaAspectMetrics(query);
}

async function docenteComments(query) {
    const { userPrisma } = require('../../../../prisma/clients');
    
    // Obtener datos de métricas
    const metricsData = await repo.getDocenteCommentsWithMetrics(query);
    
    // Recuperar el nombre del docente desde userPrisma.vista_academica_insitus
    if (query.docente) {
        try {
            const docente = await userPrisma.vista_academica_insitus.findFirst({
                where: { ID_DOCENTE: String(query.docente) },
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
	
	const resultados = [];
	
	// 2. Analizar cada materia por separado
	for (const codigo_materia of materiasAAnalizar) {
		// Obtener datos específicos de esta materia
		const dataMateria = await repo.getDocenteCommentsWithMetrics({
			...query,
			codigo_materia
		});
		
		if (!dataMateria.total_respuestas) {
			continue; // Saltar si no hay respuestas para esta materia
		}
		
		// Analizar comentarios con IA
		const analisisIA = await analyzeFromAggregated(dataMateria, query.docente);
		
        // 3. Guardar análisis en la tabla cmt_ai por aspecto usando cfg_t_id, docente y materia
        if (analisisIA.analisis) {
            // Limpiar registros previos para este docente, materia y cfg_t
            await localPrisma.cmt_ai.deleteMany({
                where: {
                    cfg_t_id: cfgId,
                    docente: String(query.docente),
                    codigo_materia: String(codigo_materia)
                }
            });

            // Crear registros por aspecto
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

            if (cmtAiRecords.length) {
                await localPrisma.cmt_ai.createMany({ data: cmtAiRecords });
            }
        }
		
		resultados.push({
			codigo_materia,
			analisis: analisisIA
		});
	}
	
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
    // 1. Obtener datos usando docenteComments (que usa getDocenteCommentsWithMetrics)
    // ================================
    const metricsData = await docenteComments({
        cfg_t,
        docente,
        codigo_materia,
        sede,
        periodo,
        programa,
        semestre,
        grupo
    });

    // Métricas por materia del docente
    const materiasStats = await repo.getDocenteMateriaMetrics({ cfg_t, docente, sede, periodo, programa, semestre, grupo });
    const materias = (materiasStats?.materias || []).map(m => ({
        codigo_materia: String(m.codigo_materia || ''),
        nombre_materia: m.nombre_materia || String(m.codigo_materia || ''),
        promedio_general: m.promedio_general != null ? Number(m.promedio_general.toFixed(2)) : null,
    }));

    if (!metricsData.aspectos || metricsData.aspectos.length === 0) {
        throw new Error('No hay evaluaciones para este docente/materia');
    }
    
    // Usar el nombre del docente recuperado o el ID
    const docenteNombre = metricsData.docente_nombre || docente;
    const docenteDocumento = metricsData.docente_id || docente || '';
    const materiaSeleccionada = codigo_materia
        ? materias.find(m => m.codigo_materia === String(codigo_materia))
        : materias[0];
    const asignaturaNombre = materiaSeleccionada?.nombre_materia || (codigo_materia ? String(codigo_materia) : '');
    const asignaturaCodigo = materiaSeleccionada?.codigo_materia || (codigo_materia ? String(codigo_materia) : '');

    // ================================
    // 2. Preparar aspectos con formato para el reporte
    // ================================
    const aspectos = metricsData.aspectos.map(asp => ({
        aspecto_id: asp.aspecto_id,
        aspecto_nombre: asp.nombre || `Aspecto ${asp.aspecto_id}`,
        suma: asp.suma || 0,
        promedio: asp.promedio != null ? Number(asp.promedio.toFixed(2)) : 0,
        desviacion: asp.desviacion != null ? Number(asp.desviacion.toFixed(2)) : 0,
        total_respuestas: asp.total_respuestas || 0,
        conclusion: asp.conclusion || ''
    }));

    // ================================
    // 3. Usar métricas calculadas del repository
    // ================================
    const promedioGeneral = metricsData.promedio_general != null 
        ? Number(metricsData.promedio_general.toFixed(2)) 
        : 0;
    const desviacionGeneral = metricsData.desviacion_general != null 
        ? Number(metricsData.desviacion_general.toFixed(2)) 
        : 0;
    const porcentajeCumplimiento = metricsData.porcentaje_cumplimiento || 0;

    // ================================
    // 4. Obtener conclusiones, fortalezas y debilidades
    // ================================
    const conclusionGen = metricsData.conclusion_gen || '';
    const fortalezas = Array.isArray(metricsData.fortalezas) ? metricsData.fortalezas : [];
    const debilidades = Array.isArray(metricsData.debilidades) ? metricsData.debilidades : [];

    // ================================
    // 5. Cargar la plantilla DOCX
    // ================================
    const templatePath = path.resolve(__dirname, '../../templates/Carta_UniPutumayo.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Preparar módulo de imágenes
    let imageModule = null;
    let imageModulePresent = false;
    try {
        let ImageModule;
        try {
            ImageModule = require('docxtemplater-image-module-free');
        } catch (e1) {
            try {
                ImageModule = require('docxtemplater-image-module');
            } catch (e2) {
                console.warn('[docx-report] No image module found:', e1.message);
                throw e2;
            }
        }
        imageModule = new ImageModule({
            getImage: function(tagValue) {
                if (Buffer.isBuffer(tagValue)) return tagValue;
                if (typeof tagValue === 'string' && tagValue.startsWith('data:image/')) {
                    const base64 = tagValue.split(',')[1];
                    return Buffer.from(base64, 'base64');
                }
                return tagValue;
            },
            getSize: function() { return [666, 450]; },
        });
        imageModulePresent = true;
    } catch (e) {
        console.warn('[docx-report] Failed to prepare image module:', e.message);
    }

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '[[', end: ']]' },
        modules: imageModulePresent ? [imageModule] : [],
    });

    // ================================
    // 6. Generar gráfica de barras
    // ================================
    let chartBuffer = null;
    const labels = aspectos.map(a => a.aspecto_nombre);
    const values = aspectos.map(a => a.promedio);
    const chartConfiguration = {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Promedio por aspecto',
                    data: values,
                    backgroundColor: '#1976d2',
                },
            ],
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: { enabled: true },
            },
            scales: {
                x: { beginAtZero: true, suggestedMax: 2 },
                y: { ticks: { maxRotation: 0, minRotation: 0 } },
            },
        },
    };
    
    try {
        const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
        const width = 666;
        const height = 450;
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
        chartBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfiguration);
    } catch (err) {
        chartBuffer = null;
    }

    if (chartBuffer) {
        try {
            const outDir = path.resolve(process.cwd(), 'tmp');
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
            const outPath = path.join(outDir, 'chart.png');
            fs.writeFileSync(outPath, chartBuffer);
        } catch (e) {
            console.warn('[docx-report] Failed to write chart.png:', e.message);
        }
    }

    // ================================
    // 7. Preparar datos para el DOCX
    // ================================
    
    // Construir lista de contexto
    const contexto_list = [];
    if (sede) contexto_list.push({ label: 'Sede', value: sede });
    if (periodo) contexto_list.push({ label: 'Período', value: periodo });
    if (programa) contexto_list.push({ label: 'Programa', value: programa });
    if (semestre) contexto_list.push({ label: 'Semestre', value: semestre });
    if (grupo) contexto_list.push({ label: 'Grupo', value: grupo });
    
    const data = {
        // Información básica
        docente_nombre: docenteNombre,
        docente_documento: docenteDocumento,
        docente: docenteDocumento, // Para plantillas que usen [[docente]]
        asignatura_nombre: asignaturaNombre,
        asignatura_codigo: asignaturaCodigo,
        materias,

        // Fechas
        informe_fecha: formatDate(Date.now()),
        informe_fecha_hora: formatDateTimeBogota(Date.now()),

        // Contexto
        contexto_list,

        // Gráfica
        has_chart: Boolean(chartBuffer && imageModulePresent),
        chart_image: (chartBuffer && imageModulePresent)
            ? `data:image/png;base64,${chartBuffer.toString('base64')}`
            : undefined,

        // Métricas
        promedio_general: promedioGeneral,
        desviacion_general: desviacionGeneral,
        porcentaje_cumplimiento: Number(porcentajeCumplimiento.toFixed(2)),

        total_evaluaciones: metricsData.total_evaluaciones || 0,
        total_realizadas: metricsData.total_realizadas || 0,
        total_pendientes: metricsData.total_pendientes || 0,

        // Aspectos con conclusión corregida
        aspectos: aspectos.map(asp => ({
            ...asp,
            ai_conclusion: asp.conclusion || ''
        })),

        // Conclusiones (nombres ajustados a plantilla)
        ai_conclusion_general: conclusionGen,
        ai_fortalezas_generales: fortalezas,
        ai_debilidades_generales: debilidades,
    };

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
	docenteStats,
	ranking,
	docenteCompletion,
	docenteAspectMetrics,
	docenteMateriaMetrics,
	docenteMateriaCompletion,
	docenteMateriaAspectMetrics,
    docenteComments,
    docenteCommentsAnalysis,
	generateDocxReport,
};
