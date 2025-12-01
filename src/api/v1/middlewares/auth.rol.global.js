module.exports = {
  globalRoles: ['Admin'],
  globalMiddlewares: [require('@middlewares/auth.middleware').ensureAuth],
};