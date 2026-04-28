const { Ollama } = require('ollama');

const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
const model = process.env.LLM_MODEL || 'llama3.1:8b-instruct-q4_K_M';
const client = new Ollama({ host });

async function summarizeChunk(text, systemPrompt, userPrompt) {
  if (!model) throw new Error('LLM_MODEL no está configurado');
  const res = await client.chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${userPrompt}\n\n<<<COMENTARIOS>>>\n${text}` }
    ],
    options: { temperature: 0.3 },
    stream: false
  });
  return res.message.content;
}

module.exports = { summarizeChunk };
