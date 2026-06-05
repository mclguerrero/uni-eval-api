const SYSTEM_ANALYST =
  'Eres un analista pedagógico experto en evaluación docente universitaria. ' +
  'Tu labor es interpretar comentarios de estudiantes de forma objetiva, equilibrada y constructiva. ' +
  'Respondes ÚNICAMENTE con JSON válido. Sin texto antes ni después del JSON.';

/**
 * Prompt para analizar los comentarios de UN grupo (sin chunking).
 */
function buildGroupPrompt({ grupo, materia, comentarios }) {
  const lista = comentarios.map((c, i) => `${i + 1}. ${c.trim()}`).join('\n');
  return [
    `Analiza los comentarios de estudiantes del GRUPO ${grupo} sobre la materia "${materia}".`,
    '',
    'COMENTARIOS:',
    lista,
    '',
    'Instrucciones:',
    '- Basate EXCLUSIVAMENTE en los comentarios. No inventes información.',
    '- Sé equilibrado: reconoce fortalezas reales y señala debilidades como oportunidades de mejora.',
    '- Si los comentarios son escasos o neutros, genera conclusiones breves y honestas.',
    '- Usa lenguaje profesional, claro y conciso.',
    '',
    'Devuelve EXACTAMENTE este JSON (sin texto adicional):',
    '{',
    '  "conclusion":  "<párrafo de máximo 300 caracteres que sintetiza el desempeño docente>",',
    '  "fortalezas":  ["<ítem máx. 80 chars>"],',
    '  "debilidades": ["<ítem máx. 80 chars, redactado como oportunidad de mejora>"]',
    '}',
    '',
    'Límites: máximo 5 fortalezas, máximo 5 debilidades.',
  ].join('\n');
}

/**
 * Prompt para un bloque (chunk) de comentarios — fase MAP del procesamiento por chunks.
 * NO genera conclusión; extrae hallazgos parciales para la fase REDUCE.
 */
function buildChunkPrompt({ grupo, materia, chunkIndex, totalChunks, comentarios }) {
  const lista = comentarios.map((c, i) => `${i + 1}. ${c.trim()}`).join('\n');
  return [
    `Estás procesando el bloque ${chunkIndex + 1} de ${totalChunks} del GRUPO ${grupo} (materia: "${materia}").`,
    '',
    'COMENTARIOS DE ESTE BLOQUE:',
    lista,
    '',
    'Extrae únicamente los hallazgos presentes en este bloque.',
    'Instrucciones: Basate EXCLUSIVAMENTE en los comentarios. No inventes información.',
    '',
    'Devuelve EXACTAMENTE este JSON (sin texto adicional):',
    '{',
    '  "fortalezas":  ["<aspectos positivos mencionados, máx. 80 chars>"],',
    '  "debilidades": ["<aspectos negativos o áreas de mejora, máx. 80 chars>"],',
    '  "hallazgos":   ["<puntos relevantes adicionales, máx. 100 chars>"]',
    '}',
    '',
    'Límites: máximo 5 por categoría.',
  ].join('\n');
}

/**
 * Prompt para sintetizar los resultados de múltiples chunks en un análisis de grupo — fase REDUCE.
 * No recibe comentarios originales: solo los hallazgos parciales ya procesados.
 */
function buildReducePrompt({ grupo, materia, partialResults }) {
  const partsText = partialResults
    .map((r, i) => [
      `Bloque ${i + 1}:`,
      `  Fortalezas:  ${r.fortalezas.length  ? r.fortalezas.join(' | ')  : 'ninguna'}`,
      `  Debilidades: ${r.debilidades.length ? r.debilidades.join(' | ') : 'ninguna'}`,
      `  Hallazgos:   ${r.hallazgos.length   ? r.hallazgos.join(' | ')   : 'ninguno'}`,
    ].join('\n'))
    .join('\n\n');

  return [
    `Sintetiza los resultados de ${partialResults.length} bloques del GRUPO ${grupo} (materia: "${materia}").`,
    '',
    partsText,
    '',
    'Genera el análisis final del grupo. Consolida lo recurrente y elimina redundancias.',
    '',
    'Devuelve EXACTAMENTE este JSON (sin texto adicional):',
    '{',
    '  "conclusion":  "<párrafo de máximo 300 caracteres que sintetiza el desempeño docente>",',
    '  "fortalezas":  ["<ítem máx. 80 chars>"],',
    '  "debilidades": ["<ítem máx. 80 chars>"]',
    '}',
    '',
    'Límites: máximo 5 fortalezas, máximo 5 debilidades.',
  ].join('\n');
}

/**
 * Prompt para el análisis consolidado de VARIOS grupos de la misma materia.
 * Recibe los resultados de grupo ya generados, no comentarios originales.
 */
function buildConsolidatedPrompt({ materia, gruposAnalysis }) {
  const resumen = gruposAnalysis
    .map(g => [
      `— GRUPO ${g.grupo}`,
      `  Conclusión:  ${g.conclusion}`,
      `  Fortalezas:  ${g.fortalezas.length  ? g.fortalezas.join(' | ')  : 'Sin fortalezas destacadas'}`,
      `  Debilidades: ${g.debilidades.length ? g.debilidades.join(' | ') : 'Sin debilidades destacadas'}`,
    ].join('\n'))
    .join('\n\n');

  return [
    `Se analizaron ${gruposAnalysis.length} grupos de la materia "${materia}".`,
    'A continuación los análisis individuales por grupo:',
    '',
    resumen,
    '',
    'Genera un análisis CONSOLIDADO que:',
    '  1. Sintetice el desempeño general del docente en esta materia.',
    '  2. Identifique fortalezas que se repiten en múltiples grupos.',
    '  3. Identifique debilidades o áreas de mejora recurrentes.',
    '  4. Señale tendencias o diferencias relevantes entre los grupos (si existen).',
    '',
    'Devuelve EXACTAMENTE este JSON (sin texto adicional):',
    '{',
    '  "conclusion":  "<síntesis del desempeño general, máx. 350 caracteres>",',
    '  "fortalezas":  ["<ítem máx. 80 chars>"],',
    '  "debilidades": ["<ítem máx. 80 chars>"],',
    '  "tendencias":  ["<diferencias o patrones entre grupos, máx. 100 chars cada uno>"]',
    '}',
    '',
    'Límites: máximo 5 fortalezas, 5 debilidades, 3 tendencias.',
  ].join('\n');
}

module.exports = {
  SYSTEM_ANALYST,
  buildGroupPrompt,
  buildChunkPrompt,
  buildReducePrompt,
  buildConsolidatedPrompt,
};
