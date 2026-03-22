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
 *     CfgT:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         tipo_id:
 *           type: integer
 *         tipo_form_id:
 *           type: integer
 *         fecha_inicio:
 *           type: boolean
 *         es_cmt_gen_oblig:
 *           type: boolean
 *         es_activo:
 *           type: boolean
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *         fecha_actualizacion:
 *           type: string
 *           format: date-time
 *         tipo_evaluacion:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             categoria:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                   example: "Docente"
 *                 descripcion:
 *                   type: string
 *                   nullable: true
 *             tipo:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                   example: "Evaluación In Situ"
 *                 descripcion:
 *                   type: string
 *                   nullable: true
 *         rolesRequeridos:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               rol_mix_id:
 *                 type: integer
 *               nombre:
 *                 type: string
 *                 nullable: true
 *               rol_origen_id:
 *                 type: integer
 *               origen:
 *                 type: string
 *                 enum: [APP, AUTH]
 *         scopes:
 *           type: array
 *           description: Scopes asociados a la configuración
 *           items:
 *             $ref: '#/components/schemas/ScopeItem'
 *         cfg_t_rel:
 *           allOf:
 *             - $ref: '#/components/schemas/CfgTRel'
 *           nullable: true

 *     CfgTRel:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         cfg_eval_id:
 *           type: integer
 *         cfg_autoeval_id:
 *           type: integer
 *         pareja_cfg_t_id:
 *           type: integer
 *           description: ID de la cfg_t pareja en la relación
 *         rol_en_rel:
 *           type: string
 *           enum: [EVAL, AUTOEVAL]
 *           description: Rol de la configuración actual dentro de cfg_t_rel
 *
 *     CfgTListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Listado de configuraciones obtenido correctamente
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CfgT'
 *
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
 *
 *     CfgA:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         cfg_t_id:
 *           type: integer
 *         aspecto_id:
 *           type: integer
 *         orden:
 *           type: number
 *         es_activo:
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
 *
 *     CfgE:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         cfg_t_id:
 *           type: integer
 *         escala_id:
 *           type: integer
 *         puntaje:
 *           type: number
 *         orden:
 *           type: number
 *         es_activo:
 *           type: boolean
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
 *     CfgACfgEItem:
 *       type: object
 *       properties:
 *         tipo_form_id:
 *           type: integer
 *         es_cmt_gen:
 *           type: boolean
 *         es_cmt_gen_oblig:
 *           type: boolean
 *         tipo_evaluacion:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             categoria:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 descripcion:
 *                   type: string
 *                   nullable: true
 *             tipo:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 descripcion:
 *                   type: string
 *                   nullable: true
 *         cfg_a:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CfgA'
 *         cfg_e:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CfgE'
 *
 *     CfgACfgEResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Configuración cfg_a y cfg_e obtenida
 *         data:
 *           type: object
 *           properties:
 *             cfg_a:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CfgA'
 *             cfg_e:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CfgE'
 *
 *     RolMix:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID de un registro scope asociado al rol
 *         rol_mix_id:
 *           type: integer
 *           nullable: true
 *         rol_origen_id:
 *           type: integer
 *           nullable: true
 *         nombre:
 *           type: string
 *           nullable: true
 *         origen:
 *           type: string
 *           enum: [APP, AUTH]
 *           nullable: true
 *
 *     RolesResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Roles obtenidos correctamente
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RolMix'
 *
 *     EvalByUserItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         id_configuracion:
 *           type: integer
 *         estudiante:
 *           type: string
 *           nullable: true
 *         docente:
 *           type: string
 *           nullable: true
 *         codigo_materia:
 *           type: string
 *           nullable: true
 *         es_evaluacion:
 *           type: boolean
 *           nullable: true
 *         es_finalizada:
 *           type: boolean
 *           description: Indica si la evaluación/encuesta ha sido completada (tiene respuestas en eval_det)
 *         nombre_docente:
 *           type: string
 *           nullable: true
 *           example: "Juan Pérez"
 *         nombre_materia:
 *           type: string
 *           nullable: true
 *           example: "Programación Web"
 *
 *     EvalByUserResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Evaluaciones obtenidas correctamente
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EvalByUserItem'
 *
 *     ScopeItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         cfg_t_id:
 *           type: integer
 *         sede_id:
 *           type: integer
 *           nullable: true
 *         sede_nombre:
 *           type: string
 *           nullable: true
 *           example: "Bogotá"
 *         periodo_id:
 *           type: integer
 *         periodo_nombre:
 *           type: string
 *           nullable: true
 *           example: "2024-1"
 *         programa_id:
 *           type: integer
 *           nullable: true
 *         programa_nombre:
 *           type: string
 *           nullable: true
 *           example: "Ingeniería de Sistemas"
 *         semestre_id:
 *           type: integer
 *           nullable: true
 *         semestre_nombre:
 *           type: string
 *           nullable: true
 *           example: "III"
 *         grupo_id:
 *           type: integer
 *           nullable: true
 *         grupo_nombre:
 *           type: string
 *           nullable: true
 *           example: "A"
 *
 *     ScopeResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Scopes obtenidos correctamente
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ScopeItem'
 *
 *     CfgTFullRequest:
 *       type: object
 *       properties:
 *         tipo_id:
 *           type: integer
 *         tipo_form_id:
 *           type: integer
 *           description: Solo tipo_form_id=1 permite genera_autoeval=true
 *         genera_autoeval:
 *           type: boolean
 *         autoeval_tipo_form_id:
 *           type: integer
 *           nullable: true
 *           description: Requerido cuando genera_autoeval=true (3 o 4)
 *         autoeval_rol_mix_ids:
 *           type: array
 *           minItems: 1
 *           nullable: true
 *           description: IDs de los roles autorizados para la autoevaluación. Requerido cuando genera_autoeval=true
 *           items:
 *             type: integer
 *         fecha_inicio:
 *           type: string
 *           format: date
 *         fecha_fin:
 *           type: string
 *           format: date
 *         es_cmt_gen:
 *           type: boolean
 *         es_cmt_gen_oblig:
 *           type: boolean
 *         es_activo:
 *           type: boolean
 *         scopes:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             properties:
 *               sede_id:
 *                 type: integer
 *                 nullable: true
 *               periodo_id:
 *                 type: integer
 *               programa_id:
 *                 type: integer
 *                 nullable: true
 *               semestre_id:
 *                 type: integer
 *                 nullable: true
 *               grupo_id:
 *                 type: integer
 *                 nullable: true
 *         roles:
 *           type: array
 *           minItems: 1
 *           description: Roles requeridos (relación M:M en cfg_t_rol)
 *           items:
 *             type: object
 *             properties:
 *               rol_mix_id:
 *                 type: integer
 *         rol_mix_ids:
 *           type: array
 *           description: Atajo compatible para enviar solo IDs de rol
 *           items:
 *             type: integer
 *
 *     CfgTFullResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Configuración creada correctamente
 *         data:
 *           type: object
 *           properties:
 *             cfg_eval:
 *               $ref: '#/components/schemas/CfgT'
 *             cfg_autoeval:
 *               allOf:
 *                 - $ref: '#/components/schemas/CfgT'
 *               nullable: true
 *             relation:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: integer
 *                 cfg_eval_id:
 *                   type: integer
 *                 cfg_autoeval_id:
 *                   type: integer
 *             scope_count:
 *               type: integer
 */

