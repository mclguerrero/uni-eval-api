const { BaseAIProvider } = require('./base.provider');

class GeminiProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    if (!config.api_key) throw new Error('Gemini requiere api_key');
    this.apiKey = config.api_key;
    this.model = config.model_id || 'gemini-1.5-flash';
    this.baseUrl = (config.base_url || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  }

  getName() { return 'gemini'; }

  async _post(contents, options = {}) {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens ?? 1500,
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  // Gemini no tiene rol system; lo combinamos con el primer mensaje de usuario
  async chat(messages, options = {}) {
    const system = messages.find(m => m.role === 'system')?.content ?? '';
    const userMsgs = messages.filter(m => m.role !== 'system');

    const contents = userMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.role === 'user' && system ? `${system}\n\n${m.content}` : m.content }],
    }));
    // Si no había mensajes de usuario, metemos el system solo
    if (!contents.length) {
      contents.push({ role: 'user', parts: [{ text: system }] });
    }

    const data = await this._post(contents, options);
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  async validateConnection() {
    try {
      await this._post([{ role: 'user', parts: [{ text: 'ping' }] }], { maxTokens: 5 });
      return { ok: true, model: this.model };
    } catch (err) {
      // 429 = cuota excedida, pero la key es válida y el modelo existe
      if (err.message.includes('429')) {
        return { ok: true, model: this.model, warning: 'Cuota excedida (rate limit), la key es válida' };
      }
      return { ok: false, error: err.message };
    }
  }
}

module.exports = { GeminiProvider };
