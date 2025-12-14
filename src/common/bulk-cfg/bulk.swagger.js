module.exports = {
	paths: {
		'/cfg/a/bulk': {
			post: {
				summary: 'Bulk crear Configuración Aspecto',
				description: 'Inserta múltiples registros en `cfg_a`',
				tags: ['Configuración Aspecto'],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/CfgABulkInput' },
							examples: {
								ejemplo: {
									value: {
										cfg_t_id: 2,
										items: [
											{ aspecto_id: 6, orden: 1.0, es_activo: true },
											{ aspecto_id: 7, orden: 1.5, es_activo: true },
											{ aspecto_id: 8, orden: 2.0, es_activo: false },
											{ aspecto_id: 9, orden: 3.0, es_activo: true },
										],
									},
								},
							},
						},
					},
				},
				responses: {
					201: {
						description: 'Registros creados en `cfg_a`',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/BulkCreateResponse' },
							},
						},
					},
				},
			},
		},

		'/cfg/e/bulk': {
			post: {
				summary: 'Bulk crear Configuración Escala',
				description: 'Inserta múltiples registros en `cfg_e`',
				tags: ['Configuración Escala'],
				security: [{ bearerAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/CfgEBulkInput' },
							examples: {
								ejemplo: {
									value: {
										cfg_t_id: 2,
										items: [
											{ escala_id: 1, puntaje: 0.5, orden: 1.0, es_activo: true },
											{ escala_id: 2, puntaje: 1.0, orden: 2.0, es_activo: true },
											{ escala_id: 3, puntaje: 1.5, orden: 3.0, es_activo: false },
											{ escala_id: 4, puntaje: 2.0, orden: 4.0, es_activo: true },
										],
									},
								},
							},
						},
					},
				},
				responses: {
					201: {
						description: 'Registros creados en `cfg_e`',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/BulkCreateResponse' },
							},
						},
					},
				},
			},
		},
	},

	components: {
		schemas: {
			CfgABulkItem: {
				type: 'object',
				properties: {
					aspecto_id: { type: 'integer', example: 6 },
					orden: { type: 'number', example: 1.0 },
					es_activo: { type: 'boolean', example: true },
				},
				required: ['aspecto_id', 'orden', 'es_activo'],
			},

			CfgEBulkItem: {
				type: 'object',
				properties: {
					escala_id: { type: 'integer', example: 1 },
					puntaje: { type: 'number', example: 0.5 },
					orden: { type: 'number', example: 1.0 },
					es_activo: { type: 'boolean', example: true },
				},
				required: ['escala_id', 'puntaje', 'orden', 'es_activo'],
			},

			CfgABulkInput: {
				type: 'object',
				properties: {
					cfg_t_id: { type: 'integer', example: 2 },
					items: { type: 'array', items: { $ref: '#/components/schemas/CfgABulkItem' } },
				},
				required: ['cfg_t_id', 'items'],
			},

			CfgEBulkInput: {
				type: 'object',
				properties: {
					cfg_t_id: { type: 'integer', example: 2 },
					items: { type: 'array', items: { $ref: '#/components/schemas/CfgEBulkItem' } },
				},
				required: ['cfg_t_id', 'items'],
			},

			BulkCreateResponse: {
				type: 'object',
				properties: {
					success: { type: 'boolean', example: true },
					message: { type: 'string', example: 'Creado correctamente' },
					data: { type: 'array', items: { type: 'object' } },
				},
			},
		},
	},

	tags: [
		{ name: 'Configuración Aspecto', description: 'Bulk para cfg_a' },
		{ name: 'Configuración Escala', description: 'Bulk para cfg_e' },
	],
};
