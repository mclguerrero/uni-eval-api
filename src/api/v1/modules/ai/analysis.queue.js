const DEFAULT_CONCURRENCY = 2;
const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 120_000;
const RATE_LIMIT_BACKOFF_MS = 62_000; // espera 62s ante rate-limit (ventana de 60s + margen)

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function isRateLimitError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return err?.status === 429 || msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('too many requests');
}

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout: la solicitud tardó más de ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(fn, retries = DEFAULT_RETRIES) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= retries) break;
      const backoff = isRateLimitError(err)
        ? RATE_LIMIT_BACKOFF_MS
        : 2_000 * Math.pow(2, attempt); // 2s, 4s, 8s...
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/**
 * Ejecuta `mapper` sobre cada elemento de `items` con concurrencia controlada,
 * reintentos automáticos y timeout por tarea.
 *
 * @param {Array} items
 * @param {(item: any, index: number) => Promise<any>} mapper
 * @param {{concurrency?: number, retries?: number, timeoutMs?: number}} options
 * @returns {Promise<Array>}
 */
async function runQueue(items, mapper, options = {}) {
  if (!Array.isArray(items) || !items.length) return [];

  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const results = new Array(items.length);
  let nextIdx = 0;

  async function worker() {
    while (true) {
      const i = nextIdx++;
      if (i >= items.length) return;
      results[i] = await withRetry(
        () => withTimeout(mapper(items[i], i), timeoutMs),
        retries
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

module.exports = { runQueue };
