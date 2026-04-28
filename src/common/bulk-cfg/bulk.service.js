const BulkCfgRepository = require('./bulk..repository');

class BulkCfgService {
	constructor(repo = new BulkCfgRepository()) {
		this.repo = repo;
	}

	async createCfgA(cfg_t_id, items) {
		if (!cfg_t_id || !Array.isArray(items)) {
			throw new Error('Parámetros inválidos: cfg_t_id y items son requeridos');
		}
		return this.repo.bulkInsertCfgA(cfg_t_id, items);
	}

	async createCfgE(cfg_t_id, items) {
		if (!cfg_t_id || !Array.isArray(items)) {
			throw new Error('Parámetros inválidos: cfg_t_id y items son requeridos');
		}
		return this.repo.bulkInsertCfgE(cfg_t_id, items);
	}
}

module.exports = BulkCfgService;
