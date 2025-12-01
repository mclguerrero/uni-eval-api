// Multi-DB Prisma clients setup
// Local (migrations + write), Remote Auth (read-only), Remote User (read-only)

// NOTE: Generated Prisma client outputs reside in this same directory (./local, ./auth, ./user)
// The previous relative paths pointed one level up incorrectly (../prisma/*) causing module resolution errors.
const { PrismaClient: LocalPrismaClient } = require('./local');
const { PrismaClient: AuthPrismaClient } = require('./auth');
const { PrismaClient: UserPrismaClient } = require('./user'); 

// Helper to wrap a Prisma client and block mutating operations
function makeReadOnly(prisma, label) {
  const writeOps = [
    'create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'
  ];

  return new Proxy(prisma, {
    get(target, prop) {
      const original = target[prop];

      // Block raw execute that can mutate
      if (['$executeRaw', '$runCommandRaw'].includes(prop)) {
        return () => { throw new Error(`Write raw operation blocked on read-only client (${label}).`); };
      }

      // Intercept models (delegates)
      if (typeof original === 'object' && original !== null) {
        return new Proxy(original, {
          get(modelTarget, op) {
            if (writeOps.includes(op)) {
              return () => { throw new Error(`Operation ${op} blocked on read-only client (${label}).`); };
            }
            return modelTarget[op];
          }
        });
      }

      return original;
    }
  });
}

// Instantiate clients
const localPrisma = new LocalPrismaClient();
const authPrisma = makeReadOnly(new AuthPrismaClient(), 'AUTH');
const userPrisma = makeReadOnly(new UserPrismaClient(), 'USER'); 

module.exports = {
  localPrisma,
  authPrisma,
  userPrisma, // Export actualizado
  // Helper to gracefully close all connections (e.g., on process shutdown)
  disconnectAll: () => Promise.all([
    localPrisma.$disconnect(),
    authPrisma.$disconnect(),
    userPrisma.$disconnect() 
  ])
};
