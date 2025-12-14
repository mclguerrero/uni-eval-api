/**
 * @swagger
 * tags:
 *   - name: Evaluación Gen
 *     description: Endpoints para generar evaluaciones o encuestas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EvalCreateInput:
 *       type: object
 *       required: [configId]
 *       properties:
 *         configId:
 *           type: integer
 *           description: Identificador de configuración (`cfg_t.id`).
 *           example: 12
 *
 *     EvalItem:
 *       type: object
 *       description: Registro mínimo creado en `eval`
 *       properties:
 *         id_configuracion:
 *           type: integer
 *           example: 12
 *         estudiante:
 *           type: string
 *           example: "1006948527"
 *         docente:
 *           type: string
 *           nullable: true
 *           example: "98381067"
 *         codigo_materia:
 *           type: string
 *           nullable: true
 *           example: "6652"
 *         cmt_gen:
 *           type: string
 *           nullable: true
 *           example: null
 *
 *     EvalCreateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Evaluaciones generadas exitosamente
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EvalItem'
 */

/**
 * @swagger
 * /eval/generar:
 *   post:
 *     summary: Genera evaluaciones/encuestas por configuración (cfg_t.id)
 *     tags: [Evaluación Gen]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EvalCreateInput'
 *     responses:
 *       200:
 *         description: Evaluaciones creadas correctamente. Si es evaluación, crea una por materia del estudiante autenticado. Si no es evaluación, crea una por persona.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvalCreateResponse'
 *       400:
 *         description: Solicitud inválida (por ejemplo, tipo incorrecto)
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido
 *       404:
 *         description: No encontrado
 */
