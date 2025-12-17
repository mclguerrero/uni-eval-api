/**
 * Catálogo de reglas de negocio reutilizables
 * Cada regla devuelve null si es válida, o un string con el error
 */

/**
 * Reglas síncronas
 */
const syncRules = {
  /**
   * Valida que un string contenga solo letras (y espacios opcionales)
   * @param {*} value - Valor a validar
   * @param {object} config - { allowSpaces: boolean }
   */
  onlyLetters: (value, config = {}) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return 'Debe ser texto';
    const pattern = config.allowSpaces ? /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/ : /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/;
    if (!pattern.test(value)) {
      return config.allowSpaces 
        ? 'Solo se permiten letras y espacios'
        : 'Solo se permiten letras';
    }
    return null;
  },

  /**
   * Valida que un string sea un email válido
   * Nota: AJV ya tiene format: "email", pero esta es una regla personalizable
   */
  email: (value) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return 'Debe ser texto';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Email inválido';
    return null;
  },

  /**
   * Valida que un número sea positivo
   */
  positiveNumber: (value) => {
    if (value == null) return null;
    if (typeof value !== 'number') return 'Debe ser un número';
    if (value <= 0) return 'Debe ser un número positivo';
    return null;
  },

  /**
   * Valida que un número esté en un rango específico
   * @param {number} value
   * @param {object} config - { min: number, max: number }
   */
  numberRange: (value, config = {}) => {
    if (value == null) return null;
    if (typeof value !== 'number') return 'Debe ser un número';
    const { min, max } = config;
    if (min != null && value < min) return `Debe ser mayor o igual a ${min}`;
    if (max != null && value > max) return `Debe ser menor o igual a ${max}`;
    return null;
  },

  /**
   * Valida longitud mínima/máxima de string
   * @param {string} value
   * @param {object} config - { min: number, max: number }
   */
  stringLength: (value, config = {}) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return 'Debe ser texto';
    const { min, max } = config;
    if (min != null && value.length < min) return `Longitud mínima: ${min} caracteres`;
    if (max != null && value.length > max) return `Longitud máxima: ${max} caracteres`;
    return null;
  },

  /**
   * Valida que una fecha sea posterior a una fecha de referencia
   * @param {string|Date} value - Fecha a validar
   * @param {object} config - { reference: 'today' | Date | string, orEqual: boolean }
   */
  minDate: (value, config = {}) => {
    if (value == null || value === '') return null;
    const date = new Date(value);
    if (isNaN(date)) return 'Fecha inválida';
    
    let reference;
    if (config.reference === 'today') {
      reference = new Date();
      reference.setHours(0, 0, 0, 0);
    } else if (config.reference) {
      reference = new Date(config.reference);
      if (isNaN(reference)) return 'Fecha de referencia inválida';
    } else {
      reference = new Date();
      reference.setHours(0, 0, 0, 0);
    }

    const isEqual = date.getTime() === reference.getTime();
    if (config.orEqual && isEqual) return null;
    if (date < reference) {
      return `Debe ser ${config.orEqual ? 'mayor o igual' : 'mayor'} a ${reference.toISOString().slice(0, 10)}`;
    }
    return null;
  },

  /**
   * Valida que una fecha sea anterior a una fecha de referencia
   * @param {string|Date} value
   * @param {object} config - { reference: 'today' | Date | string, orEqual: boolean }
   */
  maxDate: (value, config = {}) => {
    if (value == null || value === '') return null;
    const date = new Date(value);
    if (isNaN(date)) return 'Fecha inválida';
    
    let reference;
    if (config.reference === 'today') {
      reference = new Date();
      reference.setHours(23, 59, 59, 999);
    } else if (config.reference) {
      reference = new Date(config.reference);
      if (isNaN(reference)) return 'Fecha de referencia inválida';
    } else {
      reference = new Date();
      reference.setHours(23, 59, 59, 999);
    }

    const isEqual = date.getTime() === reference.getTime();
    if (config.orEqual && isEqual) return null;
    if (date > reference) {
      return `Debe ser ${config.orEqual ? 'menor o igual' : 'menor'} a ${reference.toISOString().slice(0, 10)}`;
    }
    return null;
  },

  /**
   * Valida que un valor esté dentro de un conjunto permitido
   * @param {*} value
   * @param {object} config - { values: array }
   */
  allowedValues: (value, config = {}) => {
    if (value == null) return null;
    const { values } = config;
    if (!Array.isArray(values)) return 'Configuración inválida: se requiere array de valores';
    if (!values.includes(value)) {
      return `Valor no permitido. Valores válidos: [${values.join(', ')}]`;
    }
    return null;
  },

  /**
   * Valida que un campo sea requerido condicionalmente
   * @param {*} value
   * @param {object} config - { field: string, equals: any }
   * @param {object} ctx - Contexto con todos los datos
   */
  requiredIf: (value, config = {}, ctx = {}) => {
    const { field, equals } = config;
    if (!field) return 'Configuración inválida: se requiere campo de referencia';
    
    const referenceValue = ctx.data?.[field];
    const shouldBeRequired = referenceValue === equals;
    
    if (shouldBeRequired && (value === undefined || value === null || value === '')) {
      return `Campo requerido cuando '${field}' es igual a '${equals}'`;
    }
    return null;
  },

  /**
   * Valida que un campo sea igual a otro campo (útil para confirmación de contraseñas)
   * @param {*} value
   * @param {object} config - { field: string }
   * @param {object} ctx
   */
  matchField: (value, config = {}, ctx = {}) => {
    if (value == null || value === '') return null;
    const { field } = config;
    if (!field) return 'Configuración inválida: se requiere campo de referencia';
    
    const otherValue = ctx.data?.[field];
    if (value !== otherValue) {
      return `Debe coincidir con el campo '${field}'`;
    }
    return null;
  },

  /**
   * Valida que una fecha sea posterior a otro campo fecha
   * @param {string|Date} value
   * @param {object} config - { field: string, orEqual: boolean }
   * @param {object} ctx
   */
  afterField: (value, config = {}, ctx = {}) => {
    if (value == null || value === '') return null;
    const { field, orEqual } = config;
    if (!field) return 'Configuración inválida: se requiere campo de referencia';
    
    const otherValue = ctx.data?.[field];
    if (!otherValue) return null; // Si el otro campo no existe, no validar
    
    const date = new Date(value);
    const otherDate = new Date(otherValue);
    
    if (isNaN(date) || isNaN(otherDate)) return null; // El formato ya se valida en schema
    
    const isEqual = date.getTime() === otherDate.getTime();
    if (orEqual && isEqual) return null;
    if (date < otherDate || (!orEqual && isEqual)) {
      return `Debe ser ${orEqual ? 'mayor o igual' : 'mayor'} que '${field}'`;
    }
    return null;
  },

  /**
   * Valida formato de teléfono (10 dígitos)
   */
  phoneNumber: (value) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return 'Debe ser texto';
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(value)) return 'Teléfono inválido (10 dígitos)';
    return null;
  },

  /**
   * Valida formato de URL
   */
  url: (value) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return 'Debe ser texto';
    try {
      new URL(value);
      return null;
    } catch {
      return 'URL inválida';
    }
  },

  /**
   * Valida que un array tenga un tamaño específico
   * @param {array} value
   * @param {object} config - { min: number, max: number }
   */
  arrayLength: (value, config = {}) => {
    if (value == null) return null;
    if (!Array.isArray(value)) return 'Debe ser un array';
    const { min, max } = config;
    if (min != null && value.length < min) return `Debe tener al menos ${min} elementos`;
    if (max != null && value.length > max) return `Debe tener máximo ${max} elementos`;
    return null;
  },

  /**
   * Valida que un array no tenga duplicados
   */
  uniqueArray: (value) => {
    if (value == null) return null;
    if (!Array.isArray(value)) return 'Debe ser un array';
    const unique = new Set(value);
    if (unique.size !== value.length) return 'No se permiten valores duplicados';
    return null;
  },

  /**
   * Valida formato de código postal (México: 5 dígitos)
   */
  postalCode: (value, config = { country: 'MX' }) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return 'Debe ser texto';
    
    if (config.country === 'MX') {
      const regex = /^\d{5}$/;
      if (!regex.test(value)) return 'Código postal inválido (5 dígitos)';
    }
    return null;
  }
};

