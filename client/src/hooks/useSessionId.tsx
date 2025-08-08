import { useState, useEffect } from 'react';

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    let stored = localStorage.getItem('ei_session');
    if (!stored) {
      stored = `s_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('ei_session', stored);
    }
    setSessionId(stored);
  }, []);

  return sessionId;
}
