import { useWorkspace } from '@/lib/workspace';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { ResearchScratchpad } from './ResearchScratchpad';
import ContentCreationPanel from './ContentCreationPanel';

export function PanelDock() {
  const { panels, focused, closeTool } = useWorkspace();
  
  if (panels.length === 0) return null;

  return (
    <div className="mt-3 md:mt-4">
      <div className="grid gap-3 md:grid-cols-2">
        {panels.map(p => (
          <div 
            key={p.id}
            data-focused={focused === p.id}
            className={`
              rounded-xl border border-white/10 bg-slate-900/50 p-3 relative
              transition-all duration-200
              ${focused === p.id ? 'ring-2 ring-amber-400/50 border-amber-400/30' : ''}
            `}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => closeTool(p.id)}
              className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-200 z-10"
            >
              <X className="h-3 w-3" />
            </Button>
            
            {/* Panel content */}
            <div className="pr-8">
              <PanelRenderer panel={p} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelRenderer({ panel }: { panel: { id: string; type: string; props?: any } }) {
  const commonProps = {
    sessionId: panel.props?.sessionId || 'default',
    payload: panel.props,
    onUpdate: (data: any) => console.log('[PanelRenderer] Update:', data)
  };

  switch (panel.type) {
    case 'KB':
    case 'knowledge':
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
            📚 Knowledge Base
          </h4>
          <div className="max-h-[300px] overflow-y-auto">
            <KnowledgeBaseManager sessionId={commonProps.sessionId} />
          </div>
        </div>
      );
    
    case 'research':
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
            🔍 Research
          </h4>
          <div className="max-h-[300px] overflow-y-auto">
            <ResearchScratchpad 
              sessionId={commonProps.sessionId} 
              isVisible={true} 
            />
          </div>
        </div>
      );
    
    case 'content':
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
            ✍️ Content Creation
          </h4>
          <div className="max-h-[300px] overflow-y-auto">
            <ContentCreationPanel />
          </div>
        </div>
      );
    
    case 'diary':
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
            🧠 AI Diary
          </h4>
          <div className="max-h-[300px] overflow-y-auto bg-slate-800/30 rounded-lg p-3">
            <p className="text-amber-100/80 text-sm">
              {panel.props?.reflection || 'AI diary system active...'}
            </p>
          </div>
        </div>
      );
    
    default: 
      return (
        <div className="text-center text-amber-200/70 text-sm p-4">
          <div className="opacity-70">Unknown tool: {panel.type}</div>
        </div>
      );
  }
}