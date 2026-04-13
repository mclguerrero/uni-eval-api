/**
 * @swagger
 * /metric/evaluations/docente/{docente}/report.docx:
 *   get:
 *     summary: Genera y descarga reporte DOCX del docente desde eval y eval_det
 *     description: Genera un documento Word con métricas, conclusiones y análisis de IA para el docente. Obtiene datos directamente de eval (conclusión general, fortalezas, debilidades) y eval_det (conclusiones por aspecto). Soporta filtros estándar.
 *     tags: [Metric]
 *     parameters:
 *       - in: path
 *         name: docente
 *         required: true
 *         schema:
 *           type: string
 *         description: ID/código del docente
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la configuración de evaluación
 *       - in: query
 *         name: codigo_materia
 *         required: false
 *         schema:
 *           type: string
 *         description: Si se proporciona, filtra el reporte a una materia específica
 *       - in: query
 *         name: ai_mode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [none, cached]
 *           default: cached
 *         description: Modo de IA para el reporte. `none` genera el informe sin conclusiones IA, `cached` usa análisis previamente guardado en cmt_ai.
 *       - in: query
 *         name: sede
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por sede
 *       - in: query
 *         name: periodo
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por período
 *       - in: query
 *         name: programa
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por programa académico
 *       - in: query
 *         name: semestre
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por semestre
 *       - in: query
 *         name: grupo
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por grupo
 *     responses:
 *       200:
 *         description: Archivo Word generado exitosamente
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Parámetros requeridos faltantes o inválidos
 *       404:
 *         description: No hay evaluaciones para este docente/materia
 */

/**
 * @swagger
 * /metric/evaluations/docentes/aspectos:
 *   get:
 *     summary: Métricas por aspecto - docente específico o agregadas de todos
 *     description: |
 *       Retorna métricas desagregadas por aspecto.
 *       
 *       **Comportamientos:**
 *       - Si se proporciona `docente`: Retorna métricas para ese docente específico.
 *       - Si NO se proporciona `docente`: Retorna métricas AGREGADAS de TODOS los docentes.
 *       
 *       En ambos casos, `codigo_materia` es opcional para filtrar por materia.
 *     tags: [Metric]
 *     parameters:
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la configuración de evaluación
 *       - in: query
 *         name: docente
 *         required: false
 *         schema:
 *           type: string
 *         description: ID/código del docente (opcional). Si se omite, retorna métricas agregadas de todos.
 *       - in: query
 *         name: codigo_materia
 *         required: false
 *         schema:
 *           type: string
 *         description: Código de la materia (opcional). Filtra a esa materia.
 *       - in: query
 *         name: sede
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por sede
 *       - in: query
 *         name: periodo
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por período
 *       - in: query
 *         name: programa
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por programa académico
 *       - in: query
 *         name: semestre
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por semestre
 *       - in: query
 *         name: grupo
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por grupo
 *     responses:
 *       200:
 *         description: Métricas por aspecto
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Cuando se especifica docente
 *                   properties:
 *                     docente:
 *                       type: string
 *                       example: "79864589"
 *                     codigo_materia:
 *                       type: string
 *                       nullable: true
 *                       example: "6655"
 *                     suma_total:
 *                       type: number
 *                       example: 11.5
 *                     total_respuestas:
 *                       type: integer
 *                       example: 8
 *                     promedio:
 *                       type: number
 *                       nullable: true
 *                       example: 1.4375
 *                     desviacion:
 *                       type: number
 *                       nullable: true
 *                       example: 0.726
 *                     aspectos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           aspecto_id:
 *                             type: integer
 *                           nombre:
 *                             type: string
 *                           total_respuestas:
 *                             type: integer
 *                           suma:
 *                             type: number
 *                 - type: object
 *                   description: Cuando NO se especifica docente (agregado de todos)
 *                   properties:
 *                     docente:
 *                       type: array
 *                       description: Array de IDs de docentes incluidos en la agregación
 *                       items:
 *                         type: string
 *                       example: ["79864589", "1124865039", "18125603"]
 *                     suma_total:
 *                       type: number
 *                       example: 23
 *                     total_respuestas:
 *                       type: integer
 *                       example: 16
 *                     promedio:
 *                       type: number
 *                       nullable: true
 *                       example: 2.875
 *                     desviacion:
 *                       type: number
 *                       nullable: true
 *                       example: 1.611
 *                     aspectos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           aspecto_id:
 *                             type: integer
 *                           nombre:
 *                             type: string
 *                           total_respuestas:
 *                             type: integer
 *                             description: Total agregado
 *                           suma:
 *                             type: number
 *                             description: Suma agregada
 *       400:
 *         description: Parámetros requeridos faltantes o inválidos
 *       404:
 *         description: No hay evaluaciones para los parámetros especificados
 */
