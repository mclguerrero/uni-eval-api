const { runQueue } = require('./analysis.queue');
const {
  SYSTEM_ANALYST,
  buildGroupPrompt,
  buildChunkPrompt,
  buildReducePrompt,
  buildConsolidatedPrompt,
} = require('./prompts/teacher-analysis.prompts');

// ─── límites de chunking ──────────────────────────────────────────────────────

const DEFAULT_CHUNK_LIMITS = {
  maxComments:        100,
  maxCharacters:    50000,
  maxEstimatedTokens: 12000,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function cleanText(s) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function parseJsonSafe(text, fallback = {}) {
  if (!text || typeof text !== 'string') return fallback;
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return fallback;
}

function normalizeStringArray(val, maxItems = 5, maxLen = 80) {
  if (!Array.isArray(val)) return [];
  return val
    .map(x => cleanText(String(x ?? '')).slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function estimateTokens(comentarios) {
  return Math.ceil(comentarios.reduce((s, c) => s + c.length, 0) / 4);
}

function needsChunking(comentarios, limits) {
  const totalChars = comentarios.reduce((s, c) => s + c.length, 0);
  return (
    comentarios.length  > limits.maxComments ||
    totalChars          > limits.maxCharacters ||
    estimateTokens(comentarios) > limits.maxEstimatedTokens
  );
}

function splitIntoChunks(comentarios, limits) {
  const maxChunkChars    = Math.floor(limits.maxCharacters / 2);
  const maxChunkComments = Math.floor(limits.maxComments   / 2);
  const chunks = [];
  let current      = [];
  let currentChars = 0;

  for (const cmt of comentarios) {
    if (
      current.length >= maxChunkComments ||
      (current.length > 0 && currentChars + cmt.length > maxChunkChars)
    ) {
      chunks.push(current);
      current      = [];
      currentChars = 0;
    }
    current.push(cmt);
    currentChars += cmt.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// ─── llamada IA ───────────────────────────────────────────────────────────────

async function callAI(provider, userPrompt) {
  const raw = await provider.chat([
    { role: 'system', content: SYSTEM_ANALYST },
    { role: 'user',   content: userPrompt },
  ]);
  return parseJsonSafe(raw, {});
}

// ─── análisis directo (grupo sin chunking) ────────────────────────────────────

async function analyzeGroupDirect({ grupo, materia, comentarios }, provider) {
  const parsed = await callAI(provider, buildGroupPrompt({ grupo, materia, comentarios }));
  return {
    grupo,
    conclusion:  cleanText(String(parsed.conclusion  ?? '')).slice(0, 300),
    fortalezas:  normalizeStringArray(parsed.fortalezas),
    debilidades: normalizeStringArray(parsed.debilidades),
  };
}

// ─── MAP: análisis de un chunk ────────────────────────────────────────────────

async function analyzeChunk({ grupo, materia, chunk, chunkIndex, totalChunks }, provider) {
  const parsed = await callAI(
    provider,
    buildChunkPrompt({ grupo, materia, chunkIndex, totalChunks, comentarios: chunk })
  );
  return {
    fortalezas:  normalizeStringArray(parsed.fortalezas),
    debilidades: normalizeStringArray(parsed.debilidades),
    hallazgos:   normalizeStringArray(parsed.hallazgos, 10, 100),
  };
}

// ─── REDUCE: síntesis de chunks en resultado de grupo ────────────────────────

async function reduceChunks({ grupo, materia, chunkResults }, provider) {
  const parsed = await callAI(provider, buildReducePrompt({ grupo, materia, partialResults: chunkResults }));
  return {
    grupo,
    conclusion:  cleanText(String(parsed.conclusion  ?? '')).slice(0, 300),
    fortalezas:  normalizeStringArray(parsed.fortalezas),
    debilidades: normalizeStringArray(parsed.debilidades),
  };
}

// ─── análisis de grupo (con chunking automático si es necesario) ──────────────

async function analyzeGroup({ grupo, materia, comentarios }, provider, limits) {
  const limpios = comentarios.map(cleanText).filter(Boolean);
  if (!limpios.length) return null;

  if (!needsChunking(limpios, limits)) {
    return analyzeGroupDirect({ grupo, materia, comentarios: limpios }, provider);
  }

  // MAP: dividir en chunks y analizar cada uno con concurrencia controlada
  const chunks = splitIntoChunks(limpios, limits);
  const chunkItems = chunks.map((chunk, chunkIndex) => ({
    type: 'ANALIZAR_CHUNK',
    grupo,
    materia,
    chunk,
    chunkIndex,
    totalChunks: chunks.length,
  }));

  const chunkResults = (await runQueue(
    chunkItems,
    (item) => analyzeChunk(item, provider),
    { concurrency: 2, retries: 2, timeoutMs: 60_000 }
  )).filter(Boolean);

  if (!chunkResults.length) return null;

  // Si solo un chunk pasó, aplanar directamente sin llamada adicional a la IA
  if (chunkResults.length === 1) {
    const cr = chunkResults[0];
    return {
      grupo,
      conclusion:  [...cr.fortalezas, ...cr.hallazgos].slice(0, 2).join('. ').slice(0, 300),
      fortalezas:  cr.fortalezas,
      debilidades: cr.debilidades,
    };
  }

  // REDUCE: sintetizar todos los chunks en el resultado final del grupo
  return reduceChunks({ grupo, materia, chunkResults }, provider);
}

// ─── consolidación de materia ─────────────────────────────────────────────────

async function analyzeConsolidated(materia, gruposAnalysis, provider) {
  const parsed = await callAI(provider, buildConsolidatedPrompt({ materia, gruposAnalysis }));
  return {
    conclusion:  cleanText(String(parsed.conclusion  ?? '')).slice(0, 350),
    fortalezas:  normalizeStringArray(parsed.fortalezas),
    debilidades: normalizeStringArray(parsed.debilidades),
    tendencias:  normalizeStringArray(parsed.tendencias, 3, 100),
  };
}

// ─── entry point ──────────────────────────────────────────────────────────────

/**
 * Analiza los comentarios de un docente en una materia, agrupados por grupo académico.
 *
 * – Chunking automático (Map-Reduce) si el volumen de comentarios supera los límites.
 * – Consolidado de materia solo cuando hay ≥ 2 grupos con resultado.
 * – Los providers no conocen agrupación, materias ni chunking: reciben solo mensajes.
 *
 * @param {{
 *   docente: string,
 *   codigo_materia: string,
 *   grupos: Array<{ grupo: string, comentarios: string[] }>
 * }} groupedData
 * @param {import('./providers/base.provider').BaseAIProvider} provider
 * @param {{
 *   chunkLimits?: { maxComments?: number, maxCharacters?: number, maxEstimatedTokens?: number },
 *   queueOptions?: { concurrency?: number, retries?: number, timeoutMs?: number }
 * }} options
 */
async function analyzeFromAggregated(groupedData, provider, options = {}) {
  const { codigo_materia, grupos } = groupedData;
  const limits   = { ...DEFAULT_CHUNK_LIMITS, ...(options.chunkLimits   ?? {}) };
  const queueOpts = {
    concurrency: 2, retries: 2, timeoutMs: 120_000,
    ...(options.queueOptions ?? {}),
  };

  // Analizar cada grupo de forma independiente
  const grupoItems = (grupos || []).map(g => ({
    type: 'ANALIZAR_GRUPO',
    grupo:       g.grupo,
    materia:     codigo_materia,
    comentarios: g.comentarios,
  }));

  const gruposAnalysis = (await runQueue(
    grupoItems,
    (item) => analyzeGroup(item, provider, limits),
    queueOpts
  )).filter(Boolean);

  if (!gruposAnalysis.length) {
    return { analisis: null, motivo: 'sin_comentarios' };
  }

  // Un solo grupo: usar su resultado como conclusión general (sin llamada extra a la IA)
  if (gruposAnalysis.length === 1) {
    const g = gruposAnalysis[0];
    return {
      analisis: {
        conclusion_general: g.conclusion,
        fortalezas:  g.fortalezas,
        debilidades: g.debilidades,
        tendencias:  [],
        grupos:      gruposAnalysis,
      },
    };
  }

  // Múltiples grupos: consolidar usando resultados ya generados (sin releer comentarios originales)
  const consolidado = await analyzeConsolidated(codigo_materia, gruposAnalysis, provider);

  return {
    analisis: {
      conclusion_general: consolidado.conclusion,
      fortalezas:  consolidado.fortalezas,
      debilidades: consolidado.debilidades,
      tendencias:  consolidado.tendencias,
      grupos:      gruposAnalysis,
    },
  };
}

module.exports = { analyzeFromAggregated };