/**
 * Reglas asíncronas
 */
const asyncRules = {
  /**
   * Valida que una referencia exista en la base de datos
   * @param {number|string} value - ID a validar
   * @param {object} config - { model: string, field: string }
   * @param {object} ctx - Contexto con prisma
   */
  existsIn: async (value, config = {}, ctx = {}) => {
    if (value == null) return null;
    const { model, field = 'id' } = config;
    if (!model) return 'Configuración inválida: se requiere nombre del modelo';
    
    const prisma = ctx.prisma;
    if (!prisma || !prisma[model]) {
      return `Modelo '${model}' no existe en Prisma`;
    }
    
    try {
      const found = await prisma[model].findFirst({
        where: { [field]: value }
      });
      if (!found) {
        return `Referencia inexistente en '${model}' (${field}=${value})`;
      }
      return null;
    } catch (error) {
      return `Error al validar referencia: ${error.message}`;
    }
  },

  /**
   * Valida que un valor sea único en la base de datos
   * @param {*} value
   * @param {object} config - { model: string, field: string, excludeId: number }
   * @param {object} ctx
   */
  uniqueIn: async (value, config = {}, ctx = {}) => {
    if (value == null) return null;
    const { model, field, excludeId } = config;
    if (!model || !field) {
      return 'Configuración inválida: se requiere modelo y campo';
    }
    
    const prisma = ctx.prisma;
    if (!prisma || !prisma[model]) {
      return `Modelo '${model}' no existe en Prisma`;
    }
    
    try {
      const where = { [field]: value };
      if (excludeId != null) {
        where.id = { not: excludeId };
      }
      
      const found = await prisma[model].findFirst({ where });
      if (found) {
        return `El valor '${value}' ya existe en '${model}.${field}'`;
      }
      return null;
    } catch (error) {
      return `Error al validar unicidad: ${error.message}`;
    }
  },

  /**
   * Valida que múltiples IDs existan en la base de datos
   * @param {array} value - Array de IDs
   * @param {object} config - { model: string, field: string }
   * @param {object} ctx
   */
  existsInBatch: async (value, config = {}, ctx = {}) => {
    if (value == null) return null;
    if (!Array.isArray(value)) return 'Debe ser un array';
    if (value.length === 0) return null;
    
    const { model, field = 'id' } = config;
    if (!model) return 'Configuración inválida: se requiere nombre del modelo';
    
    const prisma = ctx.prisma;
    if (!prisma || !prisma[model]) {
      return `Modelo '${model}' no existe en Prisma`;
    }
    
    try {
      const found = await prisma[model].findMany({
        where: { [field]: { in: value } },
        select: { [field]: true }
      });
      
      const foundIds = found.map(item => item[field]);
      const missing = value.filter(id => !foundIds.includes(id));
      
      if (missing.length > 0) {
        return `Referencias inexistentes en '${model}': [${missing.join(', ')}]`;
      }
      return null;
    } catch (error) {
      return `Error al validar referencias: ${error.message}`;
    }
  }
};

module.exports = {
  syncRules,
  asyncRules,
  // Export all rules combined for easier access
  allRules: { ...syncRules, ...asyncRules }
};
