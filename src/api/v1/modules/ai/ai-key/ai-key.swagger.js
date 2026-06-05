/**
 * @swagger
 * tags:
 *   - name: IA Keys
 *     description: Gestión de API keys de IA por usuario (requiere autenticación)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AiProviderSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "OpenAI"
 *         requiere_url:
 *           type: boolean
 *           example: false
 *
 *     AiModelSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 3
 *         model_id:
 *           type: string
 *           example: "gpt-4o"
 *
 *     AiProviderWithModels:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "OpenAI"
 *         requiere_url:
 *           type: boolean
 *           example: false
 *         es_activo:
 *           type: boolean
 *           example: true
 *         ai_model:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AiModelSummary'
 *
 *     UserAiKey:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 7
 *         provider_id:
 *           type: integer
 *           example: 1
 *         model_id:
 *           type: integer
 *           nullable: true
 *           example: 3
 *         base_url:
 *           type: string
 *           nullable: true
 *           example: null
 *         es_activa:
 *           type: boolean
 *           example: true
 *         es_default:
 *           type: boolean
 *           example: true
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *         fecha_actualizacion:
 *           type: string
 *           format: date-time
 *         ai_provider:
 *           $ref: '#/components/schemas/AiProviderSummary'
 *         ai_model:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/AiModelSummary'
 *
 *     CreateUserAiKeyInput:
 *       type: object
 *       required:
 *         - provider_id
 *         - api_key
 *       properties:
 *         provider_id:
 *           type: integer
 *           example: 1
 *         model_id:
 *           type: integer
 *           nullable: true
 *           example: 3
 *         api_key:
 *           type: string
 *           example: "sk-..."
 *           description: Clave en texto plano; se cifra en servidor con AES-256-GCM
 *         base_url:
 *           type: string
 *           nullable: true
 *           example: null
 *           description: Requerido solo para proveedores con requiere_url=true (ej. Ollama)
 *         es_default:
 *           type: boolean
 *           example: true
 *           description: Si true, quita el flag de las demás keys del mismo proveedor
 *
 *     UpdateUserAiKeyInput:
 *       type: object
 *       properties:
 *         model_id:
 *           type: integer
 *           nullable: true
 *           example: 4
 *         base_url:
 *           type: string
 *           nullable: true
 *           example: "http://localhost:11434"
 *         es_activa:
 *           type: boolean
 *           example: false
 *
 *     ValidateKeyResult:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Conexión exitosa"
 *         model:
 *           type: string
 *           nullable: true
 *           example: "gpt-4o"
 */

// ─── GET /ai/providers ────────────────────────────────────────────────────────

/**
 * @swagger
 * /ai/providers:
 *   get:
 *     summary: Listar proveedores activos con sus modelos
 *     description: |
 *       Devuelve todos los `ai_provider` con `es_activo=true`, incluyendo sus modelos activos.
 *       Útil para construir el selector de proveedor/modelo al registrar una key.
 *     tags: [IA Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de proveedores con modelos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Proveedores de IA"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AiProviderWithModels'
 *             example:
 *               success: true
 *               message: "Proveedores de IA"
 *               data:
 *                 - id: 1
 *                   nombre: "OpenAI"
 *                   requiere_url: false
 *                   es_activo: true
 *                   ai_model:
 *                     - id: 1
 *                       model_id: "gpt-4o"
 *                     - id: 2
 *                       model_id: "gpt-4o-mini"
 *                 - id: 2
 *                   nombre: "Ollama"
 *                   requiere_url: true
 *                   es_activo: true
 *                   ai_model:
 *                     - id: 3
 *                       model_id: "llama3.1:8b-instruct-q4_K_M"
 *                 - id: 3
 *                   nombre: "Anthropic"
 *                   requiere_url: false
 *                   es_activo: true
 *                   ai_model:
 *                     - id: 4
 *                       model_id: "claude-sonnet-4-6"
 *                 - id: 4
 *                   nombre: "Gemini"
 *                   requiere_url: false
 *                   es_activo: true
 *                   ai_model:
 *                     - id: 5
 *                       model_id: "gemini-2.0-flash"
 *       401:
 *         description: No autenticado
 */

// ─── GET /ai/keys  |  POST /ai/keys ──────────────────────────────────────────

