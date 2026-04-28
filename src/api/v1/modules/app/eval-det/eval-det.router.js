const { Router } = require('express');
const controller = require('./eval-det.controller');
const { ensureAuth } = require('@middlewares/auth.middleware');
const { requireAuthorization } = require('@middlewares/authorization.middleware');

const router = Router();

// Bulk save respuestas y comentarios
router.post('/bulk', ensureAuth, requireAuthorization(), controller.bulkCreate);

module.exports = router;
