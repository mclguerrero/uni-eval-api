const { prisma } = require('@config/prisma');

class EvalDetRepository {
	async getGeneralCommentFlags(evalId) {
		const row = await prisma.eval.findUnique({
			where: { id: evalId },
			select: {
				id: true,
				id_configuracion: true,
				cfg_t: { select: { es_cmt_gen: true, es_cmt_gen_oblig: true } }
			}
		});
		return row?.cfg_t || { es_cmt_gen: false, es_cmt_gen_oblig: false };
	}
	async getAEFlagsByIds(aeIds) {
		if (!aeIds.length) return [];
		return prisma.a_e.findMany({
			where: { id: { in: aeIds } },
			select: { id: true, es_cmt: true, es_cmt_oblig: true }
		});
	}

	async createMany(evalId, items, cmtGen) {
		if (!items.length) return { count: 0 };
		return prisma.$transaction(async (tx) => {
			if (typeof cmtGen !== 'undefined') {
				await tx.eval.update({ where: { id: evalId }, data: { cmt_gen: cmtGen ?? null } });
			}
			return tx.eval_det.createMany({
				data: items.map(it => ({ eval_id: evalId, a_e_id: it.a_e_id, cmt: it.cmt ?? null }))
			});
		});
	}
}

module.exports = EvalDetRepository;
