const repo = require('./metr.repository');

async function summary(query) {
	return repo.getSummary(query);
}

async function ranking(query) {
	return repo.getRanking(query);
}

async function usuarios(query, search, sort, pagination) {
	return repo.getUsuarios(query, search, sort, pagination);
}

async function aspectos(query) {
	return repo.getAspectos(query);
}

async function usuarioMaterias(query) {
	return repo.getUsuarioMaterias(query);
}

async function usuarioMateriaCompletion(query) {
	return repo.getUsuarioMateriaCompletion(query);
}

module.exports = {
	summary,
	ranking,
	usuarios,
	aspectos,
	usuarioMaterias,
	usuarioMateriaCompletion
};
