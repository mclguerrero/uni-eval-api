const service = require('./a-e.service');

async function bulkUpsert(req, res, next) {
	try {
		const { items } = req.body || {};
		if (!Array.isArray(items) || items.length === 0) {
			return res.status(400).json({ success: false, message: 'items array is required' });
		}

		const result = await service.bulkAERows(items);
		return res.status(200).json({ success: true, inserted: result.count, message: 'Bulk a_e processed' });
	} catch (err) {
		next(err);
	}
}

async function deleteAspecto(req, res, next) {
	try {
		const { aspectoId } = req.params;
		// Accept cfgTId from query params or body
		const cfgTId = req.query.cfgTId || req.body?.cfgTId;
		
		if (!aspectoId || !cfgTId) {
			return res.status(400).json({ success: false, message: 'aspectoId parameter and cfgTId are required' });
		}

		const result = await service.deleteAspectoWithEscalas(
			parseInt(aspectoId),
			parseInt(cfgTId)
		);
		return res.status(200).json({ 
			success: true,
			deleted: result.count, 
			message: `Aspecto ${aspectoId} and all its escalas deleted successfully in configuration ${cfgTId}` 
		});
	} catch (err) {
		next(err);
	}
}

async function updateAspecto(req, res, next) {
	try {
		const { oldAspectoId, newAspectoId, cfgTId } = req.body || {};
		
		if (!oldAspectoId || !newAspectoId || !cfgTId) {
			return res.status(400).json({ 
				success: false,
				message: 'oldAspectoId, newAspectoId and cfgTId are required' 
			});
		}

		const result = await service.updateAspectoIdInAllEscalas(
			parseInt(oldAspectoId), 
			parseInt(newAspectoId),
			parseInt(cfgTId)
		);
		return res.status(200).json({ 
			success: true,
			updated: result.count, 
			message: `Aspecto updated from ${oldAspectoId} to ${newAspectoId} in configuration ${cfgTId}` 
		});
	} catch (err) {
		next(err);
	}
}

module.exports = { bulkUpsert, deleteAspecto, updateAspecto };
