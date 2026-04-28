const { prisma, userPrisma } = require('@config/prisma');

// Calculate the most frequent value in an array (mode)
function getMostFrequent(values) {
	if (!values || values.length === 0) return null;
	const frequency = {};
	let maxCount = 0;
	let mostFrequent = null;
	
	for (const value of values) {
		if (value == null) continue;
		frequency[value] = (frequency[value] || 0) + 1;
		if (frequency[value] > maxCount) {
			maxCount = frequency[value];
			mostFrequent = value;
		}
	}
	
	return mostFrequent;
}

class CfgTRepository {

	// Busca la configuración por id y su pareja si existe, con scopes y roles
	async findCfgByIdWithPair(id, search, sort) {
		// Buscar la configuración principal
		let cfgT = await prisma.cfg_t.findUnique({
			where: { id },
			include: {
				tipo_form: { select: { id: true, nombre: true } },
				ct_map: { include: { cat_t: true, tipo: true } },
			},
		});
		if (!cfgT) return [];

		// Enriquecer con roles requeridos
		const roles = await prisma.cfg_t_rol.findMany({
			where: { cfg_t_id: id },
			include: { rol_mix: true },
		});
		const rolesRequeridos = roles.map(r => ({
			rol_mix_id: r.rol_mix?.id,
			nombre: r.rol_mix?.nombre ?? null,
			rol_origen_id: r.rol_mix?.rol_origen_id,
			origen: r.rol_mix?.origen,
		}));

		// Enriquecer con scopes
		const scopes = await prisma.cfg_t_scope.findMany({
			where: { cfg_t_id: id },
			include: {
				sede: { select: { id: true, nombre: true } },
				periodo: { select: { id: true, nombre: true } },
				programa: { select: { id: true, nombre: true } },
				smstre: { select: { id: true, nombre: true } },
				grp: { select: { id: true, nombre: true } },
			},
			orderBy: { id: 'asc' },
		});
		const scopesMapped = scopes.map(scope => ({
			id: scope.id,
			cfg_t_id: scope.cfg_t_id,
			sede_id: scope.sede_id,
			sede_nombre: scope.sede?.nombre || null,
			periodo_id: scope.periodo_id,
			periodo_nombre: scope.periodo?.nombre || null,
			programa_id: scope.programa_id,
			programa_nombre: scope.programa?.nombre || null,
			semestre_id: scope.semestre_id,
			semestre_nombre: scope.smstre?.nombre || null,
			grupo_id: scope.grupo_id,
			grupo_nombre: scope.grp?.nombre || null,
		}));

		// Buscar si tiene pareja (cfg_t_rel)
		const rel = await prisma.cfg_t_rel.findFirst({
			where: {
				OR: [
					{ cfg_eval_id: id },
					{ cfg_autoeval_id: id },
				],
			},
		});

		// Formatear cfg_t_rel
		let cfg_t_rel = null;
		if (rel) {
			cfg_t_rel = {
				id: rel.id,
				cfg_eval_id: rel.cfg_eval_id,
				cfg_autoeval_id: rel.cfg_autoeval_id,
				pareja_cfg_t_id: rel.cfg_eval_id === id ? rel.cfg_autoeval_id : rel.cfg_eval_id,
				rol_en_rel: rel.cfg_eval_id === id ? 'EVAL' : 'AUTOEVAL',
			};
		}

		// Formatear respuesta
		const result = {
			id: cfgT.id,
			tipo_id: cfgT.tipo_id,
			tipo_form: cfgT.tipo_form,
			fecha_inicio: cfgT.fecha_inicio,
			fecha_fin: cfgT.fecha_fin,
			es_cmt_gen: cfgT.es_cmt_gen,
			es_cmt_gen_oblig: cfgT.es_cmt_gen_oblig,
			es_activo: cfgT.es_activo,
			fecha_creacion: cfgT.fecha_creacion,
			fecha_actualizacion: cfgT.fecha_actualizacion,
			tipo_evaluacion: cfgT.ct_map
				? {
						id: cfgT.ct_map.id,
						categoria: cfgT.ct_map.cat_t
							? {
									id: cfgT.ct_map.cat_t.id,
									nombre: cfgT.ct_map.cat_t.nombre,
									descripcion: cfgT.ct_map.cat_t.descripcion || null,
								}
							: null,
						tipo: cfgT.ct_map.tipo
							? {
									id: cfgT.ct_map.tipo.id,
									nombre: cfgT.ct_map.tipo.nombre,
									descripcion: cfgT.ct_map.tipo.descripcion || null,
								}
							: null,
					}
				: null,
			rolesRequeridos,
			scopes: scopesMapped,
			cfg_t_rel,
		};

		return [result];
	}
	
