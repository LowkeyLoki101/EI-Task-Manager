import { useEffect } from "react";

/** Let TS accept the custom element */
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

type Props = {
  agentId: string;
  /** Set true while developing inside Replit preview to avoid AudioWorklet issues */
  chatOnly?: boolean;
};

/**
 * Mounts the official ElevenLabs ConvAI web component.
 * - No custom SDK/audio init here (prevents collisions).
 * - Includes lightweight diagnostics + event listeners.
 */
export default function VoiceWidget({ agentId, chatOnly = false }: Props) {
  useEffect(() => {
    // DIAGNOSTICS: confirm element + agent id
    const el = document.querySelector("elevenlabs-convai");
    console.log("[EL] widget present:", !!el, "agent-id:", el?.getAttribute("agent-id"));

    // Optional: listen for widget lifecycle events
    const onReady = (e: Event) => console.log("[EL] convai-ready", e);
    const onError = (e: Event) => console.error("[EL] convai-error", e);
    const onStatus = (e: Event) => console.log("[EL] convai-status", e);

    window.addEventListener("convai-ready", onReady as EventListener);
    window.addEventListener("convai-error", onError as EventListener);
    window.addEventListener("convai-status", onStatus as EventListener);

    // Forward conversation events to backend
    const relay = (type: string) => (evt: any) => {
      try {
        // evt.detail may contain structured info (depends on widget event)
        fetch("/api/convai/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, detail: evt?.detail ?? null, ts: Date.now() })
        }).catch(() => {});
      } catch {}
    };

    const onUtterance = relay("utterance");
    const onTranscript = relay("transcript");
    const onToolCall = relay("tool_call");
    const onToolResult = relay("tool_result");

    window.addEventListener("convai-utterance", onUtterance as EventListener);
    window.addEventListener("convai-transcript", onTranscript as EventListener);
    window.addEventListener("convai-tool-call", onToolCall as EventListener);
    window.addEventListener("convai-tool-result", onToolResult as EventListener);

    return () => {
      window.removeEventListener("convai-ready", onReady as EventListener);
      window.removeEventListener("convai-error", onError as EventListener);
      window.removeEventListener("convai-status", onStatus as EventListener);
      window.removeEventListener("convai-utterance", onUtterance as EventListener);
      window.removeEventListener("convai-transcript", onTranscript as EventListener);
      window.removeEventListener("convai-tool-call", onToolCall as EventListener);
      window.removeEventListener("convai-tool-result", onToolResult as EventListener);
    };
  }, []);

  return (
    <elevenlabs-convai
      agent-id={agentId}
      /* keep chat-only during dev inside Replit preview pane; remove in prod */
      {...(chatOnly ? { "chat-only": "true" } : {})}
      style={{ 
        display: "block",
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999
      }}
    />
  );
}