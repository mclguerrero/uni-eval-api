const crypto = require('crypto');
const { summarizeChunk } = require('@config/ollama_config');

function hashFilter(f) {
  return crypto.createHash('sha256').update(JSON.stringify(f)).digest('hex').slice(0, 16);
}

// Optional: implement if direct DB fetching is desired
async function fetchData(filters) {
  return { generalComments: [], commentsByAspect: new Map() };
}

function cleanText(s) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseJsonSafe(text, fallback = {}) {
  if (!text || typeof text !== 'string') return fallback;
  try { return JSON.parse(text); } catch {}
  const match = text.match(/[\[{][\s\S]*[\]}]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return fallback;
}

async function summarizeAspect(aspectName, comments) {
  const cleaned = comments.map(cleanText).filter(Boolean);
  if (!cleaned.length) {
    return { aspect: aspectName, summary: '', sentiment: 'neutral', themes: [], quotes: [] };
  }
  const chunks = chunk(cleaned, 60).map(x => x.join('\n- '));
  const system = 'Responde SOLO en JSON válido sin texto adicional.';
  const user = [
    'Eres un analista pedagógico. Resume comentarios sobre un ÚNICO aspecto docente.',
    'Normas:',
    '- Sé equilibrado y constructivo; evita lenguaje extremo o despectivo.',
    '- No inventes ni extrapoles más allá de los textos; si hay conflicto, sintetiza con neutralidad.',
    '- Mantén frases breves, específicas y accionables.',
    'Devuelve EXACTAMENTE este JSON:',
    '{ "summary": string, "sentiment": "positivo"|"neutral"|"negativo", "themes": string[], "quotes": string[] }',
    'Límites: summary<=280 chars; cada theme<=50 chars; máximo 6 themes; máximo 3 quotes.'
  ].join(' ');
  const partials = [];
  for (const c of chunks) {
    const out = await summarizeChunk(c, system, user);
    partials.push(parseJsonSafe(out, { summary: '', sentiment: 'neutral', themes: [], quotes: [] }));
  }
  const sentimentScore = { positivo: 1, neutral: 0, negativo: -1 };
  const avg = partials.reduce((a, p) => a + (sentimentScore[p.sentiment] ?? 0), 0) / (partials.length || 1);
  const sentiment = avg > 0.25 ? 'positivo' : avg < -0.25 ? 'negativo' : 'neutral';
  const summaryCombined = partials.map(p => p.summary).join(' ').slice(0, 280);
  const themesCombined = Array.from(new Set(partials.flatMap(p => p.themes.map(t => cleanText(t).slice(0, 50)))))
    .filter(Boolean)
    .slice(0, 6);
  const quotesCombined = partials.flatMap(p => p.quotes.map(q => cleanText(q))).filter(Boolean).slice(0, 3);
  return { aspect: aspectName, summary: summaryCombined, sentiment, themes: themesCombined, quotes: quotesCombined };
}

async function summarizeGlobal(aspectSummaries, generalSummary) {
  const system = 'Responde SOLO en JSON válido sin texto adicional.';
  const user = [
    'Eres un analista pedagógico. Consolida hallazgos por aspecto y el resumen general.',
    'Normas: evita contradicciones con los resúmenes por aspecto, utiliza un tono profesional y constructivo, y genera acciones claras.',
    'Devuelve EXACTAMENTE: { "overallConclusion": string, "keyImprovements": string[], "strengths": string[] }',
    'Límites: overallConclusion<=300 chars; cada item<=80 chars; máximo 5 por lista.'
  ].join(' ');
  const input = aspectSummaries.map(a => `Aspecto: ${a.aspect}\nResumen: ${a.summary}\nSentimiento: ${a.sentiment}`).join('\n\n');
  const res = await summarizeChunk(`${input}\n\nGeneral: ${JSON.stringify(generalSummary)}`, system, user);
  const parsed = parseJsonSafe(res, { overallConclusion: '', keyImprovements: [], strengths: [] });
  parsed.overallConclusion = cleanText(String(parsed.overallConclusion || '')).slice(0, 300);
  parsed.keyImprovements = (Array.isArray(parsed.keyImprovements) ? parsed.keyImprovements : []).map(x => cleanText(String(x || '')).slice(0, 80)).filter(Boolean).slice(0, 5);
  parsed.strengths = (Array.isArray(parsed.strengths) ? parsed.strengths : []).map(x => cleanText(String(x || '')).slice(0, 80)).filter(Boolean).slice(0, 5);
  return parsed;
}

async function analyzeComments(filters) {
  const key = hashFilter(filters);
  // 0) cache lookup en DB (opcional)
  const { generalComments, commentsByAspect } = await fetchData(filters);
  const generalText = cleanText(generalComments.join('\n- '));
  let generalSummary = { summary: '', sentiment: 'neutral' };
  if (generalText) {
    const system = 'Responde SOLO en JSON válido sin texto adicional.';
    const user = [
      'Resume comentario general de estudiantes sobre el docente.',
      'Normas: equilibrado, respetuoso, sin lenguaje ofensivo, sin exageraciones.',
      'Devuelve EXACTAMENTE: { "summary": string, "sentiment": "positivo"|"neutral"|"negativo" }',
      'Límites: summary<=280 chars.'
    ].join(' ');
    const out = await summarizeChunk(generalText, system, user);
    const parsed = parseJsonSafe(out, generalSummary);
    parsed.summary = cleanText(String(parsed.summary || '')).slice(0, 280);
    generalSummary = parsed;
  }

  const aspectSummaries = [];
  for (const [aspectName, comments] of commentsByAspect.entries()) {
    aspectSummaries.push(await summarizeAspect(aspectName, comments));
  }
  const global = await summarizeGlobal(aspectSummaries, generalSummary);

  const result = {
    filters,
    aspectSummaries,
    generalCommentSummary: generalSummary,
    overallConclusion: global.overallConclusion,
    stats: { totalComments: [...commentsByAspect.values()].reduce((a, b) => a + b.length, 0), aspectsCount: aspectSummaries.length }
  };
  // cache upsert (opcional)
  return result;
}

// Analyze from already aggregated repo response (metrics + comments)
async function analyzeFromAggregated(data, docente) {
  const generalText = cleanText((data.cmt_gen || []).join('\n- '));
  let generalSummary = { summary: '', sentiment: 'neutral' };
  if (generalText) {
    const system = 'Responde SOLO en JSON válido sin texto adicional.';
    const user = [
      'Resume comentario general de estudiantes sobre el docente.',
      'Normas: equilibrado, respetuoso, sin lenguaje ofensivo, sin exageraciones.',
      'Devuelve EXACTAMENTE: { "summary": string, "sentiment": "positivo"|"neutral"|"negativo" }',
      'Límites: summary<=280 chars.'
    ].join(' ');
    const out = await summarizeChunk(generalText, system, user);
    const parsed = parseJsonSafe(out, generalSummary);
    parsed.summary = cleanText(String(parsed.summary || '')).slice(0, 280);
    generalSummary = parsed;
  }

  const aspectSummaries = [];
  for (const a of (data.aspectos || [])) {
    const aspectName = a.nombre || String(a.aspecto_id);
    const comments = (a.cmt || []).map(cleanText).filter(Boolean);
    const summary = await summarizeAspect(aspectName, comments);
    // Preserve ca_map.id so downstream can write aspecto_id
    summary.aspecto_id = a.aspecto_id;
    aspectSummaries.push(summary);
  }
  const global = await summarizeGlobal(aspectSummaries, generalSummary);

  return {
    docente,
    total_respuestas: data.total_respuestas || 0,
    analisis: {
      conclusion_general: global.overallConclusion || generalSummary.summary || '',
      aspectos: aspectSummaries.map(s => ({ aspecto_id: s.aspecto_id, aspecto: s.aspect, conclusion: s.summary })),
      fortalezas: global.strengths || [],
      debilidades: global.keyImprovements || []
    }
  };
}

module.exports = { analyzeComments, analyzeFromAggregated };