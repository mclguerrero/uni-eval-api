class CfgTService {
	constructor(repository) {
		this.repository = repository;
	}

	getAspectosEscalas(cfgTId) {
		return this.repository.findAspectosEscalasByCfgTId(cfgTId);
	}
}

module.exports = CfgTService;
