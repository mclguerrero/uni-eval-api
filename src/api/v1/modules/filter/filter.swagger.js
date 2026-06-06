/**
 * @swagger
 * tags:
 *   name: Filter
 *   description: Filtros en cascada desde vista_academica_insitus (periodo → sede → facultad → programa → semestre → grupo)
 */

/**
 * @swagger
 * /filter:
 *   get:
 *     tags: [Filter]
 *     summary: Todos los filtros sin restricción
 *     description: Retorna todos los valores únicos de cada dimensión sin aplicar ningún filtro.
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     periodos:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["2024-2", "2024-1"]
 *                     sedes:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["SEDE PRINCIPAL", "SEDE NORTE"]
 *                     facultades:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["FACULTAD DE INGENIERÍA", "FACULTAD DE MEDICINA"]
 *                     programas:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["INGENIERÍA DE SISTEMAS", "MEDICINA"]
 *                     semestres:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["PRIMER SEMESTRE", "SEGUNDO SEMESTRE"]
 *                     grupos:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["A", "B", "C"]
 */

/**
 * @swagger
 * /filter/periodos:
 *   get:
 *     tags: [Filter]
 *     summary: Paso 1 — Periodos disponibles
 *     description: Sin dependencias. Retorna todos los periodos únicos ordenados descendentemente.
 *     responses:
 *       200:
 *         description: Periodos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["2024-2", "2024-1", "2023-2"]
 */

/**
 * @swagger
 * /filter/sedes:
 *   get:
 *     tags: [Filter]
 *     summary: Paso 2 — Sedes filtradas por periodo
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema: { type: string }
 *         description: "Ej: 2024-2"
 *     responses:
 *       200:
 *         description: Sedes obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["SEDE PRINCIPAL", "SEDE NORTE"]
 */

/**
 * @swagger
 * /filter/facultades:
 *   get:
 *     tags: [Filter]
 *     summary: Paso 3 — Facultades filtradas por periodo y sede
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema: { type: string }
 *         description: "Ej: 2024-2"
 *       - in: query
 *         name: sede
 *         schema: { type: string }
 *         description: "Ej: SEDE PRINCIPAL"
 *     responses:
 *       200:
 *         description: Facultades obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["FACULTAD DE INGENIERÍA", "FACULTAD DE MEDICINA"]
 */

/**
 * @swagger
 * /filter/programas:
 *   get:
 *     tags: [Filter]
 *     summary: Paso 4 — Programas filtrados por periodo, sede y facultad
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema: { type: string }
 *       - in: query
 *         name: sede
 *         schema: { type: string }
 *       - in: query
 *         name: facultad
 *         schema: { type: string }
 *         description: "Ej: FACULTAD DE INGENIERÍA"
 *     responses:
 *       200:
 *         description: Programas obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["INGENIERÍA DE SISTEMAS", "INGENIERÍA CIVIL"]
 */

/**
 * @swagger
 * /filter/semestres:
 *   get:
 *     tags: [Filter]
 *     summary: Paso 5 — Semestres filtrados por periodo, sede, facultad y programa
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema: { type: string }
 *       - in: query
 *         name: sede
 *         schema: { type: string }
 *       - in: query
 *         name: facultad
 *         schema: { type: string }
 *       - in: query
 *         name: programa
 *         schema: { type: string }
 *         description: "Ej: INGENIERÍA DE SISTEMAS"
 *     responses:
 *       200:
 *         description: Semestres obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["PRIMER SEMESTRE", "SEGUNDO SEMESTRE", "TERCER SEMESTRE"]
 */

/**
 * @swagger
 * /filter/grupos:
 *   get:
 *     tags: [Filter]
 *     summary: Paso 6 — Grupos filtrados por periodo, sede, facultad, programa y semestre
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema: { type: string }
 *       - in: query
 *         name: sede
 *         schema: { type: string }
 *       - in: query
 *         name: facultad
 *         schema: { type: string }
 *       - in: query
 *         name: programa
 *         schema: { type: string }
 *       - in: query
 *         name: semestre
 *         schema: { type: string }
 *         description: "Ej: PRIMER SEMESTRE"
 *     responses:
 *       200:
 *         description: Grupos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { type: string }
 *                   example: ["A", "B", "C"]
 */
