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
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           $ref: '#/components/schemas/DataloginUser'
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
