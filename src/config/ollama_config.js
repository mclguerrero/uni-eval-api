const { Ollama } = require('ollama');

const client = new Ollama({ host: process.env.OLLAMA_HOST });
const model = process.env.LLM_MODEL;

async function summarizeChunk(text, systemPrompt, userPrompt) {
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
