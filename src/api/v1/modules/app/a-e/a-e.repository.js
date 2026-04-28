const { prisma } = require('@config/prisma');

async function createMany(rows) {
	// Use skipDuplicates to avoid violating unique constraints if any composite unique exists
	const result = await prisma.a_e.createMany({ data: rows, skipDuplicates: true });
	return { count: result.count ?? result }; // Prisma may return number or object depending on version
}

async function deleteByAspectoIdAndCfgT(aspectoId, cfgTId) {
	// Delete all a_e records for a specific aspecto scoped to cfg_t_id
	const cfgA = await prisma.cfg_a.findUnique({
		where: { id: aspectoId },
		select: { cfg_t_id: true }
	});

	if (!cfgA) {
		throw new Error(`Aspecto_id ${aspectoId} does not exist`);
	}

	if (cfgA.cfg_t_id !== cfgTId) {
		throw new Error(
			`Aspecto_id ${aspectoId} does not belong to configuration ${cfgTId} (belongs to ${cfgA.cfg_t_id})`
		);
	}

	const result = await prisma.a_e.deleteMany({
		where: {
			aspecto_id: aspectoId,
			cfg_a: { cfg_t_id: cfgTId }
		}
	});
	return { count: result.count ?? result };
}

async function updateAspectoId(oldAspectoId, newAspectoId, cfgTId) {
	// First, validate that oldAspectoId belongs to the specified cfg_t_id
	const oldCfgA = await prisma.cfg_a.findUnique({
		where: { id: oldAspectoId },
		select: { cfg_t_id: true }
	});

	if (!oldCfgA) {
		throw new Error(`Old aspecto_id ${oldAspectoId} does not exist`);
	}

	if (oldCfgA.cfg_t_id !== cfgTId) {
		throw new Error(
			`Old aspecto_id ${oldAspectoId} does not belong to configuration ${cfgTId} (belongs to ${oldCfgA.cfg_t_id})`
		);
	}

	// Validate that newAspectoId belongs to the same cfg_t_id
	const newCfgA = await prisma.cfg_a.findUnique({
		where: { id: newAspectoId },
		select: { cfg_t_id: true }
	});

	if (!newCfgA) {
		throw new Error(`New aspecto_id ${newAspectoId} does not exist`);
	}

	if (newCfgA.cfg_t_id !== cfgTId) {
		throw new Error(
			`New aspecto_id ${newAspectoId} does not belong to configuration ${cfgTId} (belongs to ${newCfgA.cfg_t_id})`
		);
	}

	// Now safely update aspecto_id only for records with the old aspecto_id
	// (which we've confirmed belongs to the specified cfg_t_id)
	const result = await prisma.a_e.updateMany({
		where: { aspecto_id: oldAspectoId },
		data: { aspecto_id: newAspectoId }
	});
	return { count: result.count ?? result };
}

module.exports = { createMany, deleteByAspectoIdAndCfgT, updateAspectoId };
