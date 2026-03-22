const repo = require('./metr.repository');

async function summary(query) {
	return repo.getSummary(query);
}

async function usuarios(query, search, sort, pagination) {
	return repo.getUsuarios(query, search, sort, pagination);
}

async function aspectos(query) {
	return repo.getAspectos(query);
}

async function docentesAspectos(query, search, sort, pagination) {
	return repo.getDocentesAspectos(query, search, sort, pagination);
}

async function docenteMateriaCompletion(query) {
	return repo.getDocenteMateriaCompletion(query);
}

module.exports = {
	summary,
	usuarios,
	aspectos,
	docentesAspectos,
	docenteMateriaCompletion
};
