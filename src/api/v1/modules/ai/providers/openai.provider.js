const { BaseAIProvider } = require('./base.provider');

class OpenAIProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    if (!config.api_key) throw new Error('OpenAI requiere api_key');
    this.apiKey = config.api_key;
    this.model = config.model_id || 'gpt-4o-mini';
    this.baseUrl = (config.base_url || 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  getName() { return 'openai'; }

  async _post(path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  async chat(messages, options = {}) {
    const data = await this._post('/chat/completions', {
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1500,
    });
    return data.choices?.[0]?.message?.content ?? '';
  }

  async validateConnection() {
    try {
      await this._post('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      return { ok: true, model: this.model };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

module.exports = { OpenAIProvider };
