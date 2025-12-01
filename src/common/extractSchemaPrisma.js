// extractSchemaPrisma.js
const { localPrisma } = require('@config/prisma');
// En Prisma v6, el DMMF accesible de forma sincrónica está expuesto en el cliente generado
// via `Prisma.dmmf`. Usamos ese origen para extracción estable en scripts/build.
let GeneratedPrisma;
try {
  GeneratedPrisma = require('../prisma/local').Prisma;
} catch (_) {
  GeneratedPrisma = null;
}

/**
 * Extrae automáticamente el schema de un modelo de Prisma.
 * @param {string} modelName - Nombre del modelo en schema.prisma
 * @returns {object} schema - Objeto con los campos y sus tipos/formats
 */
function extractSchemaFromPrisma(modelName) {
  // Preferir DMMF del cliente generado (sincrónico y estable)
  const dmmfDatamodel = GeneratedPrisma && GeneratedPrisma.dmmf && GeneratedPrisma.dmmf.datamodel
    ? GeneratedPrisma.dmmf.datamodel
    : (localPrisma && localPrisma.dmmf && localPrisma.dmmf.datamodel
      ? localPrisma.dmmf.datamodel
      : null);

  if (!dmmfDatamodel) {
    // Entornos de build/generación pueden no tener DMMF disponible
    return {};
  }
  const model = dmmfDatamodel.models.find(m => m.name === modelName);
  if (!model) {
    throw new Error(`Modelo Prisma '${modelName}' no existe en schema.prisma`);
  }

  const schema = {};

  for (const field of model.fields) {
    // Omitir relaciones para evitar bucles
    if (field.kind !== 'scalar') continue;

    let type = 'string';
    let format = undefined;

    switch (field.type) {
      case 'Int': type = 'integer'; format = 'int32'; break;
      case 'BigInt': type = 'integer'; format = 'int64'; break;
      case 'Float': type = 'number'; format = 'float'; break;
      case 'Decimal': type = 'string'; format = 'decimal'; break;
      case 'Boolean': type = 'boolean'; break;
      case 'DateTime': type = 'string'; format = 'date-time'; break;
      case 'Json': type = 'object'; break;
      case 'Bytes': type = 'string'; format = 'byte'; break;
      case 'String':
      default: type = 'string'; break;
    }

    const name = field.name || '';
    const isTimestampName = /^(createdAt|updatedAt|created_at|updated_at|fecha_creacion|fecha_actualizacion|fechaCreacion|fechaActualizacion|creado_en|actualizado_en)$/i.test(name);
    const isTimestampByType = field.type === 'DateTime' && (field.isUpdatedAt || field.isReadOnly || field.hasDefaultValue === true);

    schema[name] = {
      type,
      ...(format ? { format } : {}),
      // Considerar fechas de creación/actualización como solo lectura
      readonly: Boolean(
        field.isId ||
        field.isUpdatedAt ||
        isTimestampName ||
        isTimestampByType
      ),
      nullable: !field.isRequired,
    };
  }

  return schema;
}

module.exports = {
  extractSchemaFromPrisma,
};