/**
 * @swagger
 * /ai/keys:
 *   get:
 *     summary: Listar mis API keys registradas
 *     description: |
 *       Devuelve las keys del usuario autenticado. La clave cifrada **nunca** se expone;
 *       solo se retornan metadatos (proveedor, modelo, estado, fechas).
 *       Ordenadas: predeterminada primero, luego por fecha de creación descendente.
 *     tags: [IA Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de keys del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "API keys obtenidas"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserAiKey'
 *             example:
 *               success: true
 *               message: "API keys obtenidas"
 *               data:
 *                 - id: 7
 *                   provider_id: 1
 *                   model_id: 1
 *                   base_url: null
 *                   es_activa: true
 *                   es_default: true
 *                   fecha_creacion: "2026-06-01T10:00:00.000Z"
 *                   fecha_actualizacion: "2026-06-01T10:00:00.000Z"
 *                   ai_provider:
 *                     id: 1
 *                     nombre: "OpenAI"
 *                     requiere_url: false
 *                   ai_model:
 *                     id: 1
 *                     model_id: "gpt-4o"
 *       401:
 *         description: No autenticado
 *
 *   post:
 *     summary: Registrar una nueva API key
 *     description: |
 *       Cifra la `api_key` con AES-256-GCM y la almacena en `user_ai_key`.
 *       Si `es_default=true`, limpia el flag de las demás keys del mismo proveedor.
 *     tags: [IA Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserAiKeyInput'
 *           examples:
 *             openai:
 *               summary: OpenAI con modelo
 *               value:
 *                 provider_id: 1
 *                 model_id: 1
 *                 api_key: "sk-proj-..."
 *                 es_default: true
 *             ollama:
 *               summary: Ollama local (requiere base_url)
 *               value:
 *                 provider_id: 2
 *                 model_id: 3
 *                 api_key: "ollama"
 *                 base_url: "http://localhost:11434"
 *                 es_default: false
 *     responses:
 *       200:
 *         description: Key registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "API key registrada"
 *                 data:
 *                   $ref: '#/components/schemas/UserAiKey'
 *       400:
 *         description: provider_id o api_key faltantes
 *       401:
 *         description: No autenticado
 */

// ─── PUT /ai/keys/{id}  |  DELETE /ai/keys/{id} ──────────────────────────────

/**
 * @swagger
 * /ai/keys/{id}:
 *   put:
 *     summary: Actualizar una API key
 *     description: Permite cambiar el modelo, la base_url o el estado activo de una key propia.
 *     tags: [IA Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la key a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserAiKeyInput'
 *           examples:
 *             cambiarModelo:
 *               summary: Cambiar modelo
 *               value:
 *                 model_id: 2
 *             desactivar:
 *               summary: Desactivar key
 *               value:
 *                 es_activa: false
 *             cambiarUrl:
 *               summary: Cambiar URL base (Ollama)
 *               value:
 *                 base_url: "http://192.168.1.10:11434"
 *     responses:
 *       200:
 *         description: Key actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "API key actualizada"
 *                 data:
 *                   $ref: '#/components/schemas/UserAiKey'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Key no encontrada o no pertenece al usuario
 *
 *   delete:
 *     summary: Eliminar una API key
 *     tags: [IA Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la key a eliminar
 *     responses:
 *       200:
 *         description: Key eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "API key eliminada"
 *                 data:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Key no encontrada o no pertenece al usuario
 */

// ─── PATCH /ai/keys/{id}/default ─────────────────────────────────────────────

/**
 * @swagger
 * /ai/keys/{id}/default:
 *   patch:
 *     summary: Marcar una key como predeterminada
 *     description: |
 *       Quita `es_default` de todas las keys del usuario para ese proveedor
 *       y la activa en la key indicada. También fuerza `es_activa=true`.
 *     tags: [IA Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la key que se desea marcar como predeterminada
 *     responses:
 *       200:
 *         description: Key marcada como predeterminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "API key marcada como predeterminada"
 *                 data:
 *                   $ref: '#/components/schemas/UserAiKey'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Key no encontrada o no pertenece al usuario
 */

// ─── POST /ai/keys/{id}/validate ─────────────────────────────────────────────

/**
 * @swagger
 * /ai/keys/{id}/validate:
 *   post:
 *     summary: Validar conexión con el proveedor
 *     description: |
 *       Descifra la api_key en servidor, instancia el provider correspondiente
 *       y llama a `validateConnection()`. Retorna `ok: true` si la conexión es exitosa.
 *     tags: [IA Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la key a validar
 *     responses:
 *       200:
 *         description: Resultado de la validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Resultado de validación"
 *                 data:
 *                   $ref: '#/components/schemas/ValidateKeyResult'
 *             examples:
 *               exitoso:
 *                 summary: Conexión exitosa
 *                 value:
 *                   success: true
 *                   message: "Resultado de validación"
 *                   data:
 *                     ok: true
 *                     message: "Conexión exitosa"
 *                     model: "gpt-4o"
 *               fallido:
 *                 summary: Credenciales inválidas
 *                 value:
 *                   success: true
 *                   message: "Resultado de validación"
 *                   data:
 *                     ok: false
 *                     message: "Unauthorized: invalid API key"
 *                     model: null
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Key no encontrada o no pertenece al usuario
 */
