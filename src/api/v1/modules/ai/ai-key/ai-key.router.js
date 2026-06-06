const express = require('express');
const ctrl = require('./ai-key.controller');
const { ensureAuth } = require('@middlewares/auth.middleware');

const router = express.Router();

// Todos los endpoints requieren autenticación
router.use(ensureAuth);

// GET  /ai/providers         → catálogo de proveedores + modelos (público para usuarios autenticados)
router.get('/providers', ctrl.listProviders);

// GET  /ai/keys              → listar mis keys (sin exponer la clave cifrada)
router.get('/keys', ctrl.listKeys);

// POST /ai/keys              → registrar nueva key
router.post('/keys', ctrl.createKey);

// PUT  /ai/keys/:id          → editar alias, modelo, base_url, es_activa
router.put('/keys/:id', ctrl.updateKey);

// DELETE /ai/keys/:id        → eliminar key
router.delete('/keys/:id', ctrl.deleteKey);

// PATCH /ai/keys/:id/default → marcar como predeterminada
router.patch('/keys/:id/default', ctrl.setDefault);

// POST /ai/keys/:id/validate → probar conexión con el proveedor
router.post('/keys/:id/validate', ctrl.validateKey);

module.exports = router;