	async createCfgTFull({ cfg_t, scopes, role_mix_ids, autoeval_role_mix_ids }) {
		return prisma.$transaction(async tx => {
			const cfgEval = await tx.cfg_t.create({ data: cfg_t });

			await tx.cfg_t_scope.createMany({
				data: scopes.map(scope => ({
					cfg_t_id: cfgEval.id,
					sede_id: scope.sede_id,
					periodo_id: scope.periodo_id,
					programa_id: scope.programa_id,
					semestre_id: scope.semestre_id,
					grupo_id: scope.grupo_id,
				})),
			});

			await tx.cfg_t_rol.createMany({
				data: role_mix_ids.map(rolMixId => ({
					cfg_t_id: cfgEval.id,
					rol_mix_id: rolMixId,
				})),
				skipDuplicates: true,
			});

			const mustCreateAutoeval =
				cfg_t.tipo_form_id === 1 &&
				cfg_t.genera_autoeval === true &&
				[3, 4].includes(cfg_t.autoeval_tipo_form_id);

			if (!mustCreateAutoeval) {
				return {
					cfg_eval: cfgEval,
					cfg_autoeval: null,
					relation: null,
					scope_count: scopes.length,
				};
			}

			const cfgAutoeval = await tx.cfg_t.create({
				data: {
					tipo_id: cfg_t.tipo_id,
					tipo_form_id: cfg_t.autoeval_tipo_form_id,
					genera_autoeval: false,
					autoeval_tipo_form_id: null,
					fecha_inicio: cfg_t.fecha_inicio,
					fecha_fin: cfg_t.fecha_fin,
					es_cmt_gen: cfg_t.es_cmt_gen,
					es_cmt_gen_oblig: cfg_t.es_cmt_gen_oblig,
					es_activo: cfg_t.es_activo,
				},
			});

			await tx.cfg_t_scope.createMany({
				data: scopes.map(scope => ({
					cfg_t_id: cfgAutoeval.id,
					sede_id: scope.sede_id,
					periodo_id: scope.periodo_id,
					programa_id: scope.programa_id,
					semestre_id: scope.semestre_id,
					grupo_id: scope.grupo_id,
				})),
			});

			// Usar autoeval_role_mix_ids si están disponibles, sino usar role_mix_ids
			const autoevalRoleIds = autoeval_role_mix_ids && autoeval_role_mix_ids.length > 0 
				? autoeval_role_mix_ids 
				: role_mix_ids;

			await tx.cfg_t_rol.createMany({
				data: autoevalRoleIds.map(rolMixId => ({
					cfg_t_id: cfgAutoeval.id,
					rol_mix_id: rolMixId,
				})),
				skipDuplicates: true,
			});

			const relation = await tx.cfg_t_rel.create({
				data: {
					cfg_eval_id: cfgEval.id,
					cfg_autoeval_id: cfgAutoeval.id,
				},
			});

			return {
				cfg_eval: cfgEval,
				cfg_autoeval: cfgAutoeval,
				relation,
				scope_count: scopes.length,
			};
		});
	}

