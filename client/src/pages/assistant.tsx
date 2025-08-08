import { useEffect, useState } from "react";
import { useSessionId } from "@/hooks/useSessionId";

interface ElevenLabsWidget {
  init: (config: {
    agentId: string;
    onMessage?: (message: any) => void;
    onStateChange?: (state: any) => void;
    onError?: (error: any) => void;
  }) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    ElevenLabs?: ElevenLabsWidget;
  }
}

export default function AssistantPage() {
  const sessionId = useSessionId();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const slug = "task-builder";

    // Mirror function - sends conversation events to supervisor ingest
    const mirrorToSupervisor = async (evt: any) => {
      try {
        await fetch('/api/supervisor/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            slug,
            evt
          })
        });
      } catch (error) {
        console.error('Mirror function error:', error);
      }
    };

    // Load ElevenLabs script if not already loaded
    if (!window.ElevenLabs) {
      const script = document.createElement('script');
      script.src = 'https://elevenlabs.io/convai-widget/index.js';
      script.async = true;
      
      script.onload = () => {
        initWidget();
      };
      
      script.onerror = () => {
        setError('Failed to load ElevenLabs widget');
        setIsLoading(false);
      };

      document.head.appendChild(script);
    } else {
      initWidget();
    }

    function initWidget() {
      if (!window.ElevenLabs) {
        setError('ElevenLabs widget not available');
        setIsLoading(false);
        return;
      }

      try {
        window.ElevenLabs.init({
          agentId: 'agent_8201k251883jf0hr1ym7d6dbymxc',
          onMessage: (message) => {
            console.log('ElevenLabs message:', message);
            mirrorToSupervisor({
              type: 'message',
              role: message.role || 'user',
              text: message.text || message.content,
              timestamp: Date.now()
            });
          },
          onStateChange: (state) => {
            console.log('ElevenLabs state change:', state);
            mirrorToSupervisor({
              type: 'state_change',
              state,
              timestamp: Date.now()
            });
          },
          onError: (error) => {
            console.error('ElevenLabs error:', error);
            setError(`ElevenLabs error: ${error.message || error}`);
            mirrorToSupervisor({
              type: 'error',
              error: error.message || error,
              timestamp: Date.now()
            });
          }
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Widget initialization error:', error);
        setError('Failed to initialize voice assistant');
        setIsLoading(false);
      }
    }

    return () => {
      // Cleanup
      if (window.ElevenLabs?.destroy) {
        window.ElevenLabs.destroy();
      }
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-container">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading voice assistant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="error-container">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Voice Assistant Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            data-testid="button-retry"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="assistant-page">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-title">
            Voice Assistant
          </h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Talk naturally with your AI assistant to manage tasks and get things done
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            Session: <span className="font-mono" data-testid="text-session">{sessionId}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-card border rounded-lg p-6 mb-8" data-testid="instructions-card">
          <h2 className="text-lg font-semibold mb-4">How to use</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Click the microphone to start a conversation</p>
            <p>• Speak naturally about tasks you want to create or manage</p>
            <p>• The AI will automatically create and organize your tasks</p>
            <p>• Your conversation is being processed by the task supervisor</p>
          </div>
        </div>

        {/* ElevenLabs Widget Container */}
        <div className="bg-card border rounded-lg p-6" data-testid="widget-container">
          <div id="elevenlabs-widget" className="min-h-[400px] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-4xl">🎤</div>
              <p className="text-muted-foreground">
                ElevenLabs voice widget will appear here once loaded
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6 text-center text-sm text-muted-foreground" data-testid="status-info">
          <p>Voice conversations are being processed by the task supervisor</p>
          <p>Tasks are automatically created and updated based on your conversation</p>
        </div>
      </div>
    </div>
  );
}