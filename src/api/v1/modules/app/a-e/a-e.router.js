const { Router } = require('express');
const { ensureAuth, requireGlobalRole } = require('@middlewares/auth.middleware');
const controller = require('./a-e.controller');

const router = Router();

// POST /a/e/bulk -> bulk insert aspecto-escala relations
router.post('/bulk', ensureAuth, requireGlobalRole, controller.bulkUpsert);

// DELETE /a/e/:aspectoId -> delete an aspecto with all its escalas (scoped by cfg_t)
router.delete('/:aspectoId', ensureAuth, requireGlobalRole, controller.deleteAspecto);

// PUT /a/e/update -> update aspecto_id in all escalas for that aspecto
router.put('/update', ensureAuth, requireGlobalRole, controller.updateAspecto);

module.exports = router;
