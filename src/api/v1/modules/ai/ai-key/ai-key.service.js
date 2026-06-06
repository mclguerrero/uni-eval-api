const crypto = require('crypto');
const repo = require('./ai-key.repository');
const { createProvider, createDefaultProvider } = require('../providers/provider.factory');

// ─── cifrado AES-256-GCM ──────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
  const raw = process.env.ENCRYPTION_KEY || '';
  if (raw.length !== 64) {
    throw new Error('ENCRYPTION_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes)');
  }
  return Buffer.from(raw, 'hex');
}

function encryptApiKey(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // formato: iv(hex):authTag(hex):ciphertext(hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptApiKey(stored) {
  const key = getEncryptionKey();
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Formato de api_key_enc inválido');
  const [ivHex, tagHex, encHex] = parts;
  const iv       = Buffer.from(ivHex,  'hex');
  const authTag  = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ─── operaciones de usuario ───────────────────────────────────────────────────

async function listKeys(userId) {
  return repo.findByUser(userId);
}

async function createKey(userId, body) {
  const { provider_id, model_id, api_key, base_url, es_default } = body;

  if (!provider_id) throw Object.assign(new Error('provider_id es requerido'), { status: 400 });
  if (!api_key)    throw Object.assign(new Error('api_key es requerida'),      { status: 400 });

  const api_key_enc = encryptApiKey(String(api_key));

  if (es_default) {
    await repo.clearDefault(userId, provider_id);
  }

  return repo.create({
    user_id:     Number(userId),
    provider_id: Number(provider_id),
    model_id:    model_id ? Number(model_id) : null,
    api_key_enc,
    base_url:    base_url || null,
    es_activa:   true,
    es_default:  es_default ? true : false,
  });
}

async function updateKey(id, userId, body) {
  const { model_id, base_url, es_activa } = body;
  const existing = await repo.findRawById(id, userId);
  if (!existing) throw Object.assign(new Error('API key no encontrada'), { status: 404 });

  const data = {};
  if (model_id  !== undefined) data.model_id = model_id ? Number(model_id) : null;
  if (base_url  !== undefined) data.base_url  = base_url || null;
  if (es_activa !== undefined) data.es_activa = Boolean(es_activa);

  await repo.update(id, userId, data);
  return repo.findByUser(userId).then(list => list.find(k => k.id === Number(id)));
}

async function deleteKey(id, userId) {
  const existing = await repo.findRawById(id, userId);
  if (!existing) throw Object.assign(new Error('API key no encontrada'), { status: 404 });
  return repo.remove(id, userId);
}

async function setDefault(id, userId) {
  const existing = await repo.findRawById(id, userId);
  if (!existing) throw Object.assign(new Error('API key no encontrada'), { status: 404 });

  await repo.clearDefault(userId, existing.provider_id);
  await repo.update(id, userId, { es_default: true, es_activa: true });

  return repo.findByUser(userId).then(list => list.find(k => k.id === Number(id)));
}

async function validateKey(id, userId) {
  const record = await repo.findRawById(id, userId);
  if (!record) throw Object.assign(new Error('API key no encontrada'), { status: 404 });

  const apiKey   = decryptApiKey(record.api_key_enc);
  const modelId  = record.ai_model?.model_id;

  const provider = createProvider(record.ai_provider?.nombre, {
    api_key:  apiKey,
    model_id: modelId,
    base_url: record.base_url,
  });

  return provider.validateConnection();
}

// ─── resolución de proveedor para análisis ────────────────────────────────────

/**
 * Devuelve { provider, keyId } para el user_id.
 * Si el usuario no tiene key configurada, usa el proveedor global (Ollama de .env).
 */
async function resolveProviderForUser(userId) {
  if (!userId) return { provider: createDefaultProvider(), keyId: null };

  const record = await repo.findDefaultByUser(userId);
  if (!record) return { provider: createDefaultProvider(), keyId: null };

  let apiKey;
  try {
    apiKey = decryptApiKey(record.api_key_enc);
  } catch {
    return { provider: createDefaultProvider(), keyId: null };
  }

  const provider = createProvider(record.ai_provider?.nombre, {
    api_key:  apiKey,
    model_id: record.ai_model?.model_id,
    base_url: record.base_url,
  });

  return { provider, keyId: record.id };
}

module.exports = {
  listKeys,
  createKey,
  updateKey,
  deleteKey,
  setDefault,
  validateKey,
  resolveProviderForUser,
  // Expuesto para tests/uso interno
  encryptApiKey,
  decryptApiKey,
};
