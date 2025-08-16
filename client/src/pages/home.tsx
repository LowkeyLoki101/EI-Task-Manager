import { useState, useEffect } from 'react';
import { useSessionId } from '@/hooks/useSessionId';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import EmergentLogo from '../components/EmergentLogo';
import ThemeToggle from '../components/ThemeToggle';
import TaskManager from '../components/TaskManager';
import GPTSupervisor from '../components/GPTSupervisor';
import TranscriptManager from '../components/TranscriptManager';
import WorkflowVisualizer from '../components/WorkflowVisualizer';
import AutonomousChat from '../components/AutonomousChat';
import WorkflowSuggestions from '../components/WorkflowSuggestions';
import CalendarSync from '../components/CalendarSync';
import CompactTaskManager from '../components/CompactTaskManager';
import ProjectManager from '../components/ProjectManager';

import { useElevenLabsEvents } from '../hooks/useElevenLabsEvents';
import VoiceWidget from '../components/VoiceWidget';
import { ConversationHistory } from '../components/ConversationHistory';
import { Code, BookOpen, Brain } from 'lucide-react';
import Workstation from '../components/Workstation';

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
              <a 
                href="/knowledge-base" 
                target="_blank"
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-green-900 dark:hover:bg-green-800 transition-colors"
                title="Comprehensive knowledge base with metadata, search, export/import"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Knowledge Base</span>
                <span className="sm:hidden">KB</span>
              </a>
              <a 
                href="/code-analysis" 
                target="_blank"
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900 dark:hover:bg-blue-800 transition-colors"
                title="GPT-5 powered code analysis"
              >
                <Code className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Code Analysis</span>
                <span className="sm:hidden">Code</span>
              </a>
              <a 
                href="/diary" 
                target="_blank"
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-300 dark:bg-purple-900 dark:hover:bg-purple-800 transition-colors"
                title="AI autonomous diary with context awareness"
              >
                <Brain className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">AI Diary</span>
                <span className="sm:hidden">Diary</span>
              </a>
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
          
          {/* AI Workstation - Dynamic Tools Panel */}
          <Workstation sessionId={sessionId} className="mb-6" />

          {/* Direct Chat with GPT-5 - Primary Interface (Top Priority) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Direct Chat with GPT-5
            </h3>
            <AutonomousChat sessionId={sessionId} />
          </div>

          {/* Project-Based Task Management */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <ProjectManager sessionId={sessionId} />
          </div>

          {/* Workflow Suggestions - Where the user can see automation features */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <WorkflowSuggestions sessionId={sessionId} />
          </div>

          {/* iPhone Calendar Integration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <CalendarSync sessionId={sessionId} />
          </div>

          {/* n8n Workflow Automation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <WorkflowVisualizer 
              sessionId={sessionId} 
            />
          </div>

          {/* GPT-5 Supervisor - Analysis & Insights Only */}
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