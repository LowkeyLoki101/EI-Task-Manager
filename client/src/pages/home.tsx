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
import { Code, BookOpen, Brain, Calendar, Settings, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Workstation from '../components/Workstation';
import { InsightProgressPanel } from '../components/InsightProgressPanel';

export default function HomePage() {
  const sessionId = useSessionId();
  const [builderMode, setBuilderMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
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
    <div className="min-h-screen bg-industrial-dark carbon-fiber-weave">
      {/* Header */}
      <header className="border-b-2 border-industrial-accent bg-industrial-dark hex-mesh-pattern backdrop-blur-sm sticky top-0 z-50 shadow-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="drone-camera-lens" style={{width: '32px', height: '32px'}}></div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-industrial-primary font-industrial-display">
                  EMERGENT
                </h1>
                <p className="text-xs text-industrial-secondary font-industrial-mono">
                  CONVERSATIONAL AI TASK MANAGEMENT
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <a 
                href="/knowledge-base" 
                className="riveted-button inline-flex items-center px-3 py-2 text-xs font-medium rounded text-industrial-success font-industrial-mono"
                title="Comprehensive knowledge base with metadata, search, export/import"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">KNOWLEDGE BASE</span>
                <span className="sm:hidden">KB</span>
              </a>
              <a 
                href="/code-analysis" 
                target="_blank"
                className="riveted-button inline-flex items-center px-3 py-2 text-xs font-medium rounded text-industrial-accent font-industrial-mono"
                title="GPT-5 powered code analysis"
              >
                <Code className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">CODE ANALYSIS</span>
                <span className="sm:hidden">CODE</span>
              </a>
              <a 
                href="/diary" 
                target="_blank"
                className="riveted-button inline-flex items-center px-3 py-2 text-xs font-medium rounded text-solar-gold font-industrial-mono"
                title="AI autonomous diary with context awareness"
              >
                <Brain className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">AI DIARY</span>
                <span className="sm:hidden">DIARY</span>
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
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Desktop: Side-by-side layout, Mobile: Stacked layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            
            {/* Left Column: AI Workstation */}
            <div className="order-1 lg:order-1">
              <div className="industrial-card solar-panel-texture rounded-lg shadow-xl border-2 border-industrial-accent">
                <div className="p-4 border-b-2 border-industrial-accent/30">
                  <h2 className="text-lg font-semibold text-industrial-primary font-industrial-display flex items-center gap-2">
                    <div className="drone-camera-lens" style={{width: '20px', height: '20px'}}></div>
                    AI Workstation
                  </h2>
                  <p className="text-xs text-industrial-secondary font-industrial-mono mt-1">
                    RESEARCH, KNOWLEDGE MANAGEMENT, AND AI TOOLS
                  </p>
                </div>
                <div className="p-2">
                  <Workstation sessionId={sessionId} />
                </div>
              </div>
            </div>
            
            {/* Right Column: Direct Chat Interface */}
            <div className="order-2 lg:order-2">
              <div className="industrial-card photovoltaic-shimmer rounded-lg shadow-xl border-2 border-solar-gold/50">
                <div className="p-4 border-b-2 border-solar-gold/30">
                  <h2 className="text-lg font-semibold text-industrial-primary font-industrial-display flex items-center gap-2">
                    <div className="aperture-ring" style={{width: '20px', height: '20px'}}></div>
                    Direct Chat with GPT-5
                  </h2>
                  <p className="text-xs text-industrial-secondary font-industrial-mono mt-1">
                    PRIMARY CONVERSATIONAL AI INTERFACE
                  </p>
                </div>
                <div className="p-4">
                  <AutonomousChat sessionId={sessionId} />
                </div>
              </div>
            </div>
            
          </div>

          {/* AI Insight Generation Progress */}
          <div className="mb-6">
            <InsightProgressPanel />
          </div>

          {/* Project-Based Task Management */}
          <div className="industrial-card fine-grid-mesh rounded-lg shadow-xl p-6 mb-6 border border-industrial-accent/30">
            <ProjectManager sessionId={sessionId} />
          </div>

          {/* Settings & Setup - Collapsible Section */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Settings & Setup
                </span>
                <Badge variant="outline" className="text-xs">
                  3 tools
                </Badge>
              </div>
              {showSettings ? (
                <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </Button>
            
            {showSettings && (
              <div className="px-4 pb-4 space-y-4">
                {/* Workflow Suggestions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                  <WorkflowSuggestions sessionId={sessionId} />
                </div>

                {/* Calendar & Scheduling */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-sm p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center mb-4">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Calendar & Task Scheduling
                    </h3>
                    <Badge variant="secondary" className="ml-2">Sync Available</Badge>
                  </div>
                  <CalendarSync sessionId={sessionId} />
                </div>

                {/* n8n Workflow Automation */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                  <WorkflowVisualizer 
                    sessionId={sessionId} 
                  />
                </div>
              </div>
            )}
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