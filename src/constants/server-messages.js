require('dotenv').config();

const PORT = process.env.PORT;
const MODE = process.env.NODE_ENV || 'development';

let API_URL;
let SWAGGER_URL;

if (MODE === 'production') {
  API_URL = process.env.API_BASE_URL;
  SWAGGER_URL = process.env.API_SWAGGER_URL;
} else {
  API_URL = process.env.API_BASE_URL_LOCAL;
  SWAGGER_URL = process.env.API_SWAGGER_URL_LOCAL;
}

module.exports = {
  STARTUP: {
    TITLE: '🚀 Sistema de Evaluación Docente - Backend',
    SEPARATOR: '════════════════════════════════════════════════════════════════════════════',
    PORT: `📡 Puerto: ${PORT}`,
    API_URL: `🌐 API: ${API_URL}`,
    SWAGGER_URL: `📚 Swagger: ${SWAGGER_URL}/api-docs`,
    MODE: `⚙️  Modo: ${MODE}`,
    STOP_HINT: '💡 Para detener el servidor, presiona Ctrl+C',
  },

  SIGNALS: {
    SIGTERM_RECEIVED: '👋 Señal SIGTERM recibida',
    SHUTTING_DOWN: '🛑 Cerrando servidor...',
    SHUTDOWN_SUCCESS: '✨ Servidor cerrado exitosamente',
  },

  ERRORS: {
    UNHANDLED_REJECTION: '❌ ERROR: Rechazo de promesa no manejado',
    UNCAUGHT_EXCEPTION: '❌ ERROR: Excepción no capturada',
    SHUTTING_DOWN: '⚠️ El servidor se está apagando...',
  },

  DB: {
    CONNECTING: '⏳ Conectando a la base de datos...',
    CONNECTED: '✅ Base de datos conectada exitosamente',
    ERROR: '❌ Error al conectar a la base de datos',
  },

  SERVER: {
    STARTED: '✅ Servidor iniciado correctamente',
  },
};
