/**
 * @swagger
 * tags:
 *   - name: Configuración Tipo
 *     description: Endpoints para obtener información relacionada a configuraciones tipo
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AERelacion:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         es_cmt:
 *           type: boolean
 *         es_cmt_oblig:
 *           type: boolean
 *         aspecto:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             nombre:
 *               type: string
 *             descripcion:
 *               type: string
 *               nullable: true
 *         escala:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             sigla:
 *               type: string
 *             nombre:
 *               type: string
 *             descripcion:
 *               type: string
 *               nullable: true
 *
 *     AEResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Listado obtenido correctamente
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AERelacion'
 */

/**
 * @swagger
 * /cfg/t/{id}/a-e:
 *   get:
 *     summary: Obtiene aspectos y escalas relacionados vía a_e
 *     tags: [Configuración Tipo]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de cfg_t
 *     responses:
 *       200:
 *         description: Listado de relaciones a_e
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AEResponse'
 *       400:
 *         description: Solicitud inválida
 *       404:
 *         description: No encontrado
 */
