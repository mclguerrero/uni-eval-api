const search = (options = {}) => {
  const {
    searchFields = [],
    defaultSearchTerm = '',
    caseSensitive = false,
    minLength = 0,
    searchMode = 'startsWith',
  } = options;

  return (req, res, next) => {
    const searchTerm = req.query.search || req.query.q || defaultSearchTerm;

    // Validar longitud mínima del término de búsqueda
    const isValidSearch = searchTerm && searchTerm.length >= minLength;

    // Disponible para los controllers / servicios
    req.search = {
      term: isValidSearch ? searchTerm : '',
      fields: searchFields,
      caseSensitive,
      mode: searchMode,
      isActive: isValidSearch,
    };

    next();
  };
};

module.exports = search;