/**
 * @swagger
 * /cfg/t/full:
 *   post:
 *     summary: Crea configuración completa de cfg_t con scope, roles M:M y autoevaluación relacionada opcional
 *     tags: [Configuración Tipo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CfgTFullRequest'
 *           example:
 *             tipo_id: 1
 *             tipo_form_id: 1
 *             genera_autoeval: true
 *             autoeval_tipo_form_id: 3
 *             autoeval_rol_mix_ids: [5, 6]
 *             fecha_inicio: "2026-03-20"
 *             fecha_fin: "2026-03-25"
 *             es_cmt_gen: true
 *             es_cmt_gen_oblig: false
 *             es_activo: true
 *             scopes:
 *               - sede_id: null
 *                 periodo_id: 1
 *                 programa_id: 1
 *                 semestre_id: 1
 *                 grupo_id: 1
 *             roles:
 *               - rol_mix_id: 1
 *               - rol_mix_id: 2
 *     responses:
 *       200:
 *         description: Configuración creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CfgTFullResponse'
 *       400:
 *         description: Validación de negocio o payload inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin autorización
 */

/**
 * @swagger
 * /cfg/t/r:
 *   get:
 *     summary: Obtiene listado de configuraciones según rol del usuario
 *     tags: [Configuración Tipo]
 *     parameters:
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Término de búsqueda para filtrar por nombre o descripción (mínimo 2 caracteres)
 *         example: "docente"
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [id, nombre, fecha_inicio]
 *         description: Campo por el cual ordenar los resultados
 *         example: "fecha_inicio"
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación (ascendente o descendente)
 *         example: "desc"
 *     responses:
 *       200:
 *         description: Listado de configuraciones accesibles al usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CfgTListResponse'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin autorización (no tiene rol requerido)
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

/**
 * @swagger
 * /cfg/t/cfg-a_cfg-e:
 *   get:
 *     summary: Obtiene todas las configuraciones cfg_a y cfg_e
 *     tags: [Configuración Tipo]
 *     responses:
 *       200:
 *         description: Listado de todas las configuraciones cfg_a y cfg_e
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
 *                   example: Configuraciones cfg_a y cfg_e obtenidas
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CfgACfgEItem'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin autorización
 */

/**
 * @swagger
 * /cfg/t/{id}/cfg-a_cfg-e:
 *   get:
 *     summary: Obtiene configuración cfg_a y cfg_e por ID
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
 *         description: Configuración cfg_a y cfg_e
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
 *                   example: Configuración cfg_a y cfg_e obtenida
 *                 data:
 *                   $ref: '#/components/schemas/CfgACfgEItem'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin autorización
 *       404:
 *         description: No encontrado
 */

/**
 * @swagger
 * /cfg/t/{id}/roles:
 *   get:
 *     summary: Obtiene los roles asignados a una configuración tipo
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
 *         description: Listado de roles asignados a la cfg_t
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RolesResponse'
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin autorización
 *       404:
 *         description: No encontrado
 */

/**
 * @swagger
 * /cfg/t/{id}/evals:
 *   get:
 *     summary: Obtiene evaluaciones/encuestas del usuario autenticado por configuración
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
 *         description: Listado de evaluaciones/encuestas del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EvalByUserResponse'
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin autorización
 *       404:
 *         description: No encontrado
 */

/**
 * @swagger
 * /cfg/t/{id}/scope:
 *   get:
 *     summary: Obtiene el scope de una configuración con nombres de sede, período, programa, semestre y grupo
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
 *         description: Listado de scopes con información completa de todas las relaciones
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScopeResponse'
 *       400:
 *         description: Solicitud inválida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin autorización
 *       404:
 *         description: No encontrado
 */