/**
 * @swagger
 * /metric/evaluations/docente/{docente}/comments/analysis:
 *   get:
 *     summary: Analiza comentarios con IA por materia y actualiza conclusiones en la BD
 *     description: |
 *       Obtiene comentarios para cada materia del docente, los analiza con IA usando Ollama, 
 *       y actualiza conclusion_gen, fortalezas, debilidades en eval y conclusion en eval_det.
 *       
 *       Si se especifica codigo_materia, solo analiza esa materia.
 *       Si no, analiza TODAS las materias por SEPARADO (sin mezclar comentarios entre ellas).
 *     tags: [Metric]
 *     parameters:
 *       - in: path
 *         name: docente
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: codigo_materia
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 docente:
 *                   type: string
 *                 total_respuestas:
 *                   type: integer
 *                 analisis:
 *                   type: object
 *                   properties:
 *                     conclusion_general:
 *                       type: string
 *                     aspectos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           aspecto:
 *                             type: string
 *                           conclusion:
 *                             type: string
 *                     fortalezas:
 *                       type: array
 *                       items:
 *                         type: string
 *                     debilidades:
 *                       type: array
 *                       items:
 *                         type: string
 */
/**
 * @swagger
 * /metric/evaluations/docente/{docente}/materias:
 *   get:
 *     summary: Per-materia metrics for a docente
 *     description: Retorna métricas por materia del docente. Si se proporciona codigo_materia, filtra solo esa materia. Si no, retorna todas las materias.
 *     tags: [Metric]
 *     parameters:
 *       - in: path
 *         name: docente
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: codigo_materia
 *         required: false
 *         schema:
 *           type: string
 *         description: Código de la materia (opcional). Si se proporciona, filtra solo esa materia.
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Per-subject metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 docente:
 *                   type: string
 *                 materias:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       codigo_materia:
 *                         type: string
 *                       nombre_materia:
 *                         type: string
 *                       total_evaluaciones:
 *                         type: integer
 *                       total_realizadas:
 *                         type: integer
 *                       total_pendientes:
 *                         type: integer
 *                       suma:
 *                         type: number
 */

/**
 * @swagger
 * /metric/evaluations/docente/{docente}/materias/{codigo_materia}/completion:
 *   get:
 *     summary: Students who completed vs pending for a specific subject
 *     tags: [Metric]
 *     parameters:
 *       - in: path
 *         name: docente
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: codigo_materia
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Completion lists with student names grouped by GRUPO
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 docente:
 *                   type: string
 *                   example: "79579499"
 *                 codigo_materia:
 *                   type: string
 *                   example: "6665"
 *                 grupos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       grupo:
 *                         type: string
 *                         example: "A"
 *                       completados:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             nombre:
 *                               type: string
 *                       pendientes:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             nombre:
 *                               type: string
 */
/**
 * @swagger
 * tags:
 *   name: Metric
 *   description: Real-time evaluation metrics
 */

/**
 * @swagger
 * /metric/evaluations/summary:
 *   get:
 *     summary: Summary metrics for evaluations
 *     tags: [Metric]
 *     parameters:
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *         description: Configuration ID (e.g., 1)
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Summary metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generales:
 *                   type: object
 *                   properties:
 *                     total_evaluaciones:
 *                       type: integer
 *                     total_realizadas:
 *                       type: integer
 *                     total_evaluaciones_registradas:
 *                       type: integer
 *                       description: Total evaluations registered in local (cfg_t)
 *                     total_pendientes:
 *                       type: integer
 *                     total_estudiantes:
 *                       type: integer
 *                     total_estudiantes_registrados:
 *                       type: integer
 *                       description: Unique students who loaded courses (from local eval)
 *                     total_estudiantes_pendientes:
 *                       type: integer
 *                     total_docentes:
 *                       type: integer
 *                     total_docentes_pendientes:
 *                       type: integer
 *       400:
 *         description: Invalid parameters
 */

