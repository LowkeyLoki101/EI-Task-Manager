import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, FileText, Brain, Monitor, Search, Youtube, 
  Maximize2, Minimize2, Grid3x3, ChevronLeft, ChevronRight,
  Download, ExternalLink, Plus, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WorkstationTool {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType<{ payload?: any; onUpdate?: (data: any) => void }>;
}

interface WorkstationProps {
  sessionId: string;
  className?: string;
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
  }
];

export default function Workstation({ sessionId, className = '' }: WorkstationProps) {
  const [activeTool, setActiveTool] = useState<string>('diary');
  const [layout, setLayout] = useState<'solo' | 'split' | 'grid'>('solo');
  const [height, setHeight] = useState(300);
  const [isExpanded, setIsExpanded] = useState(true);
  const [aiThinking, setAiThinking] = useState<string>('');
  const [currentPayload, setCurrentPayload] = useState<any>(null);
  const workstationRef = useRef<HTMLDivElement>(null);

  // Listen for AI workstation control events
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

    const handleAiThinking = (event: CustomEvent) => {
      setAiThinking(event.detail.message || '');
    };

    window.addEventListener('workstation:open', handleWorkstationOpen as EventListener);
    window.addEventListener('workstation:thinking', handleAiThinking as EventListener);

    return () => {
      window.removeEventListener('workstation:open', handleWorkstationOpen as EventListener);
      window.removeEventListener('workstation:thinking', handleAiThinking as EventListener);
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
            <span className="text-sm text-amber-100 font-medium">AI Workstation</span>
            {aiThinking && (
              <Badge variant="secondary" className="bg-amber-900/20 text-amber-300 text-xs">
                {aiThinking}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(true)}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={workstationRef}
      className={`bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 border border-amber-500/30 rounded-lg shadow-2xl backdrop-blur-sm ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-amber-500/20 bg-gradient-to-r from-slate-800/50 to-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse shadow-lg shadow-amber-400/50"></div>
          <div>
            <h3 className="text-sm font-bold text-amber-100">AI WORKSTATION</h3>
            {aiThinking && (
              <p className="text-xs text-amber-300/80 mt-0.5">
                {aiThinking}
              </p>
            )}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
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

      {/* Tool Selector */}
      <div className="flex items-center gap-1 p-2 border-b border-amber-500/10 bg-slate-800/30">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTool(tool.id)}
              className={`
                flex items-center gap-1.5 text-xs h-8 px-3
                ${activeTool === tool.id 
                  ? 'bg-amber-900/30 text-amber-100 border border-amber-500/30 shadow-md' 
                  : 'text-amber-300/70 hover:text-amber-200 hover:bg-amber-900/10'
                }
              `}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tool.name}</span>
            </Button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeToolComponent && (
          <activeToolComponent.component 
            payload={currentPayload}
            onUpdate={setCurrentPayload}
          />
        )}
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
  if (payload?.youtubeId) {
    return (
      <div className="h-full bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${payload.youtubeId}`}
          className="w-full h-full"
          frameBorder="0"
          allowFullScreen
        />
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
    <div className="h-full p-4 bg-gradient-to-b from-slate-800/20 to-gray-900/20">
      <div className="text-center text-amber-200/80 text-sm">
        <Youtube className="h-8 w-8 mx-auto mb-2 opacity-60" />
        <p>Media viewer ready</p>
        <p className="text-xs text-amber-300/60 mt-2">AI can display YouTube videos or images here</p>
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

function ResearchPanel({ payload, onUpdate }: { payload?: any; onUpdate?: (data: any) => void }) {
  const [notes, setNotes] = useState(payload?.notes || '');

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-800/20 to-gray-900/20">
      <div className="p-3 border-b border-amber-500/10">
        <h4 className="text-sm font-medium text-amber-200 flex items-center gap-2">
          <Search className="h-4 w-4" />
          Research Scratchpad
        </h4>
      </div>
      <div className="flex-1 p-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="AI research and analysis will appear here..."
          className="w-full h-full bg-slate-700/20 border border-amber-500/20 rounded text-amber-100 text-sm p-3 resize-none focus:outline-none focus:border-amber-400/40 placeholder-amber-300/40"
        />
      </div>
    </div>
  );
}