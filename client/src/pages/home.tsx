import { useState, useEffect } from 'react';
import { useSessionId } from '@/hooks/useSessionId';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import EmergentLogo from '../components/EmergentLogo';
import ThemeToggle from '../components/ThemeToggle';

// Global types for ElevenLabs web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id'?: string;
      };
    }
  }
}

export default function HomePage() {
  const sessionId = useSessionId();
  const [builderMode, setBuilderMode] = useState(false);

  // Supervisor processing for Builder Mode  
  useEffect(() => {
    if (!builderMode || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/supervisor/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            builderMode,
            context: 'phone',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.tasksCreated > 0) {
            console.log(`[Supervisor] Created ${result.tasksCreated} tasks`);
          }
        }
      } catch (error) {
        console.error('[Supervisor] Processing error:', error);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [builderMode, sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EmergentLogo />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  EMERGENT
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Conversational AI Task Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <Label htmlFor="builder-mode" className="text-xs sm:text-sm whitespace-nowrap hidden sm:inline">Builder Mode</Label>
                <Label htmlFor="builder-mode" className="text-xs whitespace-nowrap sm:hidden">Builder</Label>
                <Switch
                  id="builder-mode"
                  checked={builderMode}
                  onCheckedChange={setBuilderMode}
                />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your AI-Powered Task Assistant
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Speak naturally to create, organize, and manage your tasks. 
              The system learns your patterns and automates workflows.
            </p>
          </div>

          {/* Simple Call to Action */}
          <div className="text-center py-16">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-6xl">🎤</div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Ready to start
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Click "Talk To A.I." in the bottom right to begin your conversation
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ElevenLabs Widget - Official Implementation with WebRTC */}
      <elevenlabs-convai
        id="el-agent"
        agent-id="agent_8201k251883jf0hr1ym7d6dbymxc"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          zIndex: 9999,
          '--connection-type': 'webrtc',
          '--mobile-optimized': 'true',
          '--fallback-enabled': 'true'
        } as any}
      />
    </div>
  );
}