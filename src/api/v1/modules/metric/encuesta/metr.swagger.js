/**
 * @swagger
 * /metric/encuesta/summary:
 *   get:
 *     summary: Resumen de métricas para tipo_form encuesta (2)
 *     description: Retorna métricas agregadas de encuestas realizadas por usuarios (estudiantes/docentes).
 *     tags: [Metric]
 *     parameters:
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la configuración de encuesta
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *         description: Filtro dinámico por sede
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *         description: Filtro dinámico por periodo
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *         description: Filtro dinámico por programa
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *         description: Filtro dinámico por semestre
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *         description: Filtro dinámico por grupo
 *       - in: query
 *         name: rol_mix
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: true
 *         description: Filtro dinámico por roles mixtos (multi-selección). Ejemplo rol_mix=1&rol_mix=2
 *     responses:
 *       200:
 *         description: Resumen de métricas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generales:
 *                   type: object
 *                   properties:
 *                     tipo_form_id:
 *                       type: integer
 *                       example: 2
 *                     total_encuestas:
 *                       type: integer
 *                       description: Total de usuarios esperados según filtros dinámicos y rol_mix (1 encuesta por usuario)
 *                     total_realizadas:
 *                       type: integer
 *                     total_pendientes:
 *                       type: integer
 *       400:
 *         description: Parámetros requeridos faltantes o inválidos
 */

/**
 * @swagger
 * /metric/encuesta/summary/programas:
 *   get:
 *     summary: Resumen de encuestas por programa y grupo (tipo_form encuesta = 2)
 *     description: Retorna métricas de total_encuestas, total_realizadas y total_pendientes por programa, con desglose por grupo.
 *     tags: [Metric]
 *     parameters:
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la configuración de encuesta
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *         description: Filtro dinámico por sede
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *         description: Filtro dinámico por periodo
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *         description: Programa seleccionado (marca selected=true y aplica misma lógica de semestres usada en summary/programas)
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *         description: Filtro dinámico por semestre
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *         description: Filtro dinámico por grupo
 *       - in: query
 *         name: rol_mix
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: true
 *         description: Filtro dinámico por roles mixtos (multi-selección). Ejemplo rol_mix=1&rol_mix=2
 *     responses:
 *       200:
 *         description: Resumen por programa
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
 *                       selected:
 *                         type: boolean
 *                         description: Presente cuando coincide con el programa enviado por query
 *                       metricas:
 *                         type: object
 *                         properties:
 *                           total_encuestas:
 *                             type: integer
 *                           total_realizadas:
 *                             type: integer
 *                           total_pendientes:
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
 *                                 total_encuestas:
 *                                   type: integer
 *                                 total_realizadas:
 *                                   type: integer
 *                                 total_pendientes:
 *                                   type: integer
 *       400:
 *         description: Parámetros requeridos faltantes o inválidos
 */

/**
 * @swagger
 * /metric/encuesta/usuarios:
 *   get:
 *     summary: Métricas por usuario (paginated, searchable, sortable)
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
 *         description: Filtro dinámico por sede
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *         description: Filtro dinámico por periodo
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *         description: Filtro dinámico por programa
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *         description: Filtro dinámico por semestre
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *         description: Filtro dinámico por grupo
 *       - in: query
 *         name: rol_mix
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: true
 *         description: Filtro dinámico por roles mixtos (multi-selección). Ejemplo rol_mix=1&rol_mix=2
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por usuario (mínimo 2 caracteres)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [promedio_general, total_realizadas, porcentaje_cumplimiento, usuario]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios con métricas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       usuario:
 *                         type: string
 *                       total_evaluaciones_registradas:
 *                         type: integer
 *                       total_realizadas:
 *                         type: integer
 *                       total_pendientes:
 *                         type: integer
 *                       total_respuestas:
 *                         type: integer
 *                       suma_total:
 *                         type: number
 *                       promedio_general:
 *                         type: number
 *                       porcentaje_cumplimiento:
 *                         type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */

/**
 * @swagger
 * /metric/encuesta/aspectos:
 *   get:
 *     summary: Métricas desagregadas por aspecto
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
 *         description: Filtro dinámico por sede
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *         description: Filtro dinámico por periodo
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *         description: Filtro dinámico por programa
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *         description: Filtro dinámico por semestre
 *       - in: query
 *         name: grupo
 *         schema:
 *           type: string
 *         description: Filtro dinámico por grupo
 *       - in: query
 *         name: rol_mix
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: true
 *         description: Filtro dinámico por roles mixtos (multi-selección). Ejemplo rol_mix=1&rol_mix=2
 *     responses:
 *       200:
 *         description: Aspectos con estadísticas agregadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_respuestas:
 *                   type: integer
 *                 suma_total:
 *                   type: number
 *                 nota_general:
 *                   type: number
 *                   nullable: true
 *                 nota_final_encuesta:
 *                   type: number
 *                   nullable: true
 *                 aspectos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       aspecto_id:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                       total_respuestas:
 *                         type: integer
 *                       suma:
 *                         type: number
 *                       promedio:
 *                         type: number
 *                         nullable: true
 *                       comentarios:
 *                         type: integer
 */

/**
 * @swagger
 * /metric/encuesta/docentes:
 *   get:
 *     summary: Lista de docentes con totales y detalle por materias/grupos
 *     description: Retorna docente, nombre_docente, totales (evaluaciones/realizadas/pendientes) y arreglo de materias con grupos.
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
 *       - in: query
 *         name: rol_mix
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: true
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre_docente
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [total_evaluaciones, total_realizadas, total_pendientes, nombre_docente]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Lista paginada de docentes con materias y grupos
 */

/**
 * @swagger
 * /metric/encuesta/docente/{docente}/materias/{codigo_materia}/completion:
 *   get:
 *     summary: Alumnos que completaron o tienen pendiente la encuesta por materia
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
 *       - in: query
 *         name: rol_mix
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         style: form
 *         explode: true
 *     responses:
 *       200:
 *         description: Completados y pendientes por grupo
 */
