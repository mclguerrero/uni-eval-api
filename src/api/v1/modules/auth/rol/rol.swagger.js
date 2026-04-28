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
 *     RolMixLocal:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         rol_origen_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Admin"
 *         origen:
 *           type: string
 *           enum: [APP, AUTH]
 *           example: "APP"
 *     RolMixtoOnline:
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
 *           enum: [APP, AUTH]
 *           example: "APP"
 */

/**
 * @swagger
 * /rol/mix:
 *   get:
 *     summary: Obtener roles locales sincronizados
 *     tags: [Rol]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles de la tabla rol_mix sincronizada
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
 *                     $ref: '#/components/schemas/RolMixLocal'
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: Usuario sin permisos
 */

/**
 * @swagger
 * /rol/mix/online:
 *   get:
 *     summary: Obtener roles locales y remotos en tiempo real
 *     tags: [Rol]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista combinada de roles locales (APP) y remotos (AUTH)
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
 *                     $ref: '#/components/schemas/RolMixtoOnline'
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: Usuario sin permisos
 */
