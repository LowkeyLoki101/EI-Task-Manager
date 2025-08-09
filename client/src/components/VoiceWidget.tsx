import { useEffect } from "react";

interface Props {
  agentId: string;
  chatOnly?: boolean;
}

/**
 * Official ElevenLabs ConvAI web component integration
 * Using the recommended approach from ElevenLabs documentation
 */
export default function VoiceWidget({ agentId, chatOnly = false }: Props) {
  
  useEffect(() => {
    // Handle unhandled promise rejections to prevent overlay
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Failed to fetch') || 
          event.reason?.toString?.().includes('ConversationalAI')) {
        console.warn('[EL] Widget fetch error handled - needs dashboard configuration');
        event.preventDefault(); // Prevent the error overlay
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    const initializeWidget = () => {
      const el = document.getElementById('el-agent');
      console.log('[EL] Widget element:', !!el, 'Agent ID:', agentId);
      
      if (!el || !el.addEventListener) {
        setTimeout(initializeWidget, 150);
        return;
      }

      // Widget event listeners  
      const onReady = (e: Event) => {
        console.log('[EL] ConvAI ready', e);
        
        // Emit event to document for main app to listen
        document.dispatchEvent(new Event('convai-ready'));
        
        // Notify our backend that widget is ready
        fetch("/api/convai/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "widget-ready", agentId, ts: Date.now() })
        }).catch(console.error);
      };

      const onError = (e: Event) => {
        console.error('[EL] ConvAI error', (e as any).detail);
        
        // Emit event to document for main app to listen
        document.dispatchEvent(new Event('convai-error'));
        
        // User-friendly error handling
        const errorDetail = (e as any).detail;
        if (errorDetail?.message?.includes('not available') || errorDetail?.message?.includes('Failed to fetch')) {
          console.warn('[EL] Widget setup needed: Domain allowlist or agent configuration issue');
          console.info('[EL] Next steps: Check ElevenLabs dashboard > Agent Settings > Web Widget');
          console.info('[EL] - Enable Web Widget');
          console.info('[EL] - Add domain to Allowed Origins');  
          console.info('[EL] - Set Public/Unauthenticated = ON for testing');
        }
      };

      const onStatus = (e: Event) => console.log('[EL] ConvAI status', e);

      // Conversation event handlers
      const onUtterance = (e: Event) => {
        console.log('[EL] User utterance', (e as any).detail);
        fetch("/api/convai/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            type: "utterance", 
            detail: (e as any).detail, 
            ts: Date.now() 
          })
        }).catch(console.error);
      };

      const onTranscript = (e: Event) => {
        console.log('[EL] Transcript', (e as any).detail);
        fetch("/api/convai/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            type: "transcript", 
            detail: (e as any).detail, 
            ts: Date.now() 
          })
        }).catch(console.error);
      };

      // Tool call handlers (Actions API)
      const onToolCall = (e: Event) => {
        console.log('[EL] Tool call', (e as any).detail);
        fetch("/api/convai/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            type: "tool_call", 
            detail: (e as any).detail, 
            ts: Date.now() 
          })
        }).catch(console.error);
      };

      const onToolResult = (e: Event) => {
        console.log('[EL] Tool result', (e as any).detail);
      };

      // Register all event listeners
      el.addEventListener('convai-ready', onReady);
      el.addEventListener('convai-error', onError);
      el.addEventListener('convai-status', onStatus);
      el.addEventListener('convai-utterance', onUtterance);
      el.addEventListener('convai-transcript', onTranscript);
      el.addEventListener('convai-tool-call', onToolCall);
      el.addEventListener('convai-tool-result', onToolResult);
      
      return () => {
        el.removeEventListener('convai-ready', onReady);
        el.removeEventListener('convai-error', onError);
        el.removeEventListener('convai-status', onStatus);
        el.removeEventListener('convai-utterance', onUtterance);
        el.removeEventListener('convai-transcript', onTranscript);
        el.removeEventListener('convai-tool-call', onToolCall);
        el.removeEventListener('convai-tool-result', onToolResult);
      };
    };

    // Initialize after load
    if (document.readyState === 'loading') {
      window.addEventListener('load', initializeWidget);
    } else {
      setTimeout(initializeWidget, 100);
    }

    return () => {
      window.removeEventListener('load', initializeWidget);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [agentId]);

  return (
    <elevenlabs-convai
      id="el-agent"
      agent-id={agentId}
      {...(chatOnly ? { 'chat-only': 'true' } : {})}
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        zIndex: 9999
      }}
    />
  );
}

// TypeScript declaration for the custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        'agent-id': string;
        'chat-only'?: string;
        id?: string;
      };
    }
  }
}