const { BaseAIProvider } = require('./base.provider');
const { Ollama } = require('ollama');

class OllamaProvider extends BaseAIProvider {
  constructor(config = {}) {
    super(config);
    const host = config.base_url || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = config.model_id || process.env.LLM_MODEL || 'llama3.1:8b-instruct-q4_K_M';
    this.client = new Ollama({ host });
  }

  getName() { return 'ollama'; }

  async chat(messages, options = {}) {
    const res = await this.client.chat({
      model: this.model,
      messages,
      options: { temperature: options.temperature ?? 0.3 },
      stream: false,
    });
    return res.message.content;
  }

  async validateConnection() {
    try {
      const list = await this.client.list();
      const models = list?.models ?? [];
      const found = models.some(
        m => m.name === this.model || m.name.startsWith(this.model.split(':')[0])
      );
      return { ok: true, model: this.model, found, available_models: models.map(m => m.name) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

module.exports = { OllamaProvider };
