// generate-swagger.js
// Script para generar un archivo swagger.json combinando
// el resultado de swagger-jsdoc y los objetos exportados en los *.swagger.js

require('module-alias/register');
const fs = require('fs');
const path = require('path');

// Carga del swagger base generado por swagger-jsdoc
const baseSpecs = require('../src/config/swagger_config');

// Directorio donde están los módulos con archivos *.swagger.js
// Nota: este script vive en /backend/scripts, por eso subimos un nivel
const modulesDir = path.resolve(__dirname, '..', 'src', 'api', 'v1', 'modules');

// Utilidad para mergear objetos planos (sin arrays)
function mergeObjects(target, source) {
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key]) target[key] = {};
      mergeObjects(target[key], value);
    } else {
      // Si hay colisión, sobrescribimos (podrías decidir lanzar error)
      target[key] = value;
    }
  });
  return target;
}

function mergeSpecs(target, mod) {
  // tags (array de objetos { name, description })
  if (mod.tags) {
    const existingTagNames = new Set((target.tags || []).map(t => t.name));
    mod.tags.forEach(t => {
      if (!existingTagNames.has(t.name)) {
        target.tags = target.tags || [];
        target.tags.push(t);
      }
    });
  }

  // components.schemas
  if (mod.components && mod.components.schemas) {
    target.components = target.components || {};
    target.components.schemas = target.components.schemas || {};
    Object.entries(mod.components.schemas).forEach(([schemaName, schemaDef]) => {
      if (target.components.schemas[schemaName]) {
        // Podrías validar conflictos aquí
        // De momento sobrescribe para mantener la última versión
        // console.warn(`Advertencia: schema '${schemaName}' sobrescrito.`);
      }
      target.components.schemas[schemaName] = schemaDef;
    });
  }

  // paths
  if (mod.paths) {
    target.paths = target.paths || {};
    Object.entries(mod.paths).forEach(([route, def]) => {
      if (target.paths[route]) {
        // Mezclar métodos (get, post, etc.) dentro del mismo path
        Object.entries(def).forEach(([method, op]) => {
          if (target.paths[route][method]) {
            // Sobrescribe método duplicado
            // console.warn(`Advertencia: path '${route}' método '${method}' sobrescrito.`);
          }
          target.paths[route][method] = op;
        });
      } else {
        target.paths[route] = def;
      }
    });
  }

  return target;
}

function loadModuleSwaggerFiles(dir) {
  const specsList = [];

  if (!fs.existsSync(dir)) return specsList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Recurse en subdirectorios
      specsList.push(...loadModuleSwaggerFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.swagger.js') || entry.name.endsWith('.crud.js') || entry.name.endsWith('.map.js'))) {
      try {
        const modSpec = require(fullPath);
        // Algunos módulos exportan un único objeto { controller, router, docs }
        // Otros exportan múltiples submódulos: { foo: { docs }, bar: { docs }, ... }

        const collectDocs = (candidate) => {
          if (!candidate) return;
          // Si es un spec directo (contiene paths/tags/components) o tiene docs
          if (candidate.docs) {
            specsList.push(candidate.docs);
            return;
          }
          const looksLikeSpec =
            typeof candidate === 'object' && (
              candidate.paths || candidate.tags || (candidate.components && candidate.components.schemas)
            );
          if (looksLikeSpec) {
            specsList.push(candidate);
            return;
          }
          // Si es un objeto plano con posibles submódulos, iterar valores
          if (typeof candidate === 'object' && !Array.isArray(candidate)) {
            Object.values(candidate).forEach(v => collectDocs(v));
          }
        };

        collectDocs(modSpec);
      } catch (err) {
        console.error(`Error al cargar swagger de: ${fullPath}`, err);
      }
    }
  }

  return specsList;
}

function buildCombinedSpecs() {
  // Clonar base para no mutar el objeto importado
  const combined = JSON.parse(JSON.stringify(baseSpecs));

  const moduleSpecs = loadModuleSwaggerFiles(modulesDir);

  moduleSpecs.forEach(spec => mergeSpecs(combined, spec));

  // Asegurar campos mínimos
  combined.openapi = combined.openapi || '3.0.0';
  combined.paths = combined.paths || {}; 
  combined.components = combined.components || {}; 
  combined.components.schemas = combined.components.schemas || {}; 

  // Dedupe tags por nombre
  if (Array.isArray(combined.tags)) {
    const seen = new Set();
    combined.tags = combined.tags.filter(t => {
      const name = t && t.name;
      if (!name) return false;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  return combined;
}

function main() {
  const output = buildCombinedSpecs();
  const outPath = path.join(__dirname, 'swagger.generated.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Swagger combinado escrito en: ${outPath}`);
  console.log(`Paths totales: ${Object.keys(output.paths).length}`);
  console.log(`Schemas totales: ${Object.keys(output.components.schemas).length}`);
}

if (require.main === module) {
  main();
}

module.exports = { buildCombinedSpecs };
