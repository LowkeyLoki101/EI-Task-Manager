import { useEffect } from "react";

interface Props {
  agentId: string;
}

/**
 * Voice Sanity Method - Direct implementation matching voice-sanity.html
 * This mirrors the exact approach that worked in the isolated test page
 */
export default function VoiceSanityWidget({ agentId }: Props) {
  
  useEffect(() => {
    // Load ElevenLabs SDK
    if (!document.querySelector('script[src*="convai-widget-embed"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.type = 'text/javascript';
      script.async = true;
      document.head.appendChild(script);
    }

    // Widget diagnostics (simplified from voice-sanity.html)
    const setupWidget = () => {
      const el = document.getElementById('el-agent-main');
      if (!el || !el.addEventListener) {
        setTimeout(setupWidget, 100);
        return;
      }

      // Add ALL event listeners from working voice-sanity.html
      el.addEventListener('convai-ready', () => { 
        console.log('[EL] ready - WIDGET IS WORKING!'); 
        document.dispatchEvent(new Event('convai-ready'));
      });
      
      el.addEventListener('convai-opened', () => { 
        console.log('[EL] opened - conversation UI visible'); 
      });
      
      el.addEventListener('convai-closed', () => { 
        console.log('[EL] closed'); 
      });
      
      el.addEventListener('convai-error', (e: Event) => { 
        console.error('[EL] error', (e as any).detail); 
      });

      // CRITICAL: Add transcript and conversation events (missing from current implementation)
      el.addEventListener('convai-message', (e: Event) => {
        const detail = (e as any).detail;
        console.log('[EL] message received:', detail);
        
        // Send transcript to our backend for processing
        if (detail?.content || detail?.transcript) {
          fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: agentId + '-voice-session',
              role: detail.role || 'user',
              content: detail.content || detail.transcript,
              transcript: detail.transcript
            })
          }).then(() => {
            // Trigger supervisor processing
            return fetch('/api/supervisor/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: agentId + '-voice-session',
                builderMode: true,
                context: 'phone'
              })
            });
          }).catch(console.error);
        }
      });

      el.addEventListener('convai-transcript', (e: Event) => {
        const detail = (e as any).detail;
        console.log('[EL] transcript:', detail);
        
        // Send transcript to conversation system
        if (detail?.text || detail?.content) {
          fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: agentId + '-voice-session',
              role: 'user',
              content: detail.text || detail.content,
              transcript: detail.text || detail.content
            })
          }).catch(console.error);
        }
      });

      el.addEventListener('convai-utterance', (e: Event) => {
        const detail = (e as any).detail;
        console.log('[EL] utterance (user spoke):', detail);
      });

      // Action events - connect to our Actions API
      el.addEventListener('convai-action-call', (e: Event) => {
        const detail = (e as any).detail;
        console.log('[EL] action call:', detail);
        
        // Route action calls to our endpoints
        if (detail?.action && detail?.parameters) {
          const actionUrl = `/api/actions/${detail.action}`;
          fetch(actionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: agentId + '-voice-session',
              ...detail.parameters
            })
          }).then(response => response.json())
            .then(result => {
              console.log('[EL] action result:', result);
              // Send result back to widget if needed
              el.dispatchEvent(new CustomEvent('convai-action-result', { 
                detail: { actionId: detail.actionId, result } 
              }));
            })
            .catch(console.error);
        }
      });

      // Check if widget upgraded correctly (from voice-sanity.html)
      setTimeout(() => {
        if (!el.shadowRoot) {
          console.error('[EL] Widget not upgraded (no shadowRoot). Check domain allowlist, CSP, or SDK 404.');
        } else {
          console.log('[EL] Widget successfully upgraded with shadowRoot - configuration is correct!');
        }
      }, 3000);
    };

    // Check microphone permissions (from voice-sanity.html)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('[EL] Microphone permission granted');
        })
        .catch((err) => {
          console.log('[EL] Microphone permission denied:', err.name, err.message);
        });
    }

    setupWidget();
  }, [agentId]);

  return (
    <>
      <elevenlabs-convai
        id="el-agent-main"
        agent-id={agentId}
        className="dock"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          zIndex: 9999
        }}
      />
      {/* Control buttons for debugging */}
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 10000, fontSize: '12px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => {
            const el = document.getElementById('el-agent-main');
            if (el) el.dispatchEvent(new Event('convai-open'));
          }}
          style={{ padding: '4px 8px', fontSize: '10px' }}
        >
          Open Widget
        </button>
        <button
          onClick={() => {
            const el = document.getElementById('el-agent-main');
            if (el) el.dispatchEvent(new Event('convai-close'));
          }}
          style={{ padding: '4px 8px', fontSize: '10px' }}
        >
          Close Widget  
        </button>
      </div>
    </>
  );
}

// TypeScript declaration already exists in VoiceWidget.tsx