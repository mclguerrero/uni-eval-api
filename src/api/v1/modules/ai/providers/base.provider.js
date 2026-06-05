class BaseAIProvider {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages
   * @param {{temperature?: number, maxTokens?: number}} options
   * @returns {Promise<string>}
   */
  async chat(messages, options = {}) {
    throw new Error(`${this.constructor.name} debe implementar chat()`);
  }

  /** @returns {Promise<{ok: boolean, model?: string, error?: string}>} */
  async validateConnection() {
    throw new Error(`${this.constructor.name} debe implementar validateConnection()`);
  }

  getName() {
    return 'base';
  }
}

module.exports = { BaseAIProvider };
