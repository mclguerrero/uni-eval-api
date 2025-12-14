const { Router } = require('express');
const controller = require('./a-e.controller');

const router = Router();

// POST /a/e/bulk -> bulk insert aspecto-escala relations
router.post('/bulk', controller.bulkUpsert);

module.exports = router;
