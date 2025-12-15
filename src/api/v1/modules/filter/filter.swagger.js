/**
 * @swagger
 * tags:
 *   name: Filter
 *   description: Endpoints para obtener valores únicos de filtros desde vista_academica_insitus
 */

/**
 * @swagger
 * /filter:
 *   get:
 *     tags: [Filter]
 *     summary: Obtiene todos los valores únicos para filtros
 *     description: Retorna sede, periodo, programa, semestre y grupo únicos desde vista_academica_insitus
 *     responses:
 *       200:
 *         description: Filtros obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Filtros obtenidos correctamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     sedes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [ "SEDE A", "SEDE B", "SEDE C" ]
 *                     periodos:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [ "2024", "2023", "2022" ]
 *                     programas:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [ "Ingeniería de Sistemas", "Medicina", "Derecho" ]
 *                     semestres:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [ "1", "2", "3", "4", "5", "6", "7", "8", "9", "10" ]
 *                     grupos:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [ "A", "B", "C", "D" ]
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Error al obtener filtros
 */

/**
 * @swagger
 * /filter/sedes:
 *   get:
 *     tags: [Filter]
 *     summary: Obtiene valores únicos de sede
 *     description: Retorna todas las sedes únicas desde vista_academica_insitus
 *     responses:
 *       200:
 *         description: Sedes obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Sedes obtenidas correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [ "SEDE A", "SEDE B", "SEDE C" ]
 */

/**
 * @swagger
 * /filter/periodos:
 *   get:
 *     tags: [Filter]
 *     summary: Obtiene valores únicos de periodo
 *     description: Retorna todos los periodos únicos desde vista_academica_insitus (ordenados descendentemente). Se puede filtrar por sede.
 *     parameters:
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar periodos por sede
 *         example: SEDE A
 *     responses:
 *       200:
 *         description: Periodos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Periodos obtenidos correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [ "2024", "2023", "2022" ]
 */

/**
 * @swagger
 * /filter/programas:
 *   get:
 *     tags: [Filter]
 *     summary: Obtiene valores únicos de programa
 *     description: Retorna todos los programas únicos desde vista_academica_insitus. Se puede filtrar por sede y periodo.
 *     parameters:
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar programas por sede
 *         example: SEDE A
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar programas por periodo
 *         example: "2024"
 *     responses:
 *       200:
 *         description: Programas obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Programas obtenidos correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [ "Ingeniería de Sistemas", "Medicina", "Derecho" ]
 */

/**
 * @swagger
 * /filter/semestres:
 *   get:
 *     tags: [Filter]
 *     summary: Obtiene valores únicos de semestre
 *     description: Retorna todos los semestres únicos desde vista_academica_insitus. Se puede filtrar por sede, periodo y programa.
 *     parameters:
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar semestres por sede
 *         example: SEDE A
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar semestres por periodo
 *         example: "2024"
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar semestres por programa
 *         example: Ingeniería de Sistemas
 *     responses:
 *       200:
 *         description: Semestres obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Semestres obtenidos correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [ "1", "2", "3", "4", "5", "6", "7", "8", "9", "10" ]
 */

/**
 * @swagger
 * /filter/grupos:
 *   get:
 *     tags: [Filter]
 *     summary: Obtiene valores únicos de grupo
 *     description: Retorna todos los grupos únicos desde vista_academica_insitus. Se puede filtrar por sede, periodo, programa y semestre.
 *     parameters:
 *       - in: query
 *         name: sede
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar grupos por sede
 *         example: SEDE A
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar grupos por periodo
 *         example: "2024"
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar grupos por programa
 *         example: Ingeniería de Sistemas
 *       - in: query
 *         name: semestre
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtrar grupos por semestre
 *         example: "1"
 *     responses:
 *       200:
 *         description: Grupos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Grupos obtenidos correctamente
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [ "A", "B", "C", "D" ]
 */
