const { generateBackup } = require('./backup.service');
const logger = require('@config/logger_config');

async function downloadBackup(req, res, next) {
  try {
    logger.info('[Backup] Solicitud de backup iniciada por usuario', { user: req.user?.username });

    const { buffer, filename, database } = await generateBackup();

    logger.info('[Backup] Backup generado correctamente', { filename, size: buffer.length });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Backup-Database', database);
    res.setHeader('X-Backup-Filename', filename);

    res.send(buffer);
  } catch (err) {
    logger.error('[Backup] Error generando backup', { error: err.message });
    next(err);
  }
}

module.exports = { downloadBackup };
