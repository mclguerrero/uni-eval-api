/**
 * @swagger
 * tags:
 *   - name: Rol
 *     description: Gestión de roles locales y remotos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RolMixto:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Admin"
 *         tipo_participacion:
 *           type: string
 *           enum: [LOCAL, REMOTO]
 *           example: LOCAL
 */

/**
 * @swagger
 * /rol/mix:
 *   get:
 *     summary: Obtener roles locales y remotos (únicos)
 *     tags: [Rol]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista combinada de roles locales y remotos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RolMixto'
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: Usuario sin permisos
 */
