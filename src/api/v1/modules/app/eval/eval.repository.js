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
			include: { ct_map: { include: { tipo: true } } }
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
}

module.exports = EvalRepository;

