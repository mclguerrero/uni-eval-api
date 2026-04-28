const sort = (options = {}) => {
  const {
    defaultSortBy = 'id',
    defaultSortOrder = 'desc',
    allowedFields = [],
  } = options;

  return (req, res, next) => {
    let sortBy = req.query.sortBy || defaultSortBy;
    let sortOrder = (req.query.sortOrder || defaultSortOrder).toLowerCase();

    // Validar que el sortOrder sea válido
    if (!['asc', 'desc'].includes(sortOrder)) {
      sortOrder = defaultSortOrder;
    }

    // Si hay campos permitidos, validar que sortBy esté en la lista
    if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
      sortBy = defaultSortBy;
    }

    // Disponible para los controllers / servicios
    req.sort = { sortBy, sortOrder };

    next();
  };
};

module.exports = sort;
