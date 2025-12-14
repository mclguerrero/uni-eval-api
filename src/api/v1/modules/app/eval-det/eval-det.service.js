const AppError = require('@utils/AppError');

class EvalDetService {
	constructor(repository) {
		this.repository = repository;
	}

	async saveBulk({ eval_id, items, cmt_gen }) {
		if (!eval_id || !Array.isArray(items)) {
			throw new AppError('Datos inválidos: eval_id e items son requeridos', 400);
		}
		if (!items.length) return { count: 0 };

		const aeIds = items.map(i => Number(i.a_e_id)).filter(Boolean);
		if (!aeIds.length) throw new AppError('Items sin a_e_id', 400);

		const flags = await this.repository.getAEFlagsByIds(aeIds);
		const flagById = new Map(flags.map(f => [f.id, f]));

		// Validate comment requirements per a_e
		for (const it of items) {
			const meta = flagById.get(Number(it.a_e_id));
			if (!meta) throw new AppError(`a_e_id ${it.a_e_id} no encontrado`, 400);
			const comment = (it.cmt ?? '').trim();
			if (meta.es_cmt_oblig && !comment) {
				throw new AppError(`Comentario obligatorio para a_e_id ${it.a_e_id}`, 400);
			}
			// If comments disabled at this aspecto, nullify any provided comment
			if (!meta.es_cmt) {
				it.cmt = null;
			}
		}

		// Validate general comment according to cfg_t flags
		const genFlags = await this.repository.getGeneralCommentFlags(Number(eval_id));
		if (genFlags.es_cmt_gen_oblig) {
			const gc = (cmt_gen ?? '').trim();
			if (!gc) throw new AppError('Comentario general obligatorio', 400);
		}
		// If general comments disabled, ignore any provided
		if (!genFlags.es_cmt_gen) {
			cmt_gen = null;
		}

		return this.repository.createMany(Number(eval_id), items, cmt_gen);
	}
}

module.exports = EvalDetService;
