import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, FileText, Brain, Monitor, Search, Youtube, Database,
  Maximize2, Minimize2, Grid3x3, ChevronLeft, ChevronRight,
  Download, ExternalLink, Plus, Minus, Eye, Lightbulb, ArrowRight, PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from "@tanstack/react-query";
import { ResearchScratchpad } from './ResearchScratchpad';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';
import ContentCreationPanel from './ContentCreationPanel';

interface WorkstationTool {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType<{ payload?: any; onUpdate?: (data: any) => void; sessionId?: string }>;
}

interface WorkstationProps {
  sessionId: string;
  className?: string;
}

interface WorkstationState {
  mode: 'off' | 'human' | 'hybrid' | 'ai';
  aiActive: boolean;
  lastAiAction: Date | null;
  maintenanceSchedule: string[];
}

interface AutopoieticStatus {
  isActive: boolean;
  currentThinking?: string;
  lensStep?: string;
  lastThought?: string;
  questionPool?: string[];
  cycleCounts?: number;
}

const tools: WorkstationTool[] = [
  {
    id: 'diary',
    name: 'AI Diary',
    icon: Brain,
    component: DiaryPanel
  },
  {
    id: 'docs',
    name: 'Documents',
    icon: FileText,
    component: DocsPanel
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    component: CalendarPanel
  },
  {
    id: 'media',
    name: 'Media',
    icon: Youtube,
    component: MediaPanel
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: Monitor,
    component: BrowserPanel
  },
  {
    id: 'research',
    name: 'Research',
    icon: Search,
    component: ResearchPanel
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    icon: Database,
    component: KnowledgeBasePanel
  },
  {
    id: 'content',
    name: 'Content Creator',
    icon: PenTool,
    component: ContentCreationPanel
  }
];

