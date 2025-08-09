import { useEffect } from "react";

interface Props {
  agentId: string;
  chatOnly?: boolean;
}

/**
 * Official ElevenLabs ConvAI web component integration
 * Using the official embed approach per ElevenLabs documentation
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
    
    // Load ElevenLabs SDK script
    const loadWidget = () => {
      if (!document.querySelector('script[src*="convai-widget-embed"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => {
          console.log('[EL] SDK loaded successfully');
          document.dispatchEvent(new Event('convai-ready'));
        };
        script.onerror = (e) => {
          console.warn('[EL] SDK failed to load:', e);
          document.dispatchEvent(new Event('convai-error'));
        };
        document.head.appendChild(script);
      } else {
        setTimeout(() => document.dispatchEvent(new Event('convai-ready')), 100);
      }
    };

    loadWidget();

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [agentId]);

  return (
    <elevenlabs-convai 
      agent-id={agentId}
      {...(chatOnly && { 'chat-only': 'true' })}
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
      };
    }
  }
}