/**
 * @swagger
 * tags:
 *   - name: Evaluación Detalle
 *     description: Endpoints para manejo de respuestas y comentarios de evaluaciones
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EvalDetBulkItem:
 *       type: object
 *       properties:
 *         a_e_id:
 *           type: integer
 *         cmt:
 *           type: string
 *           nullable: true
 *       required:
 *         - a_e_id
 *
 *     EvalDetBulkSaveRequest:
 *       type: object
 *       properties:
 *         eval_id:
 *           type: integer
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EvalDetBulkItem'
 *       required:
 *         - eval_id
 *         - items
 *
 *     EvalDetBulkSaveResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 */

/**
 * @swagger
 * /eval/det/bulk:
 *   post:
 *     tags: [Evaluación Detalle]
 *     summary: Guarda en bulk respuestas y comentarios
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EvalDetBulkSaveRequest'
 *     responses:
 *       201:
 *         description: Items creados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvalDetBulkSaveResponse'
 *       400:
 *         description: Validación fallida
 */
