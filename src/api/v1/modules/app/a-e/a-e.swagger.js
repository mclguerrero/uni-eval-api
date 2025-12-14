/**
 * @swagger
 * tags:
 *   - name: AspectoEscala
 *     description: Endpoints para gestionar relaciones aspecto-escala
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EscalaInput:
 *       oneOf:
 *         - type: array
 *           items:
 *             type: integer
 *         - type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: [integer, null]
 *               es_cmt:
 *                 type: boolean
 *               es_cmt_oblig:
 *                 type: boolean
 *             required:
 *               - id
 *               - es_cmt
 *               - es_cmt_oblig
 *
 *     AspectoInput:
 *       oneOf:
 *         - type: array
 *           items:
 *             type: integer
 *         - type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               es_cmt:
 *                 type: boolean
 *               es_cmt_oblig:
 *                 type: boolean
 *             required:
 *               - id
 *               - es_cmt
 *               - es_cmt_oblig
 *
 *     AspectoEscalaItem:
 *       type: object
 *       properties:
 *         escalas:
 *           $ref: '#/components/schemas/EscalaInput'
 *         aspectos:
 *           $ref: '#/components/schemas/AspectoInput'
 *         es_pregunta_abierta:
 *           type: boolean
 *       required:
 *         - escalas
 *         - aspectos
 *         - es_pregunta_abierta
 *
 *     AspectoEscalaBulkInput:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AspectoEscalaItem'
 *       required:
 *         - items
 *
 *     AspectoEscalaBulkResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Relaciones procesadas exitosamente
 */

/**
 * @swagger
 * /a/e/bulk:
 *   post:
 *     summary: Bulk insert relaciones aspecto-escala (a_e)
 *     tags: [AspectoEscala]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AspectoEscalaBulkInput'
 *           examples:
 *             default:
 *               value:
 *                 items:
 *                   - escalas: [1, 2, 3, 4]
 *                     aspectos:
 *                       - id: 1
 *                         es_cmt: true
 *                         es_cmt_oblig: false
 *                       - id: 2
 *                         es_cmt: true
 *                         es_cmt_oblig: false
 *                       - id: 3
 *                         es_cmt: true
 *                         es_cmt_oblig: true
 *                       - id: 4
 *                         es_cmt: true
 *                         es_cmt_oblig: true
 *                       - id: 5
 *                         es_cmt: false
 *                         es_cmt_oblig: false
 *                       - id: 6
 *                         es_cmt: false
 *                         es_cmt_oblig: false
 *                       - id: 7
 *                         es_cmt: false
 *                         es_cmt_oblig: false
 *                     es_pregunta_abierta: false
 *                   - escalas:
 *                       - id: null
 *                         es_cmt: true
 *                         es_cmt_oblig: true
 *                     aspectos: [8]
 *                     es_pregunta_abierta: true
 *     responses:
 *       200:
 *         description: Bulk processed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AspectoEscalaBulkResponse'
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido
 *       404:
 *         description: No encontrado
 */