	async findAspectosEscalasByCfgTId(cfgTId) {
		// Fetch cfg_t data for configuration flags and tipo_evaluacion
		const cfgT = await prisma.cfg_t.findUnique({
			where: { id: cfgTId },
			select: {
				tipo_form: {
					select: { id: true, nombre: true }
				},
				es_cmt_gen: true,
				es_cmt_gen_oblig: true,
				ct_map: {
					include: {
						cat_t: true,
						tipo: true
					}
				}
			}
		});

		const items = await prisma.a_e.findMany({
			where: { cfg_a: { cfg_t_id: cfgTId } },
			include: {
				cfg_a: {
					include: {
						ca_map: { include: { aspecto: true } }
					}
				},
				cfg_e: {
					include: {
						ce_map: { include: { escala: true } }
					}
				}
			}
		});

		// Group by aspecto and collect possible escalas with a_e id per option
		const byAspecto = new Map();
		for (const item of items) {
			const aspecto = item.cfg_a?.ca_map?.aspecto;
			if (!aspecto) continue;
			const aspectoKey = aspecto.id;
			if (!byAspecto.has(aspectoKey)) {
				byAspecto.set(aspectoKey, {
					id: aspecto.id,
					cfg_a_id: item.cfg_a?.id ?? null,
					nombre: aspecto.nombre,
					descripcion: aspecto.descripcion || null,
					orden: item.cfg_a?.orden ?? null,
					es_activo: item.cfg_a?.es_activo ?? true,
					es_cmt: item.es_cmt ?? false,
					es_cmt_oblig: item.es_cmt_oblig ?? false,
					opciones: [] // escalas/respuestas por pregunta
				});
			}
			const escala = item.cfg_e?.ce_map?.escala || null;
			const opcion = escala
				? {
						id: escala.id,
						sigla: escala.sigla,
						nombre: escala.nombre,
						descripcion: escala.descripcion || null,
						orden: item.cfg_e?.orden ?? null,
						puntaje: item.cfg_e?.puntaje ?? null,
						a_e_id: item.id,
					}
				: {
						id: null,
						sigla: null,
						nombre: null,
						descripcion: null,
						orden: null,
						puntaje: null,
						a_e_id: item.id,
					};

			byAspecto.get(aspectoKey).opciones.push(opcion);
		}

		// Return ordered list by cfg_a.orden if available
		const aspectos = Array.from(byAspecto.values()).sort((a, b) => {
			const ao = a.orden ?? 0;
			const bo = b.orden ?? 0;
			return ao === bo ? a.id - b.id : ao - bo;
		});

		// Sort opciones (escalas) inside each aspecto by cfg_e.orden ascending
		for (const aspecto of aspectos) {
			if (Array.isArray(aspecto.opciones)) {
				aspecto.opciones.sort((o1, o2) => {
					const a = o1.orden ?? 0;
					const b = o2.orden ?? 0;
					return a === b ? (o1.id ?? 0) - (o2.id ?? 0) : a - b;
				});
			}
		}

		return {
			tipo_form: cfgT?.tipo_form ?? null,
			es_cmt_gen: cfgT?.es_cmt_gen ?? null,
			es_cmt_gen_oblig: cfgT?.es_cmt_gen_oblig ?? null,
			tipo_evaluacion: cfgT?.ct_map
				? {
						id: cfgT.ct_map.id,
						categoria: cfgT.ct_map.cat_t
							? {
									id: cfgT.ct_map.cat_t.id,
									nombre: cfgT.ct_map.cat_t.nombre,
									descripcion: cfgT.ct_map.cat_t.descripcion || null,
							  }
							: null,
						tipo: cfgT.ct_map.tipo
							? {
									id: cfgT.ct_map.tipo.id,
									nombre: cfgT.ct_map.tipo.nombre,
									descripcion: cfgT.ct_map.tipo.descripcion || null,
							  }
							: null,
				  }
				: null,
			aspectos
		};
	}

	async findAllCfgAAndCfgE() {
		const allCfgTs = await prisma.cfg_t.findMany({
			include: {
				tipo_form: {
					select: { id: true, nombre: true }
				},
				ct_map: {
					include: {
						cat_t: true,
						tipo: true
					}
				}
			},
			orderBy: { id: 'asc' },
		});

		const results = [];
		for (const cfgT of allCfgTs) {
			const [cfgAs, cfgEs] = await Promise.all([
				prisma.cfg_a.findMany({
					where: { cfg_t_id: cfgT.id },
					include: { ca_map: { include: { aspecto: true } } },
					orderBy: { orden: 'asc' },
				}),
				prisma.cfg_e.findMany({
					where: { cfg_t_id: cfgT.id },
					include: { ce_map: { include: { escala: true } } },
					orderBy: { orden: 'asc' },
				}),
			]);

			results.push({
			tipo_form: cfgT.tipo_form,
				es_cmt_gen: cfgT.es_cmt_gen,
				es_cmt_gen_oblig: cfgT.es_cmt_gen_oblig,
				tipo_evaluacion: cfgT.ct_map
					? {
							id: cfgT.ct_map.id,
							categoria: cfgT.ct_map.cat_t
								? {
										id: cfgT.ct_map.cat_t.id,
										nombre: cfgT.ct_map.cat_t.nombre,
										descripcion: cfgT.ct_map.cat_t.descripcion || null,
								  }
								: null,
							tipo: cfgT.ct_map.tipo
								? {
										id: cfgT.ct_map.tipo.id,
										nombre: cfgT.ct_map.tipo.nombre,
										descripcion: cfgT.ct_map.tipo.descripcion || null,
								  }
								: null,
					  }
					: null,
				cfg_a: cfgAs.map(item => ({
					id: item.id,
					cfg_t_id: item.cfg_t_id,
					aspecto_id: item.aspecto_id,
					orden: item.orden,
					es_activo: item.es_activo ?? true,
					aspecto: item.ca_map?.aspecto
						? {
								id: item.ca_map.aspecto.id,
								nombre: item.ca_map.aspecto.nombre,
								descripcion: item.ca_map.aspecto.descripcion || null,
						  }
						: null,
				})),
				cfg_e: cfgEs.map(item => ({
					id: item.id,
					cfg_t_id: item.cfg_t_id,
					escala_id: item.escala_id,
					puntaje: item.puntaje,
					orden: item.orden,
					es_activo: item.es_activo ?? true,
					escala: item.ce_map?.escala
						? {
								id: item.ce_map.escala.id,
								sigla: item.ce_map.escala.sigla,
								nombre: item.ce_map.escala.nombre,
								descripcion: item.ce_map.escala.descripcion || null,
						  }
						: null,
				})),
			});
		}

		return results;
	}

