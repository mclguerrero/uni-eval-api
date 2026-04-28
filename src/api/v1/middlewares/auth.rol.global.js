module.exports = {
  globalRoles: [1],
  globalMiddlewares: [require('@middlewares/auth.middleware').ensureAuth],
};