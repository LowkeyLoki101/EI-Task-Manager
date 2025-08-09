import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, MicIcon, MicOff } from "lucide-react";

interface Props {
  agentId: string;
  chatOnly?: boolean;
}

export default function VoiceWidget({ agentId, chatOnly = true }: Props) {
  const conversation = useConversation({
    onConnect: () => {
      console.log('[EL] Connected to agent');
      fetch("/api/convai/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "connected",
          detail: { agentId, status: "connected" },
        }),
      }).catch(console.error);
    },
    onDisconnect: () => {
      console.log('[EL] Disconnected from agent');
      fetch("/api/convai/relay", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "disconnected",
          detail: { agentId, status: "disconnected" },
        }),
      }).catch(console.error);
    },
    onMessage: (message) => {
      console.log('[EL] Message:', message);
    },
    onError: (error) => {
      console.error('[EL] Error:', error);
      // Show user-friendly error message
      alert('Voice connection failed. Please try the text chat instead or check your microphone permissions.');
    },
  });

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation with your agent  
      console.log('Starting session with agent:', agentId);
      const conversationId = await conversation.startSession({
        agentId: agentId,
        // Use websocket connection type
        connectionType: 'websocket'
      });
      
      console.log('Voice conversation started:', conversationId);

    } catch (error) {
      console.error('Failed to start conversation:', error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        // Show specific error to user
        alert(`Voice chat failed: ${error.message}. Please use the blue text chat button instead.`);
      } else {
        alert('Voice chat is currently unavailable. Please use the blue text chat button for now.');
      }
    }
  }, [conversation, agentId]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  // Auto-register tool call handlers
  useEffect(() => {
    const onToolCall = async (event: Event) => {
      const customEvent = event as any;
      const { name, input, conversationId } = customEvent.detail;
      
      console.log("[ConvAI] tool call:", name, input);
      
      try {
        // Call our enhanced actions endpoint
        const response = await fetch("/api/enhanced-actions/execute", {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: name,
            input: JSON.parse(input || "{}"),
            conversationId,
            agentId
          }),
        });
        
        const result = await response.json();
        
        // Send result back
        window.dispatchEvent(new CustomEvent("convai-tool-result", {
          detail: {
            callId: customEvent.detail.callId,
            result: JSON.stringify(result)
          }
        }));
        
      } catch (error) {
        console.error("[ConvAI] tool call error:", error);
        window.dispatchEvent(new CustomEvent("convai-tool-result", {
          detail: {
            callId: customEvent.detail.callId,
            result: JSON.stringify({ error: "Tool execution failed" })
          }
        }));
      }
    };

    window.addEventListener("convai-tool-call", onToolCall as EventListener);
    return () => window.removeEventListener("convai-tool-call", onToolCall as EventListener);
  }, [agentId]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-2">
        {conversation.status === 'connected' && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${conversation.isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-gray-700 dark:text-gray-300">
                {conversation.isSpeaking ? 'Speaking' : 'Listening'}
              </span>
            </div>
          </div>
        )}
        
        {conversation.status === 'connected' ? (
          <Button
            onClick={stopConversation}
            className="w-14 h-14 rounded-full shadow-lg bg-red-600 hover:bg-red-700 text-white"
            data-testid="button-stop-voice"
          >
            <MicOff className="w-6 h-6" />
          </Button>
        ) : (
          <Button
            onClick={startConversation}
            className="w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-start-voice"
          >
            <MicIcon className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  );
}