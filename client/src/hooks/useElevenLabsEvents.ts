import { useEffect } from 'react';

/**
 * Hook to handle ElevenLabs widget events
 * Since the widget is now in index.html as per documentation,
 * we just need to listen for its events
 */
export function useElevenLabsEvents() {
  useEffect(() => {
    const handleMessage = (e: any) => {
      const detail = e.detail;
      console.log("[EL Event] Message:", detail);
      
      const content = detail?.content || detail?.transcript || detail?.text;
      const role = detail?.role || 'user';
      
      if (content) {
        // Store conversation
        fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'voice-session',
            role: role,
            content: content,
            transcript: content
          })
        }).then(() => {
          // Process with supervisor if from user
          if (role === 'user') {
            return fetch('/api/supervisor/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'voice-session',
                builderMode: true,
                context: 'phone'
              })
            });
          }
        }).catch(console.error);
      }
    };
    
    const handleTranscript = (e: any) => {
      const detail = e.detail;
      console.log("[EL Event] Transcript:", detail);
      
      const text = detail?.text || detail?.content;
      if (text) {
        fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'voice-session',
            role: 'user',
            content: text,
            transcript: text
          })
        }).catch(console.error);
      }
    };
    
    const handleActionCall = (e: any) => {
      const detail = e.detail;
      console.log("[EL Event] Action call:", detail);
      
      if (detail?.action && detail?.parameters) {
        const actionUrl = `/api/actions/${detail.action}`;
        fetch(actionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'voice-session',
            ...detail.parameters
          })
        }).then(response => response.json())
          .then(result => {
            console.log("[EL Event] Action result:", result);
          })
          .catch(console.error);
      }
    };
    
    const handleUtterance = (e: any) => {
      console.log("[EL Event] Utterance:", e.detail);
    };
    
    // Add all event listeners
    window.addEventListener('convai-message', handleMessage);
    window.addEventListener('convai-transcript', handleTranscript);
    window.addEventListener('convai-action-call', handleActionCall);
    window.addEventListener('convai-utterance', handleUtterance);
    
    console.log('[ElevenLabs] Event listeners attached');
    
    // Cleanup
    return () => {
      window.removeEventListener('convai-message', handleMessage);
      window.removeEventListener('convai-transcript', handleTranscript);
      window.removeEventListener('convai-action-call', handleActionCall);
      window.removeEventListener('convai-utterance', handleUtterance);
    };
  }, []);
}