const { localPrisma, authPrisma, userPrisma } = require('../prisma/clients');

module.exports = { prisma: localPrisma, localPrisma, authPrisma, userPrisma };
