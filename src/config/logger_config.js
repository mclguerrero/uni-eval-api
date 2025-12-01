const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const isProd = process.env.NODE_ENV === 'production';

function ensureLogsDir() {
  const logsDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
}

function buildTransports() {
  const list = [];

  // Console
  list.push(
    new winston.transports.Console({
      level: isProd ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, stack, error }) => {
          const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
          const details = stack || error?.stack;
          return details ? `${base}\n${details}` : base;
        })
      ),
    })
  );

  // Rotating file (production only)
  if (isProd) {
    ensureLogsDir();
    list.push(
      new winston.transports.DailyRotateFile({
        dirname: 'logs',
        filename: '%DATE%-app.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  return list;
}

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: winston.format.errors({ stack: true }),
  defaultMeta: { service: 'api-server' },
  transports: buildTransports(),
});

// Normalizador global de errores
function normalizeError(err) {
  return err instanceof Error ? err : new Error(err);
}

logger.withRequest = (req) => ({
  info: (msg, meta = {}) =>
    logger.info(msg, { requestId: req?.requestId, ...meta }),

  warn: (msg, meta = {}) =>
    logger.warn(msg, { requestId: req?.requestId, ...meta }),

  error: (msg, err, meta = {}) =>
    logger.error(msg, {
      requestId: req?.requestId,
      ...meta,
      error: normalizeError(err),
    }),
});

logger.errorNormalized = (msg, err, meta = {}) =>
  logger.error(msg, { ...meta, error: normalizeError(err) });

module.exports = logger;
