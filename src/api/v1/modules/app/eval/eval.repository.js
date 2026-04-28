const { prisma } = require('@config/prisma');

class EvalRepository {
	constructor() {
		this.model = prisma.eval;
		this.cfgModel = prisma.cfg_t;
	}

	getDelegate(tx) {
		return tx ? tx.eval : this.model;
	}

	getConfigWithType(configId) {
		return this.cfgModel.findUnique({
			where: { id: Number(configId) },
			include: { 
				tipo_form: { select: { id: true, nombre: true } },
				ct_map: { include: { tipo: true } } 
			}
		});
	}

	findExisting({ id_configuracion, estudiante = null, docente = null, codigo_materia = null }, tx) {
		const delegate = this.getDelegate(tx);
		return delegate.findFirst({
			where: {
				id_configuracion: Number(id_configuracion),
				estudiante: estudiante ?? undefined,
				docente: docente ?? undefined,
				codigo_materia: codigo_materia ?? undefined,
			}
		});
	}

	create(data, tx) {
		const delegate = this.getDelegate(tx);
		return delegate.create({ data });
	}

	async hasExistingEvaluations(configId, username, isStudent) {
		const count = await this.model.count({
			where: {
				id_configuracion: Number(configId),
				...(isStudent ? { estudiante: String(username) } : { docente: String(username) })
			}
		});
		return count > 0;
	}
}

module.exports = EvalRepository;

