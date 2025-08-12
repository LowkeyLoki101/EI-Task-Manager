import { useEffect } from 'react';

export function useElevenLabsEvents() {
  useEffect(() => {
    const handleReady = (event: Event) => {
      console.log('[ElevenLabs] Event listeners attached');
      // Widget is ready, can now interact
    };

    const handleError = (event: Event) => {
      console.error('[ElevenLabs] Widget error:', event);
    };

    const handleMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[ElevenLabs] Message:', customEvent.detail);
    };

    // Listen for ElevenLabs widget events
    document.addEventListener('convai-ready', handleReady);
    document.addEventListener('convai-error', handleError);
    document.addEventListener('convai-message', handleMessage);

    return () => {
      document.removeEventListener('convai-ready', handleReady);
      document.removeEventListener('convai-error', handleError);
      document.removeEventListener('convai-message', handleMessage);
    };
  }, []);
}