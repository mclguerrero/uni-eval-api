/**
 * @swagger
 * tags:
 *   - name: User Prog
 *     description: Gestión de programas por usuario
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProgWithName:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_rol_id:
 *           type: integer
 *           example: 2
 *         prog_id:
 *           type: integer
 *           example: 1
 *         prog_nombre:
 *           type: string
 *           example: "Ingeniería en Sistemas"
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
 *     UserProgWithDataLogin:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_rol_id:
 *           type: integer
 *           example: 2
 *         prog_id:
 *           type: integer
 *           example: 1
 *         prog_nombre:
 *           type: string
 *           example: "Ingeniería en Sistemas"
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
 * /user/prog/u:
 *   get:
 *     summary: Obtener programas de usuario con datos del usuario
 *     tags: [User Prog]
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
 *         description: Término de búsqueda (busca en prog_nombre, user_name, user_username, user_email)
 *     responses:
 *       200:
 *         description: Lista paginada de programas de usuario con datos del usuario
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
 *                     $ref: '#/components/schemas/UserProgWithDataLogin'
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
