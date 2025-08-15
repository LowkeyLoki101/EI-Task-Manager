import { useEffect, useRef } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': any;
    }
  }
}

interface VoiceWidgetProps {
  agentId?: string;
  sessionId?: string;
}

export function VoiceWidget({ 
  agentId = 'agent_7401k28d3x9kfdntv7cjrj6t43be',
  sessionId = 'default'
}: VoiceWidgetProps) {
  const widgetRef = useRef<HTMLElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Clean up any existing widgets first
    const existingWidgets = document.querySelectorAll('elevenlabs-convai');
    existingWidgets.forEach((widget, index) => {
      if (index > 0) { // Keep only the first one
        widget.remove();
        console.log('[ElevenLabs] Removed duplicate widget');
      }
    });

    // Load ElevenLabs SDK if not already loaded
    if (!scriptLoaded.current && !document.querySelector('script[src*="elevenlabs"]')) {
      const script = document.createElement('script');
      script.src = 'https://elevenlabs.io/convai-widget/index.js';
      script.async = true;
      script.onload = () => {
        scriptLoaded.current = true;
        console.log('[ElevenLabs] SDK loaded successfully');
        
        // Dispatch ready event after SDK loads
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('convai-ready'));
        }, 1000);
      };
      script.onerror = () => {
        console.error('[ElevenLabs] Failed to load SDK');
        document.dispatchEvent(new CustomEvent('convai-error'));
      };
      document.head.appendChild(script);
    } else if (document.querySelector('script[src*="elevenlabs"]')) {
      // SDK already loaded
      scriptLoaded.current = true;
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('convai-ready'));
      }, 500);
    }

    // Cleanup function
    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
        console.log('[ElevenLabs] Widget cleaned up');
      }
    };
  }, []);

  // Set dynamic variables when sessionId changes
  useEffect(() => {
    const el = document.querySelector("elevenlabs-convai");
    if (el && sessionId) {
      el.setAttribute("dynamic-variables", JSON.stringify({ sessionId }));
      console.log('[ElevenLabs] Set dynamic variables:', { sessionId });
    }
  }, [sessionId]);

  // Listen for ElevenLabs transcript events
  useEffect(() => {
    const handleTranscript = async (event: any) => {
      const { speaker, text, timestamp } = event.detail || {};
      
      if (text && sessionId) {
        console.log('[ElevenLabs] Transcript captured:', { speaker, text, timestamp });
        
        try {
          await fetch('/api/transcripts/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              speaker: speaker || 'user',
              content: text,
              timestamp: timestamp || new Date().toISOString(),
              source: 'elevenlabs'
            })
          });
        } catch (error) {
          console.error('[ElevenLabs] Failed to store transcript:', error);
        }
      }
    };

    const handleConversation = async (event: any) => {
      const { type, text, speaker } = event.detail || {};
      
      if (text && sessionId) {
        console.log('[ElevenLabs] Conversation event:', { type, speaker, text });
        
        try {
          await fetch('/api/transcripts/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              speaker: speaker || (type === 'user_message' ? 'user' : 'assistant'),
              content: text,
              timestamp: new Date().toISOString(),
              source: 'elevenlabs',
              metadata: { type }
            })
          });
        } catch (error) {
          console.error('[ElevenLabs] Failed to store conversation:', error);
        }
      }
    };

    // Listen for various ElevenLabs events
    document.addEventListener('convai-transcript', handleTranscript);
    document.addEventListener('convai-message', handleConversation);
    document.addEventListener('convai-response', handleConversation);
    
    return () => {
      document.removeEventListener('convai-transcript', handleTranscript);
      document.removeEventListener('convai-message', handleConversation);
      document.removeEventListener('convai-response', handleConversation);
    };
  }, [sessionId]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <elevenlabs-convai
        ref={widgetRef}
        agent-id={agentId}
        session-id={sessionId}
        data-testid="elevenlabs-widget"
        key="single-voice-widget"
      />
    </div>
  );
}

export default VoiceWidget;