/**
 * @swagger
 * /metric/evaluations/summary/programas:
 *   get:
 *     summary: Summary metrics grouped by program and group
 *     description: |
 *       Retorna métricas agregadas por programa académico y sus grupos, usando la lógica de resumen general.
 *       
 *       **Comportamiento con filtro de programa:**
 *       - Si se especifica `programa`, solo se mostrarán programas que compartan al menos un semestre con el programa seleccionado.
 *       - El programa seleccionado tendrá el campo `selected: true`.
 *       - Los demás programas no tendrán el campo `selected` (el frontend puede tratarlo como `false`).
 *     tags: [Metric]
 *     parameters:
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la configuración de evaluación
 *       - in: query
 *         name: sede
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por sede
 *       - in: query
 *         name: periodo
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por período
 *       - in: query
 *         name: programa
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por programa académico. Si se especifica, solo muestra programas que compartan al menos un semestre.
 *       - in: query
 *         name: semestre
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por semestre
 *       - in: query
 *         name: grupo
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por grupo
 *     responses:
 *       200:
 *         description: Métricas por programa y grupo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 programas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       nombre:
 *                         type: string
 *                         example: "Ingeniería de Sistemas"
 *                       selected:
 *                         type: boolean
 *                         description: Solo presente cuando se especifica el parámetro programa y este programa coincide
 *                         example: true
 *                       metricas:
 *                         type: object
 *                         properties:
 *                           total_evaluaciones:
 *                             type: integer
 *                           total_evaluaciones_registradas:
 *                             type: integer
 *                           total_realizadas:
 *                             type: integer
 *                           total_pendientes:
 *                             type: integer
 *                           total_estudiantes:
 *                             type: integer
 *                           total_estudiantes_registrados:
 *                             type: integer
 *                           total_estudiantes_pendientes:
 *                             type: integer
 *                           total_docentes:
 *                             type: integer
 *                           total_docentes_pendientes:
 *                             type: integer
 *                       grupos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             grupo:
 *                               type: string
 *                             metricas:
 *                               type: object
 *                               properties:
 *                                 total_evaluaciones:
 *                                   type: integer
 *                                 total_evaluaciones_registradas:
 *                                   type: integer
 *                                 total_realizadas:
 *                                   type: integer
 *                                 total_pendientes:
 *                                   type: integer
 *                                 total_estudiantes:
 *                                   type: integer
 *                                 total_estudiantes_registrados:
 *                                   type: integer
 *                                 total_estudiantes_pendientes:
 *                                   type: integer
 *                                 total_docentes:
 *                                   type: integer
 *                                 total_docentes_pendientes:
 *                                   type: integer
 *       400:
 *         description: Invalid parameters
 */