export default function Workstation({ sessionId, className = '' }: WorkstationProps) {
  const [activeTool, setActiveTool] = useState<string>('diary');
  const [layout, setLayout] = useState<'solo' | 'split' | 'grid'>('solo');
  const [height, setHeight] = useState(300);
  const [isExpanded, setIsExpanded] = useState(true);
  const [aiThinking, setAiThinking] = useState<string>('');
  const [currentPayload, setCurrentPayload] = useState<any>(null);
  const [workstationState, setWorkstationState] = useState<WorkstationState>({
    mode: 'human',
    aiActive: false,
    lastAiAction: null,
    maintenanceSchedule: []
  });
  const [userActions, setUserActions] = useState<string[]>([]);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const workstationRef = useRef<HTMLDivElement>(null);
  const aiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Query autopoietic diary status for mind's eye visualization
  const { data: autopoieticStatus } = useQuery<AutopoieticStatus>({
    queryKey: [`/api/autopoietic/status/${sessionId}`],
    refetchInterval: 3000, // Update every 3 seconds to show thinking in real-time
    enabled: workstationState.mode === 'ai' || workstationState.mode === 'hybrid'
  });

  // AI Autonomous Mode Logic
  useEffect(() => {
    if ((workstationState.mode === 'ai' || workstationState.mode === 'hybrid') && workstationState.aiActive) {
      // AI mode: Very fast thinking (3 seconds) - like human mode speed
      // Hybrid mode: Medium speed (8 seconds) - balanced approach  
      const interval = workstationState.mode === 'ai' ? 3000 : 8000;
      
      // Start AI autonomous behavior
      aiIntervalRef.current = setInterval(() => {
        performAutonomousAiAction();
      }, interval);

      // Initial AI action
      setTimeout(() => {
        performAutonomousAiAction();
      }, 1000);

      return () => {
        if (aiIntervalRef.current) {
          clearInterval(aiIntervalRef.current);
        }
      };
    }
  }, [workstationState.mode, workstationState.aiActive, sessionId]);

  // Human Mode - Log user actions
  const logUserAction = (action: string) => {
    if (workstationState.mode === 'human') {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp}: ${action}`;
      setUserActions(prev => [...prev.slice(-10), logEntry]);
      console.log('[Workstation Human Mode]', logEntry);
      
      // Send to backend for AI observation
      fetch('/api/workstation/human-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: logEntry })
      }).catch(console.error);
    }
  };

  // AI Autonomous Actions
  const performAutonomousAiAction = async () => {
    if (workstationState.mode !== 'ai' && workstationState.mode !== 'hybrid') return;

    try {
      const response = await fetch(`/api/workstation/ai-action/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentTool: activeTool,
          lastAction: workstationState.lastAiAction 
        })
      });

      if (response.ok) {
        const action = await response.json();
        if (action.tool && action.thinking) {
          setAiThinking(action.thinking);
          setActiveTool(action.tool);
          setCurrentPayload(action.payload || null);
          setIsExpanded(true);
          
          setWorkstationState(prev => ({
            ...prev,
            lastAiAction: new Date()
          }));

          // Log AI action
          console.log('[Workstation AI Mode]', action.thinking);
        }
      }
    } catch (error) {
      console.error('[Workstation AI] Action failed:', error);
    }
  };

  // Toggle between modes: off -> human -> hybrid -> ai -> off
  const toggleMode = () => {
    setWorkstationState(prev => {
      let newMode: 'off' | 'human' | 'hybrid' | 'ai';
      
      switch (prev.mode) {
        case 'off':
          newMode = 'human';
          break;
        case 'human':
          newMode = 'hybrid';
          break;
        case 'hybrid':
          newMode = 'ai';
          break;
        case 'ai':
          newMode = 'off';
          break;
        default:
          newMode = 'human';
      }
      
      const newState: WorkstationState = {
        ...prev,
        mode: newMode,
        aiActive: newMode === 'ai' || newMode === 'hybrid'
      };
      
      if (newMode === 'ai') {
        setAiThinking('Initiating full autonomous mode...');
      } else if (newMode === 'hybrid') {
        setAiThinking('Initiating hybrid mode...');
      } else if (newMode === 'off') {
        setAiThinking('');
        setUserActions([]);
      } else {
        setAiThinking('');
        setUserActions([]);
      }
      
      return newState;
    });
  };

  // Listen for external workstation control events
  useEffect(() => {
    const handleWorkstationOpen = (event: CustomEvent) => {
      const { tool, payload, thinking } = event.detail;
      if (tool && tools.find(t => t.id === tool)) {
        setActiveTool(tool);
        setCurrentPayload(payload || null);
        setAiThinking(thinking || '');
        setIsExpanded(true);
      }
    };

    window.addEventListener('workstation:open', handleWorkstationOpen as EventListener);
    return () => {
      window.removeEventListener('workstation:open', handleWorkstationOpen as EventListener);
    };
  }, []);

  const adjustHeight = (delta: number) => {
    setHeight(prev => Math.max(200, Math.min(600, prev + delta)));
  };

  const activeToolComponent = tools.find(t => t.id === activeTool);

  if (!isExpanded) {
    return (
      <div className={`bg-gradient-to-r from-slate-900 via-gray-800 to-slate-900 border border-amber-500/20 rounded-lg ${className}`}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-amber-100 font-medium">AI Mind's Eye</span>
            {(aiThinking || autopoieticStatus?.currentThinking) && (
              <Badge variant="secondary" className="bg-amber-900/20 text-amber-300 text-xs">
                {aiThinking || autopoieticStatus?.currentThinking || 'Thinking...'}
              </Badge>
            )}
            {autopoieticStatus?.isActive && (
              <div className="flex items-center gap-1">
                <Brain className="h-3 w-3 text-blue-400 animate-pulse" />
                <span className="text-xs text-blue-400">
                  {autopoieticStatus.lensStep || 'Processing'}
                </span>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(true)}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={workstationRef}
      className={`relative bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 border-2 border-amber-500/50 rounded-lg shadow-2xl backdrop-blur-sm ring-2 ring-amber-400/20 ${className}`}
      style={{ 
        height: `${height}px`,
        maxHeight: `${height}px`,
        overflow: 'hidden',
        zIndex: 50,  // Increased from 10 to stay above chat
        position: 'relative'  // Ensure it creates stacking context
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-amber-500/20 bg-gradient-to-r from-slate-800/50 to-gray-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shadow-lg ${
            workstationState.mode === 'ai' 
              ? 'bg-amber-400 animate-pulse shadow-amber-400/50' 
              : workstationState.mode === 'hybrid'
              ? 'bg-purple-400 animate-pulse shadow-purple-400/50'
              : workstationState.mode === 'human'
              ? 'bg-blue-400 shadow-blue-400/50'
              : 'bg-gray-400 shadow-gray-400/50'
          }`}></div>
          <div>
            <h3 className="text-sm font-bold text-amber-100">
              AI WORKSTATION
              <span className={`ml-2 text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                workstationState.mode === 'ai' 
                  ? 'bg-amber-900/30 text-amber-300' 
                  : workstationState.mode === 'hybrid'
                  ? 'bg-purple-900/30 text-purple-300'
                  : workstationState.mode === 'human'
                  ? 'bg-blue-900/30 text-blue-300'
                  : 'bg-gray-900/30 text-gray-400'
              }`}
              onClick={() => {
                const modes: WorkstationState['mode'][] = ['human', 'hybrid', 'ai'];
                const currentIndex = modes.indexOf(workstationState.mode);
                const nextMode = modes[(currentIndex + 1) % modes.length];
                setWorkstationState(prev => ({ 
                  ...prev, 
                  mode: nextMode,
                  aiActive: nextMode === 'ai' || nextMode === 'hybrid'
                }));
                console.log(`[Workstation] Switched to ${nextMode} mode`);
                logUserAction(`Switched to ${nextMode} mode`);
              }}
              title="Click to cycle through modes: Human → Hybrid → AI"
              data-testid="mode-switcher">
                {workstationState.mode.toUpperCase()} MODE
              </span>
            </h3>
            {/* Autopoietic Mind's Eye Display */}
            {(workstationState.mode === 'ai' || workstationState.mode === 'hybrid') && autopoieticStatus?.isActive && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Brain className="h-3 w-3 text-blue-400 animate-pulse" />
                  <span className="text-xs text-blue-400 font-mono">
                    {autopoieticStatus.lensStep?.toUpperCase() || 'FRAME'}
                  </span>
                </div>
                <ArrowRight className="h-2 w-2 text-gray-500" />
                <p className="text-xs text-amber-300/80 truncate max-w-xs">
                  {autopoieticStatus.currentThinking || aiThinking || 'Processing thoughts...'}
                </p>
              </div>
            )}
            {aiThinking && !autopoieticStatus?.isActive && (
              <p className="text-xs text-amber-300/80 mt-0.5">
                {aiThinking}
              </p>
            )}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* AI/Human Mode Toggle */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleMode}
            className={`text-xs px-3 border ${
              workstationState.mode === 'ai' 
                ? 'border-amber-500/40 text-amber-300 hover:bg-amber-900/20' 
                : workstationState.mode === 'hybrid'
                ? 'border-purple-500/40 text-purple-300 hover:bg-purple-900/20'
                : workstationState.mode === 'human'
                ? 'border-blue-500/40 text-blue-300 hover:bg-blue-900/20'
                : 'border-gray-500/40 text-gray-400 hover:bg-gray-900/20'
            }`}
          >
            {workstationState.mode === 'off' ? 'Turn On' : 
             workstationState.mode === 'human' ? 'Enable Hybrid' : 
             workstationState.mode === 'hybrid' ? 'Enable AI' : 'Turn Off'}
          </Button>
          
          {/* Fractal Organization Control */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={async () => {
              try {
                setIsOrganizing(true);
                logUserAction('Manual fractal organization triggered');
                
                const response = await fetch(`/api/projects/${sessionId}/organize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                console.log('[Workstation] Fractal organization complete:', result);
                
                // Show success for 3 seconds
                setTimeout(() => setIsOrganizing(false), 3000);
              } catch (error) {
                console.error('[Workstation] Organization failed:', error);
                setIsOrganizing(false);
              }
            }}
            className="text-xs px-3 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-900/20"
            disabled={isOrganizing}
          >
            {isOrganizing ? 'Organizing...' : 'Organize Tasks'}
          </Button>
          
          {/* Height Controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => adjustHeight(-50)}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 h-7 w-7 p-0"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => adjustHeight(50)}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 h-7 w-7 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Layout Controls */}
          <div className="flex items-center gap-1 border-l border-amber-500/20 pl-2">
            <Button 
              variant={layout === 'solo' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('solo')}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 h-7 w-7 p-0"
            >
              <Monitor className="h-3 w-3" />
            </Button>
            <Button 
              variant={layout === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setLayout('grid')}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 h-7 w-7 p-0"
            >
              <Grid3x3 className="h-3 w-3" />
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(false)}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 border-l border-amber-500/20 pl-2 h-7"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* AI Mind's Eye Rolodex - Visual thinking display */}
      {(workstationState.mode === 'ai' || workstationState.mode === 'hybrid') && (
        <div className="px-4 py-2 border-b border-amber-500/10 bg-gradient-to-r from-slate-800/40 to-gray-700/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-mono text-amber-300">MIND'S EYE</span>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 overflow-hidden">
              {autopoieticStatus?.isActive && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-blue-900/30 border-blue-500/50 text-blue-300">
                    {autopoieticStatus.lensStep?.toUpperCase() || 'FRAME'}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-200/90 line-clamp-2 animate-pulse">
                  {autopoieticStatus?.currentThinking || aiThinking || 'Observing and learning...'}
                </p>
              </div>
            </div>
            {autopoieticStatus?.cycleCounts && (
              <div className="text-xs text-gray-500 whitespace-nowrap">
                Cycles: {autopoieticStatus.cycleCounts}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tool Selector */}
      <div className="flex items-center gap-1 p-2 border-b border-amber-500/10 bg-slate-800/30">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const isHumanMode = workstationState.mode === 'human';
          const isAiMode = workstationState.mode === 'ai';
          const shouldBeEnabled = workstationState.mode !== 'off';
          
          const handleClick = () => {
            if (workstationState.mode === 'off') return;
            console.log(`[Workstation] Switching to ${tool.name} tool, current mode: ${workstationState.mode}`);
            
            // Add specific logging for Knowledge Base
            if (tool.id === 'knowledge') {
              console.log('[Workstation] Knowledge Base button clicked - loading entries...');
            }
            
            setActiveTool(tool.id);
            setCurrentPayload(null); // Clear any AI payload when user manually switches
            if (workstationState.mode === 'human' || workstationState.mode === 'hybrid') {
              logUserAction(`Switched to ${tool.name} tool`);
            }
          };
          
          return (
            <Button
              key={tool.id}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              onClick={handleClick}
              disabled={!shouldBeEnabled}
              data-testid={`tool-button-${tool.id}`}
              className={`
                flex items-center gap-1.5 text-xs h-8 px-3 transition-all duration-200
                ${isActive 
                  ? 'bg-amber-900/30 text-amber-100 border border-amber-500/30 shadow-md scale-105' 
                  : 'text-amber-300/70 hover:text-amber-200 hover:bg-amber-900/10'
                }
                ${!shouldBeEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isAiMode && isActive ? 'ring-2 ring-amber-400/50 animate-pulse' : ''}
              `}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tool.name}</span>
            </Button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          {activeToolComponent ? (
            <activeToolComponent.component 
              payload={currentPayload}
              onUpdate={setCurrentPayload}
              sessionId={sessionId}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-800/20 to-gray-900/20">
              <div className="text-center text-amber-200/80 text-sm">
                <div className="text-red-400 mb-2">DEBUG: Tool not found</div>
                <div className="text-xs">Active tool: {activeTool}</div>
                <div className="text-xs">Available tools: {tools.map(t => t.id).join(', ')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tool Components
function DiaryPanel({ payload, onUpdate }: { payload?: any; onUpdate?: (data: any) => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  
  return (
    <div className="h-full p-4 bg-gradient-to-b from-slate-800/20 to-gray-900/20">
      <div className="space-y-3">
        <div className="text-center text-amber-200/80 text-sm">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-60" />
          <p>AI Memory & Insights</p>
        </div>
        {payload?.reflection && (
          <div className="bg-slate-700/30 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-100 text-sm">{payload.reflection}</p>
          </div>
        )}
        <div className="text-xs text-amber-300/60 text-center">
          GPT-5 diary system will appear here
        </div>
      </div>
    </div>
  );
}

function DocsPanel({ payload, onUpdate }: { payload?: any; onUpdate?: (data: any) => void }) {
  const [content, setContent] = useState(payload?.content || '');
  
  const handleExport = async () => {
    try {
      const response = await fetch('/api/artifacts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'document',
          title: payload?.title || 'Workstation Document',
          content,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${payload?.title || 'document'}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-800/20 to-gray-900/20">
      <div className="flex items-center justify-between p-3 border-b border-amber-500/10">
        <h4 className="text-sm font-medium text-amber-200">
          {payload?.title || 'New Document'}
        </h4>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleExport}
          className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 text-xs"
        >
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
      <div className="flex-1 p-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="AI will populate content here or you can write directly..."
          className="w-full h-full bg-slate-700/20 border border-amber-500/20 rounded text-amber-100 text-sm p-3 resize-none focus:outline-none focus:border-amber-400/40 placeholder-amber-300/40"
        />
      </div>
    </div>
  );
}

function CalendarPanel({ payload, onUpdate }: { payload?: any; onUpdate?: (data: any) => void }) {
  return (
    <div className="h-full p-4 bg-gradient-to-b from-slate-800/20 to-gray-900/20">
      <div className="text-center text-amber-200/80 text-sm">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-60" />
        <p>Calendar integration will appear here</p>
        {payload?.event && (
          <div className="mt-3 bg-slate-700/30 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-100 text-sm">{payload.event.title}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaPanel({ payload, onUpdate }: { payload?: any; onUpdate?: (data: any) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/workstation/search-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.videos || []);
      } else {
        console.error('Search failed:', response.statusText);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle video selection
  const handleVideoSelect = (video: any) => {
    setSelectedVideo(video);
    onUpdate?.({ 
      youtubeId: video.videoId, 
      title: video.title, 
      description: video.description 
    });
  };

  // If there's a video from AI or manual selection, display it
  const currentVideo = payload?.youtubeId ? payload : selectedVideo;
  
  if (currentVideo?.youtubeId) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex-1">
          <iframe
            src={`https://www.youtube.com/embed/${currentVideo.youtubeId}`}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
          />
        </div>
        <div className="p-2 bg-slate-900/90 text-xs text-amber-200">
          <p className="font-medium truncate">{currentVideo.title}</p>
          {currentVideo.channelTitle && (
            <p className="text-amber-300/60">{currentVideo.channelTitle}</p>
          )}
        </div>
      </div>
    );
  }

  if (payload?.imageUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/50">
        <img 
          src={payload.imageUrl} 
          alt="Media content" 
          className="max-w-full max-h-full object-contain rounded"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-800/20 to-gray-900/20">
      {/* Search Interface */}
      <div className="p-3 border-b border-amber-500/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search YouTube videos..."
            className="flex-1 bg-slate-700/20 border border-amber-500/20 rounded text-amber-100 text-sm px-3 py-1 focus:outline-none focus:border-amber-400/40 placeholder-amber-300/40"
            data-testid="input-video-search"
          />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 text-xs px-2"
            data-testid="button-search-videos"
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto p-2">
        {isSearching ? (
          <div className="text-center text-amber-200/80 text-sm py-4">
            <Search className="h-6 w-6 mx-auto mb-2 opacity-60 animate-pulse" />
            <p>Searching...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((video, index) => (
              <div
                key={video.videoId}
                onClick={() => handleVideoSelect(video)}
                className="bg-slate-700/20 border border-amber-500/10 rounded p-2 cursor-pointer hover:bg-amber-900/10 hover:border-amber-500/20 transition-colors"
                data-testid={`video-result-${index}`}
              >
                <div className="flex gap-2">
                  <img
                    src={video.thumbnails?.default?.url}
                    alt={video.title}
                    className="w-16 h-12 object-cover rounded bg-slate-600"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-amber-100 text-xs font-medium leading-tight line-clamp-2">{video.title}</h4>
                    <p className="text-amber-300/60 text-xs mt-1">{video.channelTitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-amber-200/80 text-sm">
            <Youtube className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p>Search for videos or let AI suggest content</p>
            <p className="text-xs text-amber-300/60 mt-2">Enter a search term above to find YouTube videos</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BrowserPanel({ payload, onUpdate }: { payload?: any; onUpdate?: (data: any) => void }) {
  if (payload?.url) {
    return (
      <div className="h-full">
        <iframe
          src={payload.url}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    );
  }

  return (
    <div className="h-full p-4 bg-gradient-to-b from-slate-800/20 to-gray-900/20">
      <div className="text-center text-amber-200/80 text-sm">
        <Monitor className="h-8 w-8 mx-auto mb-2 opacity-60" />
        <p>Browser panel ready</p>
        <p className="text-xs text-amber-300/60 mt-2">AI can load websites here</p>
      </div>
    </div>
  );
}

function ResearchPanel({ payload, onUpdate, sessionId }: { payload?: any; onUpdate?: (data: any) => void; sessionId?: string }) {
  // Enhanced research panel that displays real AI research results
  return (
    <div className="h-full w-full relative overflow-hidden">
      <ResearchScratchpad 
        sessionId={sessionId || 's_njlk7hja5y9'}
        isVisible={true}
        isWorkstationMode={true}
      />
    </div>
  );
}