const { prisma } = require('@config/prisma');

class BulkCfgRepository {
	async bulkInsertCfgA(cfg_t_id, items) {
		const payloads = items.map((it) => ({
			cfg_t_id,
			aspecto_id: it.aspecto_id,
			orden: it.orden,
			es_activo: it.es_activo,
		}));
		const result = await prisma.$transaction(
			payloads.map((data) => prisma.cfg_a.create({ data }))
		);
		return result;
	}

	async bulkInsertCfgE(cfg_t_id, items) {
		const payloads = items.map((it) => ({
			cfg_t_id,
			escala_id: it.escala_id,
			puntaje: it.puntaje,
			orden: it.orden,
			es_activo: it.es_activo,
		}));
		const result = await prisma.$transaction(
			payloads.map((data) => prisma.cfg_e.create({ data }))
		);
		return result;
	}
}

module.exports = BulkCfgRepository;
