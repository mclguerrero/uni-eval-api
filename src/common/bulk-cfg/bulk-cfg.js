const bulkCfgRouter = require('./bulk.router');
const bulkDocs = require('./bulk.swagger');

module.exports = { router: bulkCfgRouter(), docs: bulkDocs };
