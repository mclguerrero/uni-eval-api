/**
 * @swagger
 * tags:
 *   - name: User Rol
 *     description: Gestión de roles por usuario
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRolWithName:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 2191
 *         rol_id:
 *           type: integer
 *           example: 1
 *         rol_nombre:
 *           type: string
 *           example: "Administrador"
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *           example: "2026-02-01T16:26:08.000Z"
 *         fecha_actualizacion:
 *           type: string
 *           format: date-time
 *           example: "2026-02-01T16:26:08.000Z"
 *     DataLogin:
 *       type: object
 *       properties:
 *         user_name:
 *           type: string
 *           example: "Juan Pérez"
 *         user_username:
 *           type: string
 *           example: "jperez"
 *         user_email:
 *           type: string
 *           example: "jperez@example.com"
 *         user_idrole:
 *           type: integer
 *           example: 1
 *         user_statusid:
 *           type: string
 *           example: "1"
 *         role_name:
 *           type: string
 *           example: "Administrador"
 *     UserRolWithDataLogin:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: integer
 *           example: 2191
 *         rol_id:
 *           type: integer
 *           example: 1
 *         rol_nombre:
 *           type: string
 *           example: "Administrador"
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *           example: "2026-02-01T16:26:08.000Z"
 *         fecha_actualizacion:
 *           type: string
 *           format: date-time
 *           example: "2026-02-01T16:26:08.000Z"
 *         datalogin:
 *           $ref: '#/components/schemas/DataLogin'
 */

/**
 * @swagger
 * /user/rol/u:
 *   get:
 *     summary: Obtener roles de usuario con nombre de rol
 *     tags: [User Rol]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Campo por el cual ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden ascendente o descendente
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda (busca en rol_nombre, user_name, user_username, user_email)
 *     responses:
 *       200:
 *         description: Lista paginada de roles de usuario con nombre de rol
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
 *                   example: Consulta exitosa
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserRolWithName'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 3
 *                     pages:
 *                       type: integer
 *                       example: 1
 *                     hasNext:
 *                       type: boolean
 *                       example: false
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: Usuario sin permisos
 */
