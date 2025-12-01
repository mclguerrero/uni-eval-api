require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('@config/swagger_config');
const { initializeDatabase } = require('@db');
const errorHandler = require('@middlewares/errorHandler');
const corsOptions = require('@config/cors_config');
const messages = require('@constants/app-messages');

const app = express();

// Middlewares
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Inicializar base de datos
initializeDatabase()
  .then(() => {
    console.log(messages.DB_INIT_OK);
  })
  .catch(error => {
    console.error(messages.SERVER_ERROR, error.message);
    process.exit(1);
  });

// Health check helper
const healthResponse = (upMessage, downMessage) => async (req, res) => {
  try {
    const { localPrisma } = require('@db');
    await localPrisma.$queryRaw`SELECT 1 as health`;

    res.status(200).json({
      status: 'UP',
      message: upMessage,
      database: 'Connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch {
    res.status(503).json({
      status: 'DOWN',
      message: downMessage,
      database: 'Disconnected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  }
};

// Health check endpoints
app.get('/health', healthResponse(messages.HEALTH_UP, messages.HEALTH_DOWN));
app.get('/api/v1/health', healthResponse(messages.API_HEALTH_UP, messages.API_HEALTH_DOWN));

// Routers
const appRouterV1 = require('./api/v1/modules/router').router;
app.use('/api/v1', appRouterV1);
app.use('/api/v1/auth', require('./api/v1/modules/auth/login'));
app.use('/api/v1/user', require('./api/v1/modules/auth/user'));

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: messages.NOT_FOUND });
});

// Error handler
app.use(errorHandler);

module.exports = app;
