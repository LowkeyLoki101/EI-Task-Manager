// Exponential backoff with decorrelated jitter (AWS style)
export function computeBackoff(attempt: number, baseMs = 300, capMs = 30_000) {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  const jitter = Math.random() * exp; // 0..exp
  return Math.min(capMs, baseMs + jitter);
}

export function parseRetryAfter(headers: Record<string, string | undefined>) {
  const h = headers['retry-after'] || headers['Retry-After'];
  if (!h) return null;
  const asInt = parseInt(h, 10);
  if (!Number.isNaN(asInt)) return asInt * 1000;
  const date = Date.parse(h);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

export function classifyStatus(status: number) {
  if (status === 429) return 'rate';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'ok';
}