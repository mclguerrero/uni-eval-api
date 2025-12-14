const BulkCfgService = require('./bulk.service');

class BulkCfgController {
	constructor(service = new BulkCfgService()) {
		this.service = service;
		this.createCfgA = this.createCfgA.bind(this);
		this.createCfgE = this.createCfgE.bind(this);
	}

	async createCfgA(req, res, next) {
		try {
			const { cfg_t_id, items } = req.body || {};
			const created = await this.service.createCfgA(cfg_t_id, items);
			res.status(201).json({ success: true, message: 'Creado correctamente', data: created });
		} catch (err) {
			next(err);
		}
	}

	async createCfgE(req, res, next) {
		try {
			const { cfg_t_id, items } = req.body || {};
			const created = await this.service.createCfgE(cfg_t_id, items);
			res.status(201).json({ success: true, message: 'Creado correctamente', data: created });
		} catch (err) {
			next(err);
		}
	}
}

module.exports = BulkCfgController;
