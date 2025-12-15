/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Endpoints de autenticación y consulta de usuarios remotos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DataloginUser:
 *       type: object
 *       description: Usuario remoto (sin contraseña)
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 123
 *         user_name:
 *           type: string
 *           example: Juan Pérez
 *         user_username:
 *           type: string
 *           example: jperez
 *         user_email:
 *           type: string
 *           example: jperez@example.com
 *         user_idrole:
 *           type: integer
 *           example: 2
 *         user_statusid:
 *           type: string
 *           example: A
 *         role_name:
 *           type: string
 *           example: Administrador
 *     LoginInput:
 *       type: object
 *       required: [user_username, user_password]
 *       properties:
 *         user_username:
 *           type: string
 *           example: 1006948527
 *         user_password:
 *           type: string
 *           example: 1006948527
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *               example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *             refreshToken:
 *               type: string
 *               example: 2f1c0c7c-...
 *             jti:
 *               type: string
 *               example: 9e4c4b67-...
 *             refreshExpiresAt:
 *               type: string
 *               format: date-time
 *             user:
 *               $ref: '#/components/schemas/DataloginUser'
 *     RefreshInput:
 *       type: object
 *       required: [user_id, refresh_token]
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 123
 *         refresh_token:
 *           type: string
 *           example: 2f1c0c7c-...
 *     RefreshResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *             refreshToken:
 *               type: string
 *             jti:
 *               type: string
 *             refreshExpiresAt:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /auth/:
 *   get:
 *     summary: Listar todos los usuarios remotos
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios (sin contraseñas)
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
 *                     $ref: '#/components/schemas/DataloginUser'
 */

/**
 * @swagger
 * /auth/id/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DataloginUser'
 *       404:
 *         description: Usuario no encontrado
 */

/**
 * @swagger
 * /auth/username/{username}:
 *   get:
 *     summary: Obtener usuario por username
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DataloginUser'
 *       404:
 *         description: Usuario no encontrado
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión con username y password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Credenciales incompletas
 *       401:
 *         description: Usuario o contraseña inválidos
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar access token usando refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshInput'
 *     responses:
 *       200:
 *         description: Token renovado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *       400:
 *         description: Datos incompletos
 *       401:
 *         description: Refresh token inválido o expirado
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión (revoca refresh token activo)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     revoked:
 *                       type: boolean
 *                       example: true
 */
