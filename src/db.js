const { localPrisma, userPrisma, authPrisma } = require('./prisma/clients');
const messages = require('@constants/db-messages');

const PRISMA_CLIENTS = [
  { name: 'local', client: localPrisma, ok: messages.DB_LOCAL_OK, err: messages.DB_LOCAL_ERR },
  { name: 'user', client: userPrisma, ok: messages.DB_USER_OK, err: messages.DB_USER_ERR },
  { name: 'auth', client: authPrisma, ok: messages.DB_AUTH_OK, err: messages.DB_AUTH_ERR }
];

async function initializeDatabase() {
  console.log(messages.DB_INIT_START);

  for (const { client, ok, err } of PRISMA_CLIENTS) {
    try {
      await client.$queryRaw`SELECT 1 as health`;
      console.log(ok);
    } catch (error) {
      console.error(err, error.message);
    }
  }

  return { localPrisma, userPrisma, authPrisma };
}

module.exports = {
  initializeDatabase,
  localPrisma,
  userPrisma,
  authPrisma
};
