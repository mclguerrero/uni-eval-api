/**
 * @swagger
 * tags:
 *   - name: User
 *     description: Endpoints para consultar materias de estudiantes y docentes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MateriaDocente:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         codigo:
 *           type: integer
 *           example: 6213
 *         nombre:
 *           type: string
 *           example: "RESISTENCIA DE MATERIALES"
 *         docente:
 *           type: object
 *           properties:
 *             documento:
 *               type: string
 *               example: "1061788988"
 *             nombre:
 *               type: string
 *               example: "MANUEL ESTEBAN CHAMORRO NARVAEZ"
 *     MateriaEstudiante:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         codigo:
 *           type: integer
 *           example: 6213
 *         nombre:
 *           type: string
 *           example: "RESISTENCIA DE MATERIALES"
 *         estudiante:
 *           type: object
 *           properties:
 *             documento:
 *               type: string
 *               example: "1120063452"
 *             nombre:
 *               type: string
 *               example: "BRAYAN ANDRES LOPEZ RAMIREZ"
 *         programa:
 *           type: string
 *           example: "TECNOLOGIA EN OBRAS CIVILES"
 *         periodo:
 *           type: string
 *           example: "2025-1"
 *         grupo:
 *           type: string
 *           example: "B"
 *     Estudiante:
 *       type: object
 *       properties:
 *         sede:
 *           type: string
 *           example: "ITP-MOCOA"
 *         facultad:
 *           type: string
 *           example: "FACULTAD DE INGENIERIAS"
 *         nombre_completo:
 *           type: string
 *           example: "BRAYAN ANDRES LOPEZ RAMIREZ"
 *         documento:
 *           type: string
 *           example: "1120063452"
 *         programa:
 *           type: string
 *           example: "TECNOLOGIA EN OBRAS CIVILES"
 *         periodo:
 *           type: string
 *           example: "2025-1"
 *         semestre:
 *           type: string
 *           example: "CUARTO SEMESTRE"
 *         n_semestre:
 *           type: string
 *           example: "4"
 *         grupo:
 *           type: string
 *           example: "B"
 *         materias:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MateriaDocente'
 *     Docente:
 *       type: object
 *       properties:
 *         documento:
 *           type: string
 *           example: "1061788988"
 *         nombre:
 *           type: string
 *           example: "MANUEL ESTEBAN CHAMORRO NARVAEZ"
 *         materias:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MateriaEstudiante'
 *     MateriasAutenticado:
 *       description: Resultado de materias del usuario autenticado según su rol (estudiante o docente)
 *       oneOf:
 *         - $ref: '#/components/schemas/Estudiante'
 *         - $ref: '#/components/schemas/Docente'
 */

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Obtener materias del usuario autenticado (estudiante o docente)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Materias del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MateriasAutenticado'
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol de usuario no autorizado para consulta de materias
 *       404:
 *         description: No se encontraron materias
 */
