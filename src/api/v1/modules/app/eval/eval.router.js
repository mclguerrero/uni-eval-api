const { Router } = require('express');
const { ensureAuth } = require('@middlewares/auth.middleware');
const { requireAuthorization } = require('@middlewares/authorization.middleware');
const EvalController = require('./eval.controller');

const router = Router();
const controller = new EvalController();

// POST /eval/generar
router.post('/generar', ensureAuth, requireAuthorization(), controller.generar);

module.exports = router;
