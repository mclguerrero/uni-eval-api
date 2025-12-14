const service = require('./a-e.service');

async function bulkUpsert(req, res, next) {
	try {
		const { items } = req.body || {};
		if (!Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ message: 'items array is required' });
		}

		const result = await service.bulkAERows(items);
		return res.status(200).json({ inserted: result.count, message: 'Bulk a_e processed' });
	} catch (err) {
		next(err);
	}
}

module.exports = { bulkUpsert };
