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

      // Add event listeners matching voice-sanity.html
      el.addEventListener('convai-ready', () => { 
        console.log('[EL] Widget ready - enabling voice mode, disabling text fallback'); 
        document.dispatchEvent(new Event('convai-ready'));
      });
      
      el.addEventListener('convai-opened', () => { 
        console.log('[EL] Widget opened - conversation UI visible'); 
      });
      
      el.addEventListener('convai-closed', () => { 
        console.log('[EL] Widget closed'); 
      });
      
      el.addEventListener('convai-error', (e: Event) => { 
        console.error('[EL] Widget error:', (e as any).detail); 
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
    <elevenlabs-convai
      id="el-agent-main"
      agent-id={agentId}
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        zIndex: 9999
      }}
    />
  );
}

// TypeScript declaration already exists in VoiceWidget.tsx