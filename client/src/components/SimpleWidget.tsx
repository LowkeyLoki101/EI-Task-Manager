import { useEffect, useRef } from "react";

interface Props {
  agentId: string;
}

/**
 * Simplest possible implementation - directly inject HTML into DOM
 * This bypasses React completely to ensure the element exists
 */
export default function SimpleWidget({ agentId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    console.log("[SimpleWidget] Mounting widget with agentId:", agentId);
    
    // Directly create and append the element, bypassing React
    const widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', agentId);
    widget.setAttribute('id', 'el-widget');
    widget.style.position = 'fixed';
    widget.style.bottom = '24px';
    widget.style.right = '24px';
    widget.style.zIndex = '9999';
    
    // Append directly to body, not to React container
    document.body.appendChild(widget);
    console.log("[SimpleWidget] Widget appended to body");
    
    // Verify it exists
    setTimeout(() => {
      const found = document.querySelector('elevenlabs-convai');
      console.log("[SimpleWidget] Widget found in DOM:", !!found);
      if (found) {
        console.log("[SimpleWidget] Widget attributes:", {
          agentId: found.getAttribute('agent-id'),
          shadowRoot: !!found.shadowRoot
        });
      }
    }, 1000);
    
    // Add transcript and action handlers
    const handleMessage = (e: any) => {
      const detail = e.detail;
      console.log("[EL] Message:", detail);
      
      const content = detail?.content || detail?.transcript || detail?.text;
      const role = detail?.role || 'user';
      
      if (content) {
        fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: agentId + '-voice',
            role: role,
            content: content,
            transcript: content
          })
        }).then(() => {
          if (role === 'user') {
            return fetch('/api/supervisor/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: agentId + '-voice',
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
      console.log("[EL] Transcript:", detail);
      
      const text = detail?.text || detail?.content;
      if (text) {
        fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: agentId + '-voice',
            role: 'user',
            content: text,
            transcript: text
          })
        }).catch(console.error);
      }
    };
    
    const handleActionCall = (e: any) => {
      const detail = e.detail;
      console.log("[EL] Action call:", detail);
      
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
            console.log("[EL] Action result:", result);
          })
          .catch(console.error);
      }
    };
    
    window.addEventListener('convai-message', handleMessage);
    window.addEventListener('convai-transcript', handleTranscript);
    window.addEventListener('convai-action-call', handleActionCall);
    
    // Cleanup
    return () => {
      const el = document.getElementById('el-widget');
      if (el) {
        el.remove();
        console.log("[SimpleWidget] Widget removed from DOM");
      }
      window.removeEventListener('convai-message', handleMessage);
      window.removeEventListener('convai-transcript', handleTranscript);
      window.removeEventListener('convai-action-call', handleActionCall);
    };
  }, [agentId]);
  
  // Return null - we're managing the DOM directly
  return null;
}