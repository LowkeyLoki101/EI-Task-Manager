import { useEffect, useState } from "react";

/** TypeScript declaration for the custom element */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "agent-id": string;
        "chat-only"?: string | boolean;
      };
    }
  }
}

interface Props {
  agentId: string;
  sessionId: string;
  onTranscript?: (transcript: string, role: string) => void;
}

/**
 * Official ElevenLabs ConvAI widget implementation
 * Based on official documentation and best practices
 */
export default function ElevenLabsWidget({ agentId, sessionId, onTranscript }: Props) {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Load the ElevenLabs SDK if not already loaded
    if (!document.querySelector('script[src*="convai-widget-embed"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed@latest';
      script.type = 'text/javascript';
      script.async = true;
      document.head.appendChild(script);
    }

    // Widget event handlers
    const handleReady = (e: Event) => {
      console.log("[EL] Widget ready:", e);
      setIsReady(true);
      setHasError(false);
    };

    const handleError = (e: Event) => {
      console.error("[EL] Widget error:", e);
      setHasError(true);
    };

    const handleOpened = (e: Event) => {
      console.log("[EL] Widget opened");
    };

    const handleClosed = (e: Event) => {
      console.log("[EL] Widget closed");
    };

    // CRITICAL: Transcript and message handling
    const handleMessage = (e: CustomEvent) => {
      const detail = e.detail;
      console.log("[EL] Message received:", detail);
      
      // Extract transcript/content
      const content = detail?.content || detail?.transcript || detail?.text;
      const role = detail?.role || 'user';
      
      if (content) {
        // Send to parent component for processing
        onTranscript?.(content, role);
        
        // Send to backend for task creation
        fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            role: role,
            content: content,
            transcript: content
          })
        }).then(() => {
          // Trigger supervisor processing if user message
          if (role === 'user') {
            return fetch('/api/supervisor/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sessionId,
                builderMode: true,
                context: 'phone'
              })
            });
          }
        }).catch(console.error);
      }
    };

    const handleTranscript = (e: CustomEvent) => {
      const detail = e.detail;
      console.log("[EL] Transcript:", detail);
      
      const text = detail?.text || detail?.content;
      if (text) {
        onTranscript?.(text, 'user');
      }
    };

    const handleActionCall = (e: CustomEvent) => {
      const detail = e.detail;
      console.log("[EL] Action call:", detail);
      
      // Route to our Actions API
      if (detail?.action && detail?.parameters) {
        const actionUrl = `/api/actions/${detail.action}`;
        fetch(actionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            ...detail.parameters
          })
        }).then(response => response.json())
          .then(result => {
            console.log("[EL] Action result:", result);
          })
          .catch(console.error);
      }
    };

    // Add event listeners
    window.addEventListener("convai-ready", handleReady as EventListener);
    window.addEventListener("convai-error", handleError as EventListener);
    window.addEventListener("convai-opened", handleOpened as EventListener);
    window.addEventListener("convai-closed", handleClosed as EventListener);
    window.addEventListener("convai-message", handleMessage as EventListener);
    window.addEventListener("convai-transcript", handleTranscript as EventListener);
    window.addEventListener("convai-action-call", handleActionCall as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener("convai-ready", handleReady as EventListener);
      window.removeEventListener("convai-error", handleError as EventListener);
      window.removeEventListener("convai-opened", handleOpened as EventListener);
      window.removeEventListener("convai-closed", handleClosed as EventListener);
      window.removeEventListener("convai-message", handleMessage as EventListener);
      window.removeEventListener("convai-transcript", handleTranscript as EventListener);
      window.removeEventListener("convai-action-call", handleActionCall as EventListener);
    };
  }, [agentId, sessionId, onTranscript]);

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      <elevenlabs-convai
        agent-id={agentId}
        style={{ display: 'block' }}
      />
      {hasError && (
        <div style={{ 
          position: 'absolute', 
          bottom: '80px', 
          right: '0',
          background: 'red', 
          color: 'white', 
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          Widget error - check console
        </div>
      )}
    </div>
  );
}