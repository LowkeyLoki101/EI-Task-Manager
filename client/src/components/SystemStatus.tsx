import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { SystemStats } from '@shared/schema';

interface SystemStatusProps {
  sessionId: string;
}

export default function SystemStatus({ sessionId }: SystemStatusProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/stats', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/stats?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 10000,
    enabled: !!sessionId
  });

  const handleExportTasks = () => {
    // TODO: Implement task export functionality
    console.log('Exporting tasks...');
  };

  const handleClearSession = () => {
    if (confirm('Are you sure you want to clear this session? This cannot be undone.')) {
      localStorage.removeItem('ei_session');
      window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900">System Status</h2>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Service Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">GPT-5 Supervisor</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-success rounded-full" data-testid="status-gpt5" />
              <span className="text-xs text-success">Online</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Voice Widget</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-success rounded-full" data-testid="status-voice" />
              <span className="text-xs text-success">Connected</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">File Storage</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-success rounded-full" data-testid="status-storage" />
              <span className="text-xs text-success">Ready</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">YouTube API</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-warning rounded-full" data-testid="status-youtube" />
              <span className="text-xs text-warning">Limited</span>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="border-t border-slate-200 pt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="animate-pulse bg-slate-200 h-6 w-8 mx-auto mb-1 rounded" />
                <div className="text-xs text-slate-500">Total Tasks</div>
              </div>
              <div>
                <div className="animate-pulse bg-slate-200 h-6 w-8 mx-auto mb-1 rounded" />
                <div className="text-xs text-slate-500">Files Processed</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-slate-900" data-testid="text-total-tasks">
                  {stats?.totalTasks || 0}
                </div>
                <div className="text-xs text-slate-500">Total Tasks</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900" data-testid="text-files-processed">
                  {stats?.filesProcessed || 0}
                </div>
                <div className="text-xs text-slate-500">Files Processed</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportTasks}
            className="w-full text-sm"
            data-testid="button-export-tasks"
          >
            Export Tasks
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearSession}
            className="w-full text-sm"
            data-testid="button-clear-session"
          >
            Clear Session
          </Button>
        </div>
      </div>
    </div>
  );
}
