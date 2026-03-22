/**
 * @swagger
 * /metric/autoevaluacion/summary:
 *   get:
 *     summary: Resumen de métricas para tipo_form autoevaluación (3)
 *     description: Retorna métricas agregadas de autoevaluaciones realizadas por usuarios (se evalúan a sí mismos).
 *     tags: [Metric]
 *     parameters:
 *       - in: query
 *         name: cfg_t
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la configuración de autoevaluación
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
 *                       example: 3
 *                     total_evaluaciones_registradas:
 *                       type: integer
 *                     total_realizadas:
 *                       type: integer
 *                     total_pendientes:
 *                       type: integer
 *                     total_usuarios:
 *                       type: integer
 *                     total_respuestas:
 *                       type: integer
 *                     suma_total:
 *                       type: number
 *                     promedio_general:
 *                       type: number
 *                       nullable: true
 *       400:
 *         description: Parámetros requeridos faltantes o inválidos
 */

/**
 * @swagger
 * /metric/autoevaluacion/ranking:
 *   get:
 *     summary: Ranking de usuarios por promedio en autoevaluaciones
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
 *         description: Ranking ordenado por promedio descendente
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
 *                       posicion:
 *                         type: integer
 *                       usuario:
 *                         type: string
 *                       promedio_general:
 *                         type: number
 *                       total_realizadas:
 *                         type: integer
 *                       porcentaje_cumplimiento:
 *                         type: number
 */

/**
 * @swagger
 * /metric/autoevaluacion/usuarios:
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
 * /metric/autoevaluacion/aspectos:
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
