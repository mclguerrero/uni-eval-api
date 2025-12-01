const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const AppError = require('@utils/AppError');
const { prisma } = require('@config/prisma');

// Central rule handlers (sync or async). Each receives (value, ruleConfig, ctx)
const ruleHandlers = {
  minDate: (value, ruleValue) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date)) return `Fecha inválida: ${value}`;
    const base = ruleValue === 'today' ? new Date() : new Date(ruleValue);
    base.setHours(0,0,0,0);
    if (date < base) return `Debe ser >= ${base.toISOString().slice(0,10)}`;
    return null;
  },
  afterField: (value, otherFieldName, ctx) => {
    if (!value) return null;
    const other = ctx.data[otherFieldName];
    if (!other) return null; // Si el otro campo no está presente, no validar.
    const dValue = new Date(value);
    const dOther = new Date(other);
    if (isNaN(dValue) || isNaN(dOther)) return null; // formato ya lo valida schema
    if (dValue < dOther) return `Debe ser >= ${otherFieldName}`;
    return null;
  },
  existsIn: async (value, modelName) => {
    if (value == null) return null;
    if (!prisma[modelName]) return `Modelo '${modelName}' no existe en Prisma`;
    const found = await prisma[modelName].findFirst({ where: { id: value } });
    if (!found) return `Referencia inexistente en '${modelName}' (id=${value})`;
    return null;
  },
  requiredIf: (value, ruleValue, ctx) => {
    // ruleValue: { field: 'x', equals: true }
    const { field, equals } = ruleValue || {};
    if (ctx.data[field] === equals && (value === undefined || value === null || value === '')) {
      return `Campo requerido porque '${field}' = ${equals}`;
    }
    return null;
  },
  allowedValues: (value, arr) => {
    if (value == null) return null;
    if (!Array.isArray(arr)) return null;
    if (!arr.includes(value)) return `Valor '${value}' no permitido. Esperado: [${arr.join(', ')}]`;
    return null;
  },
};

class EntityValidator {
  constructor(schema, rules = {}) {
    this.schema = schema; // JSON Schema generado desde Prisma
    this.rules = rules;   // Reglas declarativas por campo
    this.ajv = new Ajv({ allErrors: true, useDefaults: true, removeAdditional: 'failing' });
    addFormats(this.ajv);
    // Compilar esquema completo para create
    this.validateCreateFn = this.ajv.compile(this.schema);
  }

  buildPartialSchema(data) {
    // Para updates: validar SOLO campos presentes (omitimos required)
    const partial = { ...this.schema };
    delete partial.required;
    if (partial.properties) {
      const subset = {}; // solo las propiedades enviadas
      for (const k of Object.keys(data)) {
        if (partial.properties[k]) subset[k] = partial.properties[k];
      }
      partial.properties = subset;
    }
    return partial;
  }

  schemaValidate(data, { partial = false } = {}) {
    if (!this.schema) return [];
    let fn = this.validateCreateFn;
    if (partial) {
      const ps = this.buildPartialSchema(data);
      fn = this.ajv.compile(ps);
    }
    const ok = fn(data);
    if (ok) return [];
    return (fn.errors || []).map(e => {
      const field = e.instancePath ? e.instancePath.replace(/^\//,'') : e.params?.missingProperty || 'root';
      return `${field}: ${e.message}`;
    });
  }

  async businessValidate(data) {
    const errors = [];
    const ctx = { data };
    // Iterar por cada campo con reglas
    for (const [field, fieldRules] of Object.entries(this.rules || {})) {
      const value = data[field];
      for (const [ruleName, ruleValue] of Object.entries(fieldRules || {})) {
        const handler = ruleHandlers[ruleName];
        if (!handler) {
          errors.push(`${field}: regla desconocida '${ruleName}'`);
          continue;
        }
        try {
          const result = handler(value, ruleValue, ctx);
          const awaited = result instanceof Promise ? await result : result;
          if (awaited) errors.push(`${field}: ${awaited}`);
        } catch (err) {
          errors.push(`${field}: error en regla '${ruleName}' -> ${err.message}`);
        }
      }
    }
    return errors;
  }

  async validateCreate(data) {
    const schemaErrors = this.schemaValidate(data, { partial: false });
    if (schemaErrors.length) return schemaErrors;
    const businessErrors = await this.businessValidate(data);
    return businessErrors;
  }

  async validateUpdate(data) {
    const schemaErrors = this.schemaValidate(data, { partial: true });
    if (schemaErrors.length) return schemaErrors;
    const businessErrors = await this.businessValidate(data);
    return businessErrors;
  }

  // Helper principal solicitado
  async validateEntity(data, { mode = 'create' } = {}) {
    const errors = mode === 'create'
      ? await this.validateCreate(data)
      : await this.validateUpdate(data);
    return errors.length ? errors : null;
  }
}

module.exports = {
  EntityValidator,
  ruleHandlers,
};
