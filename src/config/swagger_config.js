const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const log = require('./log-messages');

let generated = {};
const generatedPath = path.resolve(__dirname, '../../scripts/swagger.generated.json');

if (fs.existsSync(generatedPath)) {
  try {
    const raw = fs.readFileSync(generatedPath, 'utf8');
    generated = JSON.parse(raw);
    log.info('SWAGGER.SUCCESS.LOADED');
  } catch (e) {
    log.error('SWAGGER.ERROR.LOADING', e);
  }
} else {
  log.warn('SWAGGER.WARN.NOT_FOUND');
}

const jsdocSpecs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API',
      version: '1.0.0',
      description: 'API',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [
      {
        url: process.env.API_BASE_URL || process.env.API_SWAGGER_URL,
        description: 'Server',
      },
    ],
  },
  apis: [
    './src/api/v1/modules/**/*.swagger.js'
  ],
});

// Mezclar swagger.generated.json + swagger-jsdoc
const mergedComponents = {
  ...(jsdocSpecs.components || {}),
  ...(generated.components || {}),
  schemas: {
    ...((jsdocSpecs.components && jsdocSpecs.components.schemas) || {}),
    ...((generated.components && generated.components.schemas) || {}),
  },
  securitySchemes: {
    ...((jsdocSpecs.components && jsdocSpecs.components.securitySchemes) || {}),
    ...((generated.components && generated.components.securitySchemes) || {}),
  },
};

const finalSpecs = {
  ...jsdocSpecs, // Primero lo generado por comentarios
  ...generated,   // Luego tu swagger generado dinámicamente

  paths: {
    ...(jsdocSpecs.paths || {}),
    ...(generated.paths || {}),
  },

  components: mergedComponents,

  tags: [
    ...(jsdocSpecs.tags || []),
    ...(generated.tags || []),
  ],
};

log.info('SWAGGER.SUCCESS.FINAL_GENERATED');

module.exports = finalSpecs;
