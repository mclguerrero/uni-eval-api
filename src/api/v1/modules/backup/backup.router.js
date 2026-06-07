const { Router } = require('express');
const { downloadBackup } = require('./backup.controller');
const { ensureAuth } = require('@middlewares/auth.middleware');

const router = Router();

// GET /backup — descarga el dump SQL de la base de datos `app`
router.get('/', ensureAuth, downloadBackup);

module.exports = router;
