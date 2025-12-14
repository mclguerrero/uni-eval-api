const { prisma } = require('@config/prisma');

class CfgTRepository {
	async findAspectosEscalasByCfgTId(cfgTId) {
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
		const result = Array.from(byAspecto.values()).sort((a, b) => {
			const ao = a.orden ?? 0;
			const bo = b.orden ?? 0;
			return ao === bo ? a.id - b.id : ao - bo;
		});

		// Sort opciones (escalas) inside each aspecto by cfg_e.orden ascending
		for (const aspecto of result) {
			if (Array.isArray(aspecto.opciones)) {
				aspecto.opciones.sort((o1, o2) => {
					const a = o1.orden ?? 0;
					const b = o2.orden ?? 0;
					return a === b ? (o1.id ?? 0) - (o2.id ?? 0) : a - b;
				});
			}
		}

		return result;
	}
}

module.exports = CfgTRepository;
