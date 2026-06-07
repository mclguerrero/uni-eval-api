const { OllamaProvider } = require('./ollama.provider');
const { OpenAIProvider } = require('./openai.provider');
const { AnthropicProvider } = require('./anthropic.provider');
const { GeminiProvider } = require('./gemini.provider');

const REGISTRY = {
  ollama: OllamaProvider,
  openrouter: OpenAIProvider,  // API compatible con OpenAI, base_url apunta a openrouter.ai
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
};

/**
 * Crea una instancia de proveedor.
 * @param {string} nombre - nombre del proveedor (ej: 'Ollama', 'OpenAI', 'OpenRouter', etc.)
 * @param {{api_key?: string, model_id?: string, base_url?: string}} config
 */
function createProvider(nombre, config = {}) {
  // Normaliza: 'OpenAI' → 'openai', 'Anthropic Claude' → 'anthropic', 'OpenRouter' → 'openrouter'
  const key = String(nombre || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('claude', 'anthropic');

  // OpenRouter debe matchear antes que openai para evitar ambigüedad
  const match = ['openrouter', ...Object.keys(REGISTRY).filter(k => k !== 'openrouter')]
    .find(k => key.includes(k));
  const ProviderClass = match ? REGISTRY[match] : null;

  if (!ProviderClass) {
    throw new Error(`Proveedor de IA desconocido: "${nombre}". Disponibles: ${Object.keys(REGISTRY).join(', ')}`);
  }
  return new ProviderClass({ ...config, provider_name: nombre });
}

/** Proveedor global de fallback: usa variables de entorno OLLAMA_HOST y LLM_MODEL */
function createDefaultProvider() {
  return new OllamaProvider({
    base_url: process.env.OLLAMA_HOST || 'http://localhost:11434',
    model_id: process.env.LLM_MODEL || 'llama3.1:8b-instruct-q4_K_M',
    api_key: null,
  });
}

/** Lista los slugs de proveedores registrados */
function listProviderSlugs() {
  return Object.keys(REGISTRY);
}

module.exports = { createProvider, createDefaultProvider, listProviderSlugs };