/**
 * @swagger
 * /metric/evaluations/ranking:
 *   get:
 *     summary: Ranking robusto de docentes (Bayes + participación + confianza)
 *     description: |
 *       Retorna ranking de docentes con score único `score_rank`.
 *       Incluye docentes con respuestas en el ranking principal y también docentes sin respuestas (en cero) al final.
 *
 *       **Fórmulas principales:**
 *       - promedio_docente = SUM(puntajes) / total_respuestas
 *       - adjusted = (v/(v+m))*promedio_docente + (m/(v+m))*global_avg, donde v = total_respuestas
 *       - score_rank = adjusted * factor_participacion * factor_confianza
 *       - factor_confianza = min(1, total_respuestas / m)
 *     tags: [Metric]
 *     parameters:
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ranking list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ranking:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       docente:
 *                         type: string
 *                       nombre_docente:
 *                         type: string
 *                         nullable: true
 *                       score_rank:
 *                         type: number
 *                       promedio_docente:
 *                         type: number
 *                       promedio_evaluacion:
 *                         type: number
 *                       adjusted:
 *                         type: number
 *                       total_respuestas:
 *                         type: integer
 *                       participacion:
 *                         type: number
 *                       respuestas_unicas:
 *                         type: integer
 *                       universo:
 *                         type: integer
 *                       desviacion_estandar:
 *                         type: number
 *                         nullable: true
 *                       comentarios:
 *                         type: object
 *                         properties:
 *                           cmt_gen:
 *                             type: integer
 *                           cmt:
 *                             type: integer
 *                           total:
 *                             type: integer
 *                       factores:
 *                         type: object
 *                         properties:
 *                           v:
 *                             type: integer
 *                           m:
 *                             type: number
 *                           global_avg:
 *                             type: number
 *                           participacion_promedio:
 *                             type: number
 *                           factor_participacion:
 *                             type: number
 *                           factor_confianza:
 *                             type: number
 *                       calculo:
 *                         type: object
 *                         properties:
 *                           promedio_docente:
 *                             type: object
 *                             properties:
 *                               suma_puntajes:
 *                                 type: number
 *                               total_respuestas:
 *                                 type: integer
 *                               formula:
 *                                 type: string
 *                           adjusted:
 *                             type: object
 *                             properties:
 *                               formula:
 *                                 type: string
 *                           score_rank:
 *                             type: object
 *                             properties:
 *                               formula:
 *                                 type: string
 *                       sin_respuestas:
 *                         type: boolean
 *                         description: Presente y true cuando el docente no tiene respuestas y se envía en bloque final con score 0.
 *                 meta:
 *                   type: object
 *                   properties:
 *                     m:
 *                       type: number
 *                     global_avg:
 *                       type: number
 *                     participacion_promedio:
 *                       type: number
 *                     total_docentes:
 *                       type: integer
 *                     docentes_con_respuestas:
 *                       type: integer
 *                     docentes_sin_respuestas:
 *                       type: integer
 */

