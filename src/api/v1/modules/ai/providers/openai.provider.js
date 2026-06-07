const { BaseAIProvider } = require('./base.provider');

class OpenAIProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    if (!config.api_key) throw new Error('OpenAI requiere api_key');
    this.apiKey = config.api_key;
    this.model = config.model_id || 'gpt-4o-mini';
    this.isOpenRouter = String(config.provider_name || '').toLowerCase().includes('openrouter');
    const defaultUrl = this.isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
    this.baseUrl = (config.base_url || defaultUrl).replace(/\/$/, '');
  }

  getName() { return this.isOpenRouter ? 'openrouter' : 'openai'; }

  async _post(path, body) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.isOpenRouter) {
      headers['HTTP-Referer'] = process.env.APP_URL || 'http://localhost:5000';
      headers['X-Title'] = process.env.APP_NAME || 'UniEval';
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
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
