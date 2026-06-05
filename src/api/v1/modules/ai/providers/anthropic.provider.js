const { BaseAIProvider } = require('./base.provider');

class AnthropicProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    if (!config.api_key) throw new Error('Anthropic requiere api_key');
    this.apiKey = config.api_key;
    this.model = config.model_id || 'claude-haiku-4-5-20251001';
    this.baseUrl = (config.base_url || 'https://api.anthropic.com').replace(/\/$/, '');
  }

  getName() { return 'anthropic'; }

  async _post(system, messages, options = {}) {
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        system: system || undefined,
        messages,
        max_tokens: options.maxTokens ?? 1500,
        temperature: options.temperature ?? 0.3,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  async chat(messages, options = {}) {
    const system = messages.find(m => m.role === 'system')?.content ?? '';
    const conv = messages.filter(m => m.role !== 'system');
    const data = await this._post(system, conv, options);
    return data.content?.[0]?.text ?? '';
  }

  async validateConnection() {
    try {
      await this._post('', [{ role: 'user', content: 'ping' }], { maxTokens: 5 });
      return { ok: true, model: this.model };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

module.exports = { AnthropicProvider };
