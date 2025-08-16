// server/ai-guard.ts
let last429At = 0;
let open = true;
let failures = 0;

export function breakerAllow(): boolean {
  // If we got a 429 recently, hold off for 60s
  const cooldown = 60_000;
  if (Date.now() - last429At < cooldown) return false;
  return open;
}

export function note429() {
  last429At = Date.now();
  failures++;
  if (failures >= 3) open = false;          // open breaker = block calls
  setTimeout(() => { open = true; failures = 0; }, 5 * 60_000); // auto half-open after 5m
}

export async function withBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let delay = 500;
  for (let i = 0; i < 4; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (e?.status === 429 || e?.code === "insufficient_quota") {
        note429();
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw e;
    }
  }
  throw new Error("AI backoff exhausted");
}

export function getCircuitStatus() {
  const cooldown = 60_000;
  const inCooldown = Date.now() - last429At < cooldown;
  return {
    open,
    failures,
    inCooldown,
    last429At: last429At > 0 ? new Date(last429At).toISOString() : null
  };
}