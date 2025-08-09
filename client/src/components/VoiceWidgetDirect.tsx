import { useEffect } from "react";

interface Props {
  agentId: string;
}

/**
 * Direct HTML injection method - exactly matches voice-sanity.html
 */
export default function VoiceWidgetDirect({ agentId }: Props) {
  
  useEffect(() => {
    // Create the exact same HTML structure as voice-sanity.html
    const container = document.createElement('div');
    container.innerHTML = `
      <elevenlabs-convai
        id="el-agent"
        agent-id="${agentId}"
        class="dock"
      ></elevenlabs-convai>
    `;
    
    // Add the CSS class
    const style = document.createElement('style');
    style.textContent = '.dock { position: fixed; right: 24px; bottom: 24px; z-index: 9999; }';
    document.head.appendChild(style);
    
    // Append the widget
    document.body.appendChild(container.firstElementChild!);
    
    // Load the SDK exactly like voice-sanity.html
    if (!document.querySelector('script[src*="convai-widget-embed"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.type = 'text/javascript';
      script.async = true;
      document.body.appendChild(script);
    }
    
    // Setup the exact same event listeners after a delay
    const setupListeners = () => {
      const el = document.getElementById('el-agent');
      if (!el || !el.addEventListener) {
        setTimeout(setupListeners, 100);
        return;
      }
      
      // Check microphone permissions
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            console.log('[EL] Microphone permission granted');
          })
          .catch((err) => {
            console.log('[EL] Microphone permission denied:', err.name, err.message);
          });
      }
      
      el.addEventListener('convai-ready', () => { 
        console.log('[EL] ready - WIDGET IS WORKING!'); 
      });
      
      el.addEventListener('convai-opened', () => { 
        console.log('[EL] opened - conversation UI visible'); 
      });
      
      el.addEventListener('convai-closed', () => { 
        console.log('[EL] closed'); 
      });
      
      el.addEventListener('convai-error', (e: any) => { 
        console.error('[EL] error', e.detail); 
      });
      
      // CRITICAL: Add transcript handling for voice-to-task creation
      el.addEventListener('convai-message', (e: any) => {
        const detail = e.detail;
        console.log('[EL] message received:', detail);
        if (detail?.content || detail?.transcript) {
          fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: agentId + '-voice',
              role: detail.role || 'user',
              content: detail.content || detail.transcript,
              transcript: detail.transcript
            })
          }).then(() => {
            return fetch('/api/supervisor/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: agentId + '-voice',
                builderMode: true,
                context: 'phone'
              })
            });
          }).catch(console.error);
        }
      });
      
      el.addEventListener('convai-transcript', (e: any) => {
        const detail = e.detail;
        console.log('[EL] transcript:', detail);
        if (detail?.text || detail?.content) {
          fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: agentId + '-voice',
              role: 'user',
              content: detail.text || detail.content,
              transcript: detail.text || detail.content
            })
          }).catch(console.error);
        }
      });
      
      el.addEventListener('convai-action-call', (e: any) => {
        const detail = e.detail;
        console.log('[EL] action call:', detail);
        if (detail?.action && detail?.parameters) {
          const actionUrl = `/api/actions/${detail.action}`;
          fetch(actionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: agentId + '-voice',
              ...detail.parameters
            })
          }).then(response => response.json())
            .then(result => {
              console.log('[EL] action result:', result);
            })
            .catch(console.error);
        }
      });
      
      // Check shadowRoot after 3 seconds
      setTimeout(() => {
        if (!el.shadowRoot) {
          console.error('[EL] widget not upgraded (no shadowRoot). Check domain allowlist, CSP, or SDK 404.');
        } else {
          console.log('[EL] Widget successfully upgraded with shadowRoot - configuration is correct!');
        }
      }, 3000);
    };
    
    setupListeners();
    
    // Cleanup
    return () => {
      const el = document.getElementById('el-agent');
      if (el) el.remove();
    };
  }, [agentId]);
  
  // Return nothing - we're directly injecting into document.body
  return null;
}