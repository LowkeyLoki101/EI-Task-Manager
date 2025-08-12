import { useState, useEffect } from 'react';
import { useSessionId } from '@/hooks/useSessionId';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import EmergentLogo from '../components/EmergentLogo';
import ThemeToggle from '../components/ThemeToggle';
import TaskManager from '../components/TaskManager';
import GPTSupervisor from '../components/GPTSupervisor';
import TranscriptManager from '../components/TranscriptManager';

import { useElevenLabsEvents } from '../hooks/useElevenLabsEvents';
import VoiceWidget from '../components/VoiceWidget';
import { ConversationHistory } from '../components/ConversationHistory';

export default function HomePage() {
  const sessionId = useSessionId();
  const [builderMode, setBuilderMode] = useState(false);
  
  // Listen for ElevenLabs widget events
  useElevenLabsEvents();
  const [isWidgetReady, setIsWidgetReady] = useState(false);

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

  // Listen for ElevenLabs widget ready event
  useEffect(() => {
    const handleWidgetReady = () => {
      console.log('[EL] Widget ready - enabling voice mode, disabling text fallback');
      setIsWidgetReady(true);
    };

    const handleWidgetError = () => {
      console.log('[EL] Widget error - keeping text fallback available');
      setIsWidgetReady(false);
    };

    // Listen for widget events on the document
    document.addEventListener('convai-ready', handleWidgetReady);
    document.addEventListener('convai-error', handleWidgetError);

    return () => {
      document.removeEventListener('convai-ready', handleWidgetReady);
      document.removeEventListener('convai-error', handleWidgetError);
    };
  }, []);



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

          {/* Task Manager - Now Connected to Main UI */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Tasks
              </h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Session: {sessionId.slice(0, 8)}...
              </div>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/actions/add_task', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: 'Voice Test Task',
                        context: 'computer',
                        steps: ['Research topic', 'Create outline', 'Write content'],
                        sessionId: sessionId
                      })
                    });
                    if (response.ok) {
                      console.log('Test task created!');
                    }
                  } catch (error) {
                    console.error('Failed to create test task:', error);
                  }
                }}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                data-testid="button-test-voice"
              >
                Test Voice Task
              </button>
            </div>
            <TaskManager 
              sessionId={sessionId} 
              onVideoSelect={(video) => console.log('Video selected:', video)}
            />
          </div>

          {/* GPT-5 Supervisor - Direct Chat Interface with File Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <GPTSupervisor sessionId={sessionId} />
          </div>

          {/* Transcript Manager - Manual Edit/Delete Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <TranscriptManager sessionId={sessionId} />
          </div>

          {/* Conversation History */}
          <div className="space-y-6">
            <ConversationHistory sessionId={sessionId} />
          </div>

          {/* Simple Call to Action */}
          <div className="text-center py-8">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-4xl">🎤</div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Ready to start
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    Click the blue chat button to start!
                  </span>
                  <br />
                  <br />Ready to create and manage tasks with AI assistance.
                  <br />Powered by GPT-5 for intelligent task breakdown and automation.
                  <br />
                  <br />
                  <small className="text-sm opacity-75">
                    Voice interface active! Click the chat bubble in the bottom right corner.
                    <br />
                    Type or speak: "Create a task to write a blog post" and it will automatically create the task.
                    <br />
                    Note: Voice mode requires opening in a new tab outside Replit preview.
                  </small>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ElevenLabs Voice Widget */}
      <VoiceWidget sessionId={sessionId} />
    </div>
  );
}