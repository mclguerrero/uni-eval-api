const logger = require('./logger_config');
const MESSAGES = require('@constants/messages');

function getMessage(keyPath) {
  if (!keyPath) return '';
  return keyPath.split('.').reduce((obj, key) => obj && obj[key], MESSAGES) || keyPath;
}

const log = {
  info: (keyPath, meta = {}) =>
    logger.info(getMessage(keyPath), meta),

  warn: (keyPath, meta = {}) =>
    logger.warn(getMessage(keyPath), meta),

  error: (keyPath, err, meta = {}) =>
    logger.errorNormalized(getMessage(keyPath), err, meta)
};

// Logging con request
log.withRequest = (req) => ({
  info: (keyPath, meta = {}) =>
    logger.withRequest(req).info(getMessage(keyPath), meta),

  warn: (keyPath, meta = {}) =>
    logger.withRequest(req).warn(getMessage(keyPath), meta),

  error: (keyPath, err, meta = {}) =>
    logger.withRequest(req).error(getMessage(keyPath), err, meta),
});

module.exports = log;
