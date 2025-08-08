import { useState, useEffect } from 'react';
import { useSessionId } from '@/hooks/useSessionId';
import EmergentLogo from '../components/EmergentLogo';
import ThemeToggle from '../components/ThemeToggle';

// Global type for ElevenLabs
declare global {
  interface Window {
    ElevenLabs: any;
  }
}

// ElevenLabs Voice Assistant Component
function ElevenLabsVoiceAssistant({ sessionId, builderMode }: { sessionId: string; builderMode: boolean }) {
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

    function initWidget() {
      if (!window.ElevenLabs) {
        setError('ElevenLabs widget not available');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Initializing ElevenLabs widget with agent:', 'agent_8201k251883jf0hr1ym7d6dbymxc');
        
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
        
        console.log('ElevenLabs widget initialized successfully');
        setIsLoading(false);
      } catch (error) {
        console.error('Widget initialization error:', error);
        setError('Failed to initialize voice assistant');
        setIsLoading(false);
      }
    }

    // Load ElevenLabs script if not already loaded
    if (!window.ElevenLabs) {
      const script = document.createElement('script');
      script.src = 'https://elevenlabs.io/convai-widget/index.js';
      script.async = true;
      
      script.onload = () => {
        console.log('ElevenLabs script loaded successfully');
        initWidget();
      };
      
      script.onerror = () => {
        console.error('Failed to load ElevenLabs script');
        setError('Failed to load ElevenLabs widget');
        setIsLoading(false);
      };

      document.head.appendChild(script);
    } else {
      console.log('ElevenLabs already loaded');
      initWidget();
    }
  }, [sessionId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Emergent Task Builder</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Talk naturally to create and manage your tasks with AI-powered conversation
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>Session: <span className="font-mono" data-testid="text-session">{sessionId}</span></span>
          <span>•</span>
          <span className={builderMode ? "text-green-600 font-medium" : "text-orange-600"}>
            Builder Mode: {builderMode ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-card border rounded-lg p-6" data-testid="instructions-card">
        <h2 className="text-lg font-semibold mb-4">How to use</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Click the microphone to start a conversation with your AI assistant</p>
          <p>• Speak naturally about tasks you want to create or manage</p>
          <p>• The AI will automatically create and organize your tasks</p>
          <p>• Enable Builder Mode above to activate automatic task processing</p>
        </div>
        
        {/* Debug info */}
        <div className="mt-4 p-3 bg-muted rounded text-xs">
          <strong>Debug Info:</strong>
          <br />Agent ID: agent_8201k251883jf0hr1ym7d6dbymxc
          <br />Session: {sessionId}
          <br />Widget Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}
          <br />Builder Mode: {builderMode ? 'Active (supervisor runs every 8s)' : 'Inactive'}
          {error && <><br />Error: {error}</>}
        </div>
      </div>

      {/* ElevenLabs Widget Container */}
      <div className="bg-card border rounded-lg p-6" data-testid="widget-container">
        <h2 className="text-lg font-semibold mb-4">Voice Assistant</h2>
        <div id="elevenlabs-widget" className="min-h-[400px]">
          {/* ElevenLabs widget will be injected here */}
        </div>
        
        {/* Fallback instructions */}
        <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
          <p><strong>If the widget doesn't appear:</strong></p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Check browser console for any script loading errors</li>
            <li>Ensure you have a stable internet connection</li>
            <li>Try refreshing the page</li>
            <li>Verify the ElevenLabs agent ID is correct: agent_8201k251883jf0hr1ym7d6dbymxc</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const sessionId = useSessionId();
  const [builderMode, setBuilderMode] = useState(false);

  // Poll supervisor when builder mode is on
  useEffect(() => {
    if (!builderMode || !sessionId) return;
    
    const interval = setInterval(() => {
      fetch(`/api/supervisor/agent?sessionId=${sessionId}&slug=task-builder`, {
        method: 'POST'
      }).catch(console.error);
    }, 8000);

    return () => clearInterval(interval);
  }, [builderMode, sessionId]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚡</div>
          <div className="text-lg text-muted-foreground">Initializing session...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 font-sans min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <EmergentLogo size="md" showText={true} />
              <span className="text-sm text-slate-500 hidden sm:inline">AI-Powered Voice Task Intelligence</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">Builder Mode</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={builderMode}
                    onChange={(e) => setBuilderMode(e.target.checked)}
                    data-testid="toggle-builder-mode"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <ThemeToggle />
                <div className="text-sm text-slate-500 hidden sm:block">
                  Session: <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded" data-testid="session-id">{sessionId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ElevenLabsVoiceAssistant sessionId={sessionId} builderMode={builderMode} />
      </div>
    </div>
  );
}