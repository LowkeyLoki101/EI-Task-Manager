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
import { Code, BookOpen, Brain, Calendar, Settings, Bot } from 'lucide-react';
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="builder-mode" className="text-xs text-industrial-secondary font-industrial-mono whitespace-nowrap">BUILDER</Label>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Primary Chat Interface - Full Width on Mobile */}
            <div className="lg:col-span-2">
              <div className="industrial-card photovoltaic-shimmer rounded-lg shadow-xl border-2 border-solar-gold/50 h-full">
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
            
            {/* Side Panel: AI Status & Quick Actions */}
            <div className="space-y-4">
              
              {/* AI Insight Progress - Clickable Summary */}
              <div className="industrial-card hex-mesh-pattern rounded-lg shadow-xl border border-industrial-accent/30">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-industrial-primary font-industrial-display flex items-center gap-2 mb-3">
                    <div className="drone-camera-lens" style={{width: '16px', height: '16px'}}></div>
                    AI Activity
                  </h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => window.open('/diary', '_blank')}
                      className="riveted-button-blue w-full px-3 py-2 text-xs font-industrial-mono rounded flex items-center gap-2"
                    >
                      <Brain className="h-3 w-3" />
                      VIEW AI DIARY
                    </button>
                    <button 
                      onClick={() => window.open('/knowledge-base', '_blank')}
                      className="riveted-button w-full px-3 py-2 text-xs font-industrial-mono rounded flex items-center gap-2"
                    >
                      <BookOpen className="h-3 w-3" />
                      KNOWLEDGE BASE
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Workstation - Compact */}
              <div className="industrial-card solar-panel-texture rounded-lg shadow-xl border border-industrial-accent/30">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-industrial-primary font-industrial-display flex items-center gap-2 mb-2">
                    <div className="drone-camera-lens" style={{width: '16px', height: '16px'}}></div>
                    AI Tools
                  </h3>
                  <div className="max-h-48 overflow-hidden">
                    <Workstation sessionId={sessionId} />
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* Project Tasks - Expandable Section */}
          <div className="industrial-card fine-grid-mesh rounded-lg shadow-xl border border-industrial-accent/30">
            <div className="p-4 border-b border-industrial-accent/20 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-industrial-primary font-industrial-display flex items-center gap-2">
                <div className="solar-cell-grid" style={{width: '20px', height: '20px', borderRadius: '4px'}}></div>
                Project Management
              </h3>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="riveted-button px-3 py-1 text-xs font-industrial-mono rounded"
              >
                {showSettings ? 'HIDE' : 'SHOW TASKS'}
              </button>
            </div>
            {showSettings && (
              <div className="p-4">
                <ProjectManager sessionId={sessionId} />
              </div>
            )}
          </div>

          {/* Advanced Tools - Collapsible Section */}
          {showSettings && (
            <div className="mt-6 space-y-4">
              {/* Workflow Automation */}
              <div className="industrial-card carbon-fiber-weave rounded-lg shadow-xl border border-industrial-accent/30">
                <div className="p-4 border-b border-industrial-accent/20">
                  <h3 className="text-lg font-semibold text-industrial-primary font-industrial-display flex items-center gap-2">
                    <Settings className="h-5 w-5 text-industrial-accent" />
                    Advanced Tools
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-industrial-primary font-industrial-display mb-2">Workflow Automation</h4>
                      <WorkflowSuggestions sessionId={sessionId} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-industrial-primary font-industrial-display mb-2">Calendar Integration</h4>
                      <CalendarSync sessionId={sessionId} />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-industrial-primary font-industrial-display mb-2">System Analysis</h4>
                    <GPTSupervisor sessionId={sessionId} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ElevenLabs Voice Widget */}
      <VoiceWidget sessionId={sessionId} />
    </div>
  );
}