	async findCfgAAndCfgEByCfgTId(cfgTId) {
		const cfgT = await prisma.cfg_t.findUnique({
			where: { id: cfgTId },
			include: {
				tipo_form: {
					select: { id: true, nombre: true }
				},
				ct_map: {
					include: {
						cat_t: true,
						tipo: true
					}
				}
			}
		});

		if (!cfgT) {
			return null;
		}

		const [cfgAs, cfgEs] = await Promise.all([
			prisma.cfg_a.findMany({
				where: { cfg_t_id: cfgTId },
				include: { ca_map: { include: { aspecto: true } } },
				orderBy: { orden: 'asc' },
			}),
			prisma.cfg_e.findMany({
				where: { cfg_t_id: cfgTId },
				include: { ce_map: { include: { escala: true } } },
				orderBy: { orden: 'asc' },
			}),
		]);

		return {
			tipo_form: cfgT.tipo_form,
			es_cmt_gen: cfgT.es_cmt_gen,
			es_cmt_gen_oblig: cfgT.es_cmt_gen_oblig,
			tipo_evaluacion: cfgT.ct_map
				? {
						id: cfgT.ct_map.id,
						categoria: cfgT.ct_map.cat_t
							? {
									id: cfgT.ct_map.cat_t.id,
									nombre: cfgT.ct_map.cat_t.nombre,
									descripcion: cfgT.ct_map.cat_t.descripcion || null,
							  }
							: null,
						tipo: cfgT.ct_map.tipo
							? {
									id: cfgT.ct_map.tipo.id,
									nombre: cfgT.ct_map.tipo.nombre,
									descripcion: cfgT.ct_map.tipo.descripcion || null,
							  }
							: null,
				  }
				: null,
			cfg_a: cfgAs.map(item => ({
				id: item.id,
				cfg_t_id: item.cfg_t_id,
				aspecto_id: item.aspecto_id,
				orden: item.orden,
				es_activo: item.es_activo ?? true,
				aspecto: item.ca_map?.aspecto
					? {
							id: item.ca_map.aspecto.id,
							nombre: item.ca_map.aspecto.nombre,
							descripcion: item.ca_map.aspecto.descripcion || null,
					  }
					: null,
			})),
			cfg_e: cfgEs.map(item => ({
				id: item.id,
				cfg_t_id: item.cfg_t_id,
				escala_id: item.escala_id,
				puntaje: item.puntaje,
				orden: item.orden,
				es_activo: item.es_activo ?? true,
				escala: item.ce_map?.escala
					? {
							id: item.ce_map.escala.id,
							sigla: item.ce_map.escala.sigla,
							nombre: item.ce_map.escala.nombre,
							descripcion: item.ce_map.escala.descripcion || null,
					  }
					: null,
			})),
		};
	}

	async findCfgTListByUserRoles(userAppRoleIds = [], userAuthRoleIds = [], isAdmin = false, hasRole2 = false, isEstudiante = false, search = {}, sort = {}) {
		let results;
		if (isAdmin) {
			results = await this.#getAllCfgTs();
		} else if (hasRole2) {
			results = await this.#getAllActiveCfgTs();
		} else {
			results = await this.#getCfgTsByUserRoles(userAppRoleIds, userAuthRoleIds);
			results = await this.#includeRelatedCfgTs(results, userAppRoleIds, userAuthRoleIds);
		}

		// No filtrar por fecha_fin si el usuario es admin
		if (isEstudiante && !isAdmin) {
			const now = new Date();
			results = results.filter(item => {
				if (!item?.fecha_fin) return true;
				const fechaFin = new Date(item.fecha_fin);
				if (Number.isNaN(fechaFin.getTime())) return true;
				return fechaFin >= now;
			});
		}
		
		// Aplicar búsqueda
		if (search?.isActive && search?.term) {
			results = this.#applySearch(results, search);
		}
		
		// Aplicar ordenamiento
		if (sort?.sortBy && sort?.sortOrder) {
			results = this.#applySort(results, sort);
		}

		results = await this.#enrichCfgTsWithScopesAndRelation(results);
		
		return results;
	}

	async #includeRelatedCfgTs(cfgTs = [], userAppRoleIds = [], userAuthRoleIds = []) {
		if (!Array.isArray(cfgTs) || cfgTs.length === 0) return cfgTs;

		const cfgTIds = cfgTs
			.map(cfg => Number(cfg?.id))
			.filter(Boolean);

		if (!cfgTIds.length) return cfgTs;

		const relations = await prisma.cfg_t_rel.findMany({
			where: {
				OR: [
					{ cfg_eval_id: { in: cfgTIds } },
					{ cfg_autoeval_id: { in: cfgTIds } },
				],
			},
		});

		if (!relations.length) return cfgTs;

		const currentIdsSet = new Set(cfgTIds.map(String));
		const relatedIds = new Set();

		for (const relation of relations) {
			if (relation?.cfg_eval_id != null && !currentIdsSet.has(String(relation.cfg_eval_id))) {
				relatedIds.add(relation.cfg_eval_id);
			}
			if (relation?.cfg_autoeval_id != null && !currentIdsSet.has(String(relation.cfg_autoeval_id))) {
				relatedIds.add(relation.cfg_autoeval_id);
			}
		}

		if (!relatedIds.size) return cfgTs;

		const relatedCfgTs = await prisma.cfg_t.findMany({
			where: { id: { in: Array.from(relatedIds) } },
			include: {
				tipo_form: {
					select: { id: true, nombre: true }
				},
				ct_map: {
					include: {
						cat_t: true,
						tipo: true
					}
				}
			},
		});

		if (!relatedCfgTs.length) return cfgTs;

		const relatedWithRoles = await this.#enrichCfgTsWithRoles(relatedCfgTs);

		const userAppRoleIdsSet = new Set((userAppRoleIds || []).map(String));
		const userAuthRoleIdsSet = new Set((userAuthRoleIds || []).map(String));

		const relatedFilteredByUserRole = relatedWithRoles.filter(cfgT =>
			cfgT.rolesRequeridos?.some(({ rol_origen_id, origen }) => {
				const roleId = String(rol_origen_id);
				return origen === 'APP' ? userAppRoleIdsSet.has(roleId) : userAuthRoleIdsSet.has(roleId);
			})
		);

		return [...cfgTs, ...relatedFilteredByUserRole];
	}

	async #enrichCfgTsWithScopesAndRelation(cfgTs = []) {
		if (!Array.isArray(cfgTs) || cfgTs.length === 0) return cfgTs;

		const cfgTIds = cfgTs
			.map(cfg => Number(cfg?.id))
			.filter(Boolean);

		if (!cfgTIds.length) {
			return cfgTs.map(cfg => ({
				...cfg,
				scopes: [],
				cfg_t_rel: null,
			}));
		}

		const [scopes, relations] = await Promise.all([
			prisma.cfg_t_scope.findMany({
				where: { cfg_t_id: { in: cfgTIds } },
				include: {
					sede: { select: { id: true, nombre: true } },
					periodo: { select: { id: true, nombre: true } },
					programa: { select: { id: true, nombre: true } },
					smstre: { select: { id: true, nombre: true } },
					grp: { select: { id: true, nombre: true } },
				},
				orderBy: { id: 'asc' },
			}),
			prisma.cfg_t_rel.findMany({
				where: {
					OR: [
						{ cfg_eval_id: { in: cfgTIds } },
						{ cfg_autoeval_id: { in: cfgTIds } },
					],
				},
			}),
		]);

		const scopesByCfgTId = new Map();
		for (const scope of scopes) {
			if (!scopesByCfgTId.has(scope.cfg_t_id)) {
				scopesByCfgTId.set(scope.cfg_t_id, []);
			}

			scopesByCfgTId.get(scope.cfg_t_id).push({
				id: scope.id,
				cfg_t_id: scope.cfg_t_id,
				sede_id: scope.sede_id,
				sede_nombre: scope.sede?.nombre || null,
				periodo_id: scope.periodo_id,
				periodo_nombre: scope.periodo?.nombre || null,
				programa_id: scope.programa_id,
				programa_nombre: scope.programa?.nombre || null,
				semestre_id: scope.semestre_id,
				semestre_nombre: scope.smstre?.nombre || null,
				grupo_id: scope.grupo_id,
				grupo_nombre: scope.grp?.nombre || null,
			});
		}

		const relationByCfgTId = new Map();
		for (const relation of relations) {
			relationByCfgTId.set(relation.cfg_eval_id, {
				id: relation.id,
				cfg_eval_id: relation.cfg_eval_id,
				cfg_autoeval_id: relation.cfg_autoeval_id,
				pareja_cfg_t_id: relation.cfg_autoeval_id,
				rol_en_rel: 'EVAL',
			});

			relationByCfgTId.set(relation.cfg_autoeval_id, {
				id: relation.id,
				cfg_eval_id: relation.cfg_eval_id,
				cfg_autoeval_id: relation.cfg_autoeval_id,
				pareja_cfg_t_id: relation.cfg_eval_id,
				rol_en_rel: 'AUTOEVAL',
			});
		}

		return cfgTs.map(cfg => ({
			...cfg,
			scopes: scopesByCfgTId.get(cfg.id) || [],
			cfg_t_rel: relationByCfgTId.get(cfg.id) || null,
		}));
	}

	async #getAllCfgTs() {
		const allCfgTs = await prisma.cfg_t.findMany({
			include: {
				tipo_form: {
					select: { id: true, nombre: true }
				},
				ct_map: {
					include: {
						cat_t: true,
						tipo: true
					}
				}
			},
			orderBy: { fecha_actualizacion: 'desc' },
		});
		return this.#enrichCfgTsWithRoles(allCfgTs);
	}

	async #getAllActiveCfgTs() {
		const activeCfgTs = await prisma.cfg_t.findMany({
			where: { es_activo: true },
			include: {
				tipo_form: {
					select: { id: true, nombre: true }
				},
				ct_map: {
					include: {
						cat_t: true,
						tipo: true
					}
				}
			},
			orderBy: { fecha_actualizacion: 'desc' },
		});
		return this.#enrichCfgTsWithRoles(activeCfgTs);
	}

	async #getCfgTsByUserRoles(userAppRoleIds = [], userAuthRoleIds = []) {
		const cfgTRoles = await prisma.cfg_t_rol.findMany({
			include: {
				cfg_t: {
					include: {
						tipo_form: {
							select: { id: true, nombre: true }
						},
						ct_map: {
							include: {
								cat_t: true,
								tipo: true
							}
						}
					}
				},
				rol_mix: true,
			},
		});

		const cfgTMap = new Map();
		for (const cfgTRol of cfgTRoles) {
			const { cfg_t: cfgT, rol_mix } = cfgTRol;
			if (!cfgTMap.has(cfgT.id)) {
				cfgTMap.set(cfgT.id, {
					...this.#mapCfgT(cfgT),
					rolesRequeridos: [],
				});
			}
			if (rol_mix) {
				const currentRoles = cfgTMap.get(cfgT.id).rolesRequeridos;
				const alreadyExists = currentRoles.some(
					role => role.rol_mix_id === rol_mix.id
				);

				if (!alreadyExists) {
					currentRoles.push({
						rol_mix_id: rol_mix.id,
						nombre: rol_mix.nombre ?? null,
						rol_origen_id: rol_mix.rol_origen_id,
						origen: rol_mix.origen,
					});
				}
			}
		}

		const userAppRoleIdsSet = new Set((userAppRoleIds || []).map(String));
		const userAuthRoleIdsSet = new Set((userAuthRoleIds || []).map(String));

		return Array.from(cfgTMap.values())
			.filter(cfgT =>
				cfgT.rolesRequeridos.some(({ rol_origen_id, origen }) => {
					const roleId = String(rol_origen_id);
					return origen === 'APP' ? userAppRoleIdsSet.has(roleId) : userAuthRoleIdsSet.has(roleId);
				})
			)
			.sort((a, b) => new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion));
	}

	#mapCfgT(cfgT) {
		return {
			id: cfgT.id,
			tipo_id: cfgT.tipo_id,
			tipo_form: cfgT.tipo_form,
			fecha_inicio: cfgT.fecha_inicio,
			fecha_fin: cfgT.fecha_fin,
			es_cmt_gen: cfgT.es_cmt_gen,
			es_cmt_gen_oblig: cfgT.es_cmt_gen_oblig,
			es_activo: cfgT.es_activo,
			fecha_creacion: cfgT.fecha_creacion,
			fecha_actualizacion: cfgT.fecha_actualizacion,
			tipo_evaluacion: cfgT.ct_map
				? {
						id: cfgT.ct_map.id,
						categoria: cfgT.ct_map.cat_t
							? {
									id: cfgT.ct_map.cat_t.id,
									nombre: cfgT.ct_map.cat_t.nombre,
									descripcion: cfgT.ct_map.cat_t.descripcion || null,
							  }
							: null,
						tipo: cfgT.ct_map.tipo
							? {
									id: cfgT.ct_map.tipo.id,
									nombre: cfgT.ct_map.tipo.nombre,
									descripcion: cfgT.ct_map.tipo.descripcion || null,
							  }
							: null,
				  }
				: null,
		};
	}

	async #enrichCfgTsWithRoles(cfgTs) {
		// Obtener todos los roles requeridos para todos los cfg_ts
		const cfgTIds = cfgTs.map(c => c.id);
		const cfgTRoles = await prisma.cfg_t_rol.findMany({
			where: { cfg_t_id: { in: cfgTIds } },
			include: { rol_mix: true },
		});

		// Crear un mapa de roles por cfg_t_id
		const rolesMap = new Map();
		for (const cfgTRole of cfgTRoles) {
			if (!rolesMap.has(cfgTRole.cfg_t_id)) {
				rolesMap.set(cfgTRole.cfg_t_id, []);
			}
			if (cfgTRole.rol_mix) {
				const currentRoles = rolesMap.get(cfgTRole.cfg_t_id);
				const alreadyExists = currentRoles.some(
					role => role.rol_mix_id === cfgTRole.rol_mix.id
				);

				if (!alreadyExists) {
					currentRoles.push({
						rol_mix_id: cfgTRole.rol_mix.id,
						nombre: cfgTRole.rol_mix.nombre ?? null,
						rol_origen_id: cfgTRole.rol_mix.rol_origen_id,
						origen: cfgTRole.rol_mix.origen,
					});
				}
			}
		}

		// Enriquecer cada cfg_t con sus roles requeridos
		return cfgTs.map(cfgT => ({
			...this.#mapCfgT(cfgT),
			rolesRequeridos: rolesMap.get(cfgT.id) || [],
		}));
	}

	#applySearch(results, search) {
		const { term, fields, caseSensitive } = search;
		const searchTerm = caseSensitive ? term : term.toLowerCase();
		
		return results.filter(item => {
			// Buscar en nombre de categoría
			const categoriaNombre = item.tipo_evaluacion?.categoria?.nombre || '';
			const categoriaDesc = item.tipo_evaluacion?.categoria?.descripcion || '';
			
			// Buscar en nombre de tipo
			const tipoNombre = item.tipo_evaluacion?.tipo?.nombre || '';
			const tipoDesc = item.tipo_evaluacion?.tipo?.descripcion || '';
			
			const searchableText = caseSensitive
				? `${categoriaNombre} ${categoriaDesc} ${tipoNombre} ${tipoDesc}`
				: `${categoriaNombre} ${categoriaDesc} ${tipoNombre} ${tipoDesc}`.toLowerCase();
			
			return searchableText.includes(searchTerm);
		});
	}

	#applySort(results, sort) {
		const { sortBy, sortOrder } = sort;
		const order = sortOrder === 'desc' ? -1 : 1;
		
		return [...results].sort((a, b) => {
			let aVal, bVal;
			
			if (sortBy === 'nombre') {
				// Ordenar por nombre de tipo de evaluación
				aVal = a.tipo_evaluacion?.tipo?.nombre || '';
				bVal = b.tipo_evaluacion?.tipo?.nombre || '';
				return order * aVal.localeCompare(bVal);
			} else if (sortBy === 'fecha_inicio') {
				aVal = new Date(a.fecha_inicio || 0);
				bVal = new Date(b.fecha_inicio || 0);
				return order * (aVal - bVal);
			} else {
				// Por defecto ordenar por id
				aVal = a.id || 0;
				bVal = b.id || 0;
				return order * (aVal - bVal);
			}
		});
	}

	async findRolesByCfgTId(cfgTId) {
		const cfgTRoles = await prisma.cfg_t_rol.findMany({
			where: { cfg_t_id: cfgTId },
			include: { rol_mix: true },
		});

		const uniqueRoles = new Map();
		for (const cfgTRol of cfgTRoles) {
			if (!cfgTRol.rol_mix?.id) continue;
			if (!uniqueRoles.has(cfgTRol.rol_mix.id)) {
				uniqueRoles.set(cfgTRol.rol_mix.id, {
					id: cfgTRol.id,
					rol_mix_id: cfgTRol.rol_mix.id,
					rol_origen_id: cfgTRol.rol_mix.rol_origen_id ?? null,
					nombre: cfgTRol.rol_mix.nombre ?? null,
					origen: cfgTRol.rol_mix.origen ?? null,
				});
			}
		}

		return Array.from(uniqueRoles.values());
	}

	async findEvaluacionesByCfgTAndUser(cfgTId, username, { isDocente, isEstudiante }) {
		const configId = Number(cfgTId);
		const userId = String(username);

		if (!configId || !userId) return [];

		const where = {
			id_configuracion: configId,
		};

		if (isEstudiante) {
			where.estudiante = userId;
		} else if (isDocente) {
			where.docente = userId;
		} else {
			return [];
		}

		const rows = await prisma.eval.findMany({
			where,
			select: {
				id: true,
				id_configuracion: true,
				estudiante: true,
				docente: true,
				codigo_materia: true,
			cfg_t: { select: { tipo_form: { select: { id: true, nombre: true } } } },
				eval_det: { select: { id: true }, take: 1 },
			},
			orderBy: { id: 'asc' },
		});

		const baseResults = rows.map(row => ({
			id: row.id,
			id_configuracion: row.id_configuracion,
			estudiante: row.estudiante,
			docente: row.docente,
			codigo_materia: row.codigo_materia,
			tipo_form: row.cfg_t?.tipo_form ?? null,
			es_finalizada: row.eval_det && row.eval_det.length > 0,
		}));

		return this.enrichWithNames(baseResults);
	}

	async enrichWithNames(results) {
		if (!results || results.length === 0) return results;

		// Collect unique pairs for lookup
		// For evaluations: docente + codigo_materia
		// For student self-evaluation: estudiante + codigo_materia
		const docentePairs = results
			.filter(r => r.docente && r.codigo_materia)
			.map(r => ({ docente: r.docente, codigo: parseInt(r.codigo_materia) }));

		const estudiantePairs = results
			.filter(r => r.estudiante && r.codigo_materia && !r.docente)
			.map(r => ({ estudiante: r.estudiante, codigo: parseInt(r.codigo_materia) }));

		if (docentePairs.length === 0 && estudiantePairs.length === 0) return results;

		// Query vista_academica_insitus to get names, programa, and semestre
		const whereConditions = [];
		
		// Add conditions for docente-materia pairs
		if (docentePairs.length > 0) {
			whereConditions.push(...docentePairs.map(p => ({
				ID_DOCENTE: p.docente,
				COD_ASIGNATURA: p.codigo
			})));
		}

		// Add conditions for estudiante-materia pairs
		if (estudiantePairs.length > 0) {
			whereConditions.push(...estudiantePairs.map(p => ({
				ID_ESTUDIANTE: p.estudiante,
				COD_ASIGNATURA: p.codigo
			})));
		}

		const vistaData = await userPrisma.vista_academica_insitus.findMany({
			where: {
				OR: whereConditions
			},
			select: {
				ID_DOCENTE: true,
				ID_ESTUDIANTE: true,
				DOCENTE: true,
				COD_ASIGNATURA: true,
				ASIGNATURA: true,
				NOM_PROGRAMA: true,
				SEMESTRE: true
			}
		});

		// Create lookup maps
		// Key format: "docente_codigo" or "estudiante_codigo"
		const lookupMapDocente = new Map();
		const lookupMapEstudiante = new Map();
		
		vistaData.forEach(v => {
			// For docente-materia pairs
			if (v.ID_DOCENTE && v.COD_ASIGNATURA) {
				const key = `${v.ID_DOCENTE}_${v.COD_ASIGNATURA}`;
				if (!lookupMapDocente.has(key)) {
					lookupMapDocente.set(key, {
						nombre_docente: v.DOCENTE,
						nombre_materia: v.ASIGNATURA,
						programas: [],
						semestres: []
					});
				}
				const entry = lookupMapDocente.get(key);
				if (v.NOM_PROGRAMA) entry.programas.push(v.NOM_PROGRAMA);
				if (v.SEMESTRE) entry.semestres.push(v.SEMESTRE);
			}

			// For estudiante-materia pairs (self-evaluation)
			if (v.ID_ESTUDIANTE && v.COD_ASIGNATURA) {
				const key = `${v.ID_ESTUDIANTE}_${v.COD_ASIGNATURA}`;
				if (!lookupMapEstudiante.has(key)) {
					lookupMapEstudiante.set(key, {
						nombre_docente: v.DOCENTE, // Still include docente name for context
						nombre_materia: v.ASIGNATURA,
						programas: [],
						semestres: []
					});
				}
				const entry = lookupMapEstudiante.get(key);
				if (v.NOM_PROGRAMA) entry.programas.push(v.NOM_PROGRAMA);
				if (v.SEMESTRE) entry.semestres.push(v.SEMESTRE);
			}
		});

		// Enrich results with names and most frequent programa/semestre
		return results.map(r => {
			let data = null;

			// Try to find data by docente + codigo_materia
			if (r.docente && r.codigo_materia) {
				const key = `${r.docente}_${r.codigo_materia}`;
				data = lookupMapDocente.get(key);
			}
			// If not found, try by estudiante + codigo_materia (self-evaluation)
			else if (r.estudiante && r.codigo_materia) {
				const key = `${r.estudiante}_${r.codigo_materia}`;
				data = lookupMapEstudiante.get(key);
			}

			return {
				...r,
				nombre_docente: data?.nombre_docente || null,
				nombre_materia: data?.nombre_materia || null,
				nom_programa: getMostFrequent(data?.programas) || null,
				semestre: getMostFrequent(data?.semestres) || null
			};
		});
	}

	async findScopeWithNamesByCfgTId(cfgTId) {
		const scopes = await prisma.cfg_t_scope.findMany({
			where: { cfg_t_id: cfgTId },
			include: {
				sede: { select: { id: true, nombre: true } },
				periodo: { select: { id: true, nombre: true } },
				programa: { select: { id: true, nombre: true } },
				smstre: { select: { id: true, nombre: true } },
				grp: { select: { id: true, nombre: true } },
			},
			orderBy: { id: 'asc' },
		});

		return scopes.map(scope => ({
			id: scope.id,
			cfg_t_id: scope.cfg_t_id,
			sede_id: scope.sede_id,
			sede_nombre: scope.sede?.nombre || null,
			periodo_id: scope.periodo_id,
			periodo_nombre: scope.periodo?.nombre || null,
			programa_id: scope.programa_id,
			programa_nombre: scope.programa?.nombre || null,
			semestre_id: scope.semestre_id,
			semestre_nombre: scope.smstre?.nombre || null,
			grupo_id: scope.grupo_id,
			grupo_nombre: scope.grp?.nombre || null,
		}));
	}
}

module.exports = CfgTRepository;
