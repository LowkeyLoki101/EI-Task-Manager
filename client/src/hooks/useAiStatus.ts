import { useEffect, useState } from "react";

export interface AiStatusData {
  worker: {
    isRunning: boolean;
    breaker: {
      state: 'closed' | 'open' | 'half-open';
      failures: number;
      openedAt: number;
    };
  };
  queue: Record<string, number>;
  healthy: boolean;
}

export function useAiStatus(pollMs = 3000) {
  const [status, setStatus] = useState<AiStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const poll = async () => {
      try {
        const response = await fetch("/api/ai/status");
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error("Failed to fetch AI status:", error);
      } finally {
        setLoading(false);
        timeoutId = setTimeout(poll, pollMs);
      }
    };

    poll();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pollMs]);

  return { status, loading };
}