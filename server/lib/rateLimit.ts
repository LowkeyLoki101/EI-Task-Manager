export function computeBackoff(attempt: number, baseMs = 300, capMs = 30_000) {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  const jitter = Math.random() * exp; // decorrelated jitter
  return Math.min(capMs, baseMs + jitter);
}

export function parseRetryAfter(headers?: Record<string, string | string[] | undefined>) {
  if (!headers) return null;
  const val = (headers["retry-after"] ?? headers["Retry-After"]) as string | string[] | undefined;
  const h = Array.isArray(val) ? val[0] : val;
  if (!h) return null;
  const asInt = parseInt(h, 10);
  if (!Number.isNaN(asInt)) return asInt * 1000;
  const date = Date.parse(h);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export function classifyStatus(status?: number) {
  if (!status) return "server";
  if (status === 429) return "rate";
  if (status >= 500) return "server";
  if (status >= 400) return "client";
  return "ok";
}