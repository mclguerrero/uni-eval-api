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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 inserted:
 *                   type: integer
 *                   example: 28
 *                 message:
 *                   type: string
 *                   example: "Bulk a_e processed"
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido
 *       404:
 *         description: No encontrado
 */

/**
 * @swagger
 * /a/e/:aspectoId:
 *   delete:
 *     summary: Delete an aspecto with all its escalas (scoped by cfg_t)
 *     tags: [AspectoEscala]
 *     parameters:
 *       - in: path
 *         name: aspectoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID (cfg_a.id) of the aspecto configuration to delete
 *       - in: query
 *         name: cfgTId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Configuration ID (cfg_t_id) to scope the delete - aspecto must belong to this configuration
 *     responses:
 *       200:
 *         description: Aspecto deleted successfully with all its escalas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 deleted:
 *                   type: integer
 *                   example: 4
 *                 message:
 *                   type: string
 *                   example: "Aspecto 2 and all its escalas deleted successfully in configuration 1"
 *       400:
 *         description: Invalid request - aspectoId and cfgTId are required
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido
 *       404:
 *         description: No encontrado
 */

/**
 * @swagger
 * /a/e/update:
 *   put:
 *     summary: Update aspecto_id in all escalas for a specific configuration (preserves all escala associations)
 *     tags: [AspectoEscala]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldAspectoId:
 *                 type: integer
 *                 description: Current cfg_a.id (aspecto in a_e table) to update from
 *               newAspectoId:
 *                 type: integer
 *                 description: New cfg_a.id (aspecto in a_e table) to update to
 *               cfgTId:
 *                 type: integer
 *                 description: Configuration ID (cfg_t_id) to scope the update - both aspectos must belong to this configuration
 *             required:
 *               - oldAspectoId
 *               - newAspectoId
 *               - cfgTId
 *           examples:
 *             default:
 *               value:
 *                 oldAspectoId: 2
 *                 newAspectoId: 21
 *                 cfgTId: 1
 *     responses:
 *       200:
 *         description: Aspecto ID updated successfully in all escalas for the specified configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 updated:
 *                   type: integer
 *                   example: 4
 *                 message:
 *                   type: string
 *                   example: "Aspecto updated from 2 to 21 in configuration 1"
 *       400:
 *         description: Invalid request - oldAspectoId, newAspectoId and cfgTId are required, or aspectos don't belong to the specified configuration
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Prohibido
 *       404:
 *         description: No encontrado
 */