const { prisma } = require('@config/prisma');

async function createMany(rows) {
	// Use skipDuplicates to avoid violating unique constraints if any composite unique exists
	const result = await prisma.a_e.createMany({ data: rows, skipDuplicates: true });
	return { count: result.count ?? result }; // Prisma may return number or object depending on version
}

module.exports = { createMany };
