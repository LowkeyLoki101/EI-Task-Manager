// server/n8n-health.ts
export async function checkN8N(baseUrl: string): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 1500);
  try {
    const r = await fetch(baseUrl + "/healthz", { signal: ctl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

let cachedStatus: { connected: boolean; lastCheck: number } = {
  connected: false,
  lastCheck: 0
};

export async function getN8NStatus(baseUrl: string = "http://localhost:5678"): Promise<boolean> {
  const now = Date.now();
  // Cache status for 30 seconds to avoid hammering
  if (now - cachedStatus.lastCheck < 30000) {
    return cachedStatus.connected;
  }
  
  cachedStatus.connected = await checkN8N(baseUrl);
  cachedStatus.lastCheck = now;
  return cachedStatus.connected;
}