/**
 * @swagger
 * /metric/evaluations/docentes:
 *   get:
 *     summary: Métricas generales del docente con soporte para paginación, búsqueda y ordenamiento
 *     description: |
 *       Retorna métricas para uno o todos los docentes.
 *       - Si se proporciona docente, retorna métricas para ese docente específico.
 *       - Si no, retorna lista paginada de todos los docentes con sus métricas.
 *       
 *       **Búsqueda y ordenamiento (solo cuando NO se especifica docente):**
 *       - `search`: Busca por nombre del docente (mínimo 2 caracteres)
 *       - `sortBy`: Ordena por promedio_general, total_evaluaciones, porcentaje_cumplimiento o nombre_docente
 *       - `sortOrder`: Orden ascendente (asc) o descendente (desc, por defecto)
 *     tags: [Metric]
 *     parameters:
 *       - in: query
 *         name: docente
 *         schema:
 *           type: string
 *         description: ID/código del docente (opcional). Si se omite, retorna todos con paginación.
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la configuración de evaluación
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página (solo cuando docente no está especificado)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de registros por página (solo cuando docente no está especificado)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda para filtrar por nombre del docente (mínimo 2 caracteres). Solo aplica cuando no se especifica docente.
 *         example: "Juan"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [promedio_general, total_evaluaciones, porcentaje_cumplimiento, nombre_docente]
 *         description: Campo por el cual ordenar los resultados. Solo aplica cuando no se especifica docente.
 *         example: "promedio_general"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación (ascendente o descendente). Solo aplica cuando no se especifica docente.
 *         example: "desc"
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *         description: Filtrar por sede
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *         description: Filtrar por período
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *         description: Filtrar por programa académico
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *         description: Filtrar por semestre
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *         description: Filtrar por grupo
 *     responses:
 *       200:
 *         description: Métricas del docente o lista paginada de docentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       description: Cuando se especifica docente (respuesta simple)
 *                       properties:
 *                         docente:
 *                           type: string
 *                         nombre_docente:
 *                           type: string
 *                         total_evaluaciones:
 *                           type: integer
 *                         total_realizadas:
 *                           type: integer
 *                         total_pendientes:
 *                           type: integer
 *                         total_evaluaciones_registradas:
 *                           type: integer
 *                         total_estudiantes_registrados:
 *                           type: integer
 *                         porcentaje_cumplimiento:
 *                           type: number
 *                         eval:
 *                           type: object
 *                           properties:
 *                             total_respuestas:
 *                               type: integer
 *                               nullable: true
 *                             total_cmt:
 *                               type: integer
 *                               nullable: true
 *                             total_cmt_gen:
 *                               type: integer
 *                               nullable: true
 *                             suma_cmt:
 *                               type: integer
 *                               nullable: true
 *                             nota_final_ponderada:
 *                               type: number
 *                               nullable: true
 *                     - type: object
 *                       description: Cuando no se especifica docente (respuesta paginada)
 *                       properties:
 *                         data:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               docente:
 *                                 type: string
 *                               nombre_docente:
 *                                 type: string
 *                               total_evaluaciones:
 *                                 type: integer
 *                               total_realizadas:
 *                                 type: integer
 *                               total_pendientes:
 *                                 type: integer
 *                               total_evaluaciones_registradas:
 *                                 type: integer
 *                               total_estudiantes_registrados:
 *                                 type: integer
 *                               porcentaje_cumplimiento:
 *                                 type: number
 *                               eval:
 *                                 type: object
 *                                 properties:
 *                                   total_respuestas:
 *                                     type: integer
 *                                     nullable: true
 *                                   total_cmt:
 *                                     type: integer
 *                                     nullable: true
 *                                   total_cmt_gen:
 *                                     type: integer
 *                                     nullable: true
 *                                   suma_cmt:
 *                                     type: integer
 *                                     nullable: true
 *                                   nota_final_ponderada:
 *                                     type: number
 *                                     nullable: true
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                               example: 1
 *                             limit:
 *                               type: integer
 *                               example: 10
 *                             total:
 *                               type: integer
 *                               example: 42
 *                             pages:
 *                               type: integer
 *                               example: 5
 *             examples:
 *               sinDocente:
 *                 summary: Respuesta paginada sin parámetro docente
 *                 value:
 *                   success: true
 *                   message: Estadísticas del dashboard obtenidas con éxito
 *                   data:
 *                     data:
 *                       - docente: "DOC-0001"
 *                         nombre_docente: "MARIA FERNANDA RUIZ"
 *                         total_evaluaciones: 120
 *                         total_realizadas: 34
 *                         total_pendientes: 86
 *                         total_evaluaciones_registradas: 34
 *                         total_estudiantes_registrados: 34
 *                         porcentaje_cumplimiento: 28.33
 *                         eval:
 *                           total_respuestas: 136
 *                           total_cmt: 12
 *                           total_cmt_gen: 3
 *                           suma_cmt: 15
 *                           nota_final_ponderada: 4.12
 *                       - docente: "DOC-0002"
 *                         nombre_docente: "CARLOS ANDRES PEREZ"
 *                         total_evaluaciones: 80
 *                         total_realizadas: 0
 *                         total_pendientes: 80
 *                         total_evaluaciones_registradas: 0
 *                         total_estudiantes_registrados: 0
 *                         porcentaje_cumplimiento: 0
 *                         eval:
 *                           total_respuestas: null
 *                           total_cmt: null
 *                           total_cmt_gen: null
 *                           suma_cmt: null
 *                           nota_final_ponderada: null
 *                     pagination:
 *                       page: 1
 *                       limit: 10
 *                       total: 42
 *                       pages: 5
 *               conDocente:
 *                 summary: Respuesta para un docente específico
 *                 value:
 *                   success: true
 *                   message: Estadísticas del dashboard obtenidas con éxito
 *                   data:
 *                     docente: "DOC-0001"
 *                     nombre_docente: "MARIA FERNANDA RUIZ"
 *                     total_evaluaciones: 120
 *                     total_realizadas: 34
 *                     total_pendientes: 86
 *                     total_evaluaciones_registradas: 34
 *                     total_estudiantes_registrados: 34
 *                     porcentaje_cumplimiento: 28.33
 *                     eval:
 *                       total_respuestas: 136
 *                       total_cmt: 12
 *                       total_cmt_gen: 3
 *                       suma_cmt: 15
 *                       nota_final_ponderada: 4.12
 */
