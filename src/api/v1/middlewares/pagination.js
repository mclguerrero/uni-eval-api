const pagination = (options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
  } = options;

  return (req, res, next) => {
    const page = Math.max(parseInt(req.query.page) || defaultPage, 1);
    let limit = parseInt(req.query.limit) || defaultLimit;

    // Limitar el máximo permitido
    limit = Math.min(Math.max(limit, 1), maxLimit);

    const skip = (page - 1) * limit;

    // Disponible para los controllers / servicios
    req.pagination = { page, limit, skip };

    next();
  };
};

module.exports = pagination;
