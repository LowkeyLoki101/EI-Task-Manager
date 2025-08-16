import { useEffect, useState } from "react";

export function useSessionInit() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      // First check if we already have valid cookies
      const validateResponse = await fetch('/api/session/validate', {
        credentials: 'include'
      });

      if (validateResponse.ok) {
        const { sessionId } = await validateResponse.json();
        setSessionId(sessionId);
        setIsInitializing(false);
        return;
      }

      // If not, create a new session
      const initResponse = await fetch('/api/session/init', {
        method: 'POST',
        credentials: 'include'
      });

      if (!initResponse.ok) {
        throw new Error('Failed to create session');
      }

      const { sessionId } = await initResponse.json();
      setSessionId(sessionId);
      setIsInitializing(false);
    } catch (error) {
      console.error('[SessionInit] Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize session');
      setIsInitializing(false);
    }
  };

  return {
    sessionId,
    isInitializing,
    error,
    reinitialize: initializeSession
  };
}