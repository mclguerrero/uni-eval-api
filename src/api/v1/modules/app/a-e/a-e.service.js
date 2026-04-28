const repo = require('./a-e.repository');

// Normalize an array that may contain numbers or objects into consistent shape
function normalizeIdsOrObjects(arr, type) {
	if (!Array.isArray(arr)) return [];
	if (type === 'aspecto') {
		return arr.map(a => {
			if (typeof a === 'number') return { id: a, es_cmt: undefined, es_cmt_oblig: undefined };
			return { id: a?.id ?? null, es_cmt: a?.es_cmt, es_cmt_oblig: a?.es_cmt_oblig };
		}).filter(x => x.id !== null);
	}
	if (type === 'escala') {
		return arr.map(e => {
			if (typeof e === 'number') return { id: e };
			return { id: e?.id ?? null };
		});
	}
	return [];
}

async function bulkAERows(items) {
	// Build cartesian product records for each item
	const rows = [];
	for (const item of items) {
		const aspectos = normalizeIdsOrObjects(item.aspectos, 'aspecto');
		const escalas = normalizeIdsOrObjects(item.escalas, 'escala');
		const isOpen = !!item.es_pregunta_abierta;

		for (const asp of aspectos) {
			if (isOpen) {
				// For open questions, allow escala_id to be null (when provided as {id: null})
				const escalaCandidates = escalas.length ? escalas : [{ id: null }];
				for (const esc of escalaCandidates) {
					rows.push({
						aspecto_id: asp.id,
						escala_id: esc.id === null ? null : esc.id,
						es_cmt: asp.es_cmt ?? true,
						es_cmt_oblig: asp.es_cmt_oblig ?? false,
					});
				}
			} else {
				// Closed (normal) questions -> combine with all escala ids (must be numbers)
				for (const esc of escalas) {
					if (esc.id == null) continue;
					rows.push({
						aspecto_id: asp.id,
						escala_id: esc.id,
						es_cmt: asp.es_cmt ?? true,
						es_cmt_oblig: asp.es_cmt_oblig ?? false,
					});
				}
			}
		}
	}

	if (!rows.length) return { count: 0 };
	return await repo.createMany(rows);
}

async function deleteAspectoWithEscalas(aspectoId, cfgTId) {
	// Delete an aspecto and all its associated escalas from a_e table scoped to cfg_t_id
	if (!aspectoId || !cfgTId) {
		throw new Error('aspecto_id and cfg_t_id are required');
	}
	return await repo.deleteByAspectoIdAndCfgT(aspectoId, cfgTId);
}

async function updateAspectoIdInAllEscalas(oldAspectoId, newAspectoId, cfgTId) {
	// Update aspecto_id in all records keeping all escalas unchanged
	// Requires cfg_t_id to ensure update is scoped to a specific configuration
	if (!oldAspectoId || !newAspectoId || !cfgTId) {
		throw new Error('old aspecto_id, new aspecto_id and cfg_t_id are all required');
	}
	if (oldAspectoId === newAspectoId) {
		throw new Error('Old and new aspecto_id cannot be the same');
	}
	return await repo.updateAspectoId(oldAspectoId, newAspectoId, cfgTId);
}

module.exports = { bulkAERows, deleteAspectoWithEscalas, updateAspectoIdInAllEscalas };
