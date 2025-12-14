const { Router } = require('express');
const BulkCfgController = require('./bulk.controller');

function bulkCfgRouter() {
	const router = Router();
	const controller = new BulkCfgController();

	router.post('/cfg/a/bulk', controller.createCfgA);

	router.post('/cfg/e/bulk', controller.createCfgE);

	return router;
}

module.exports = bulkCfgRouter;
