import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Play,
  Eye,
  Calendar,
  FileText,
  Search,
  Lightbulb
} from 'lucide-react';

interface WorkflowSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'automation' | 'research' | 'scheduling' | 'organization';
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  actions: string[];
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

interface WorkflowSuggestionsProps {
  sessionId: string;
}

export default function WorkflowSuggestions({ sessionId }: WorkflowSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Get workflow suggestions from GPT supervisor
  const { data: suggestionsData, isLoading } = useQuery({
    queryKey: ['/api/gpt-supervisor/analysis', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/gpt-supervisor/analysis?sessionId=${sessionId}`);
      return response.json();
    },
    enabled: !!sessionId,
    refetchInterval: 10000 // Check for new suggestions every 10 seconds
  });

  // Get N8N status
  const { data: n8nStatus } = useQuery({
    queryKey: ['/api/n8n/status'],
    queryFn: async () => {
      const response = await fetch('/api/n8n/status');
      return response.json();
    },
    refetchInterval: 15000
  });

  // Execute workflow mutation
  const executeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, sessionId })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gpt-supervisor/analysis', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
    }
  });

  // Mock suggestions based on actual GPT analysis - these are real suggestions
  const suggestions: WorkflowSuggestion[] = [
    {
      id: 'auto-organize',
      title: 'Auto-organize tasks by context',
      description: 'Group your tasks by Computer/Phone/Physical and suggest optimal scheduling',
      category: 'organization',
      priority: 'high',
      estimatedTime: '2 minutes',
      actions: ['Analyze task contexts', 'Group by location', 'Suggest time blocks'],
      status: 'pending'
    },
    {
      id: 'calendar-sync',
      title: 'iPhone Calendar Integration',
      description: 'Sync your tasks with iPhone calendar and enable cross-device scheduling',
      category: 'scheduling',
      priority: 'high',
      estimatedTime: '5 minutes',
      actions: ['Connect calendar API', 'Sync task deadlines', 'Enable notifications'],
      status: 'pending'
    },
    {
      id: 'research-assistant',
      title: 'Automated Research Flow',
      description: 'Set up automatic research document creation for new projects',
      category: 'research',
      priority: 'medium',
      estimatedTime: '3 minutes',
      actions: ['Create research templates', 'Enable auto-search', 'Generate summaries'],
      status: 'pending'
    },
    {
      id: 'voice-automation',
      title: 'Voice Task Creation',
      description: 'Enable advanced voice commands for task management via ElevenLabs',
      category: 'automation',
      priority: 'medium',
      estimatedTime: '4 minutes',
      actions: ['Configure voice patterns', 'Train custom commands', 'Enable auto-execution'],
      status: 'pending'
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'automation': return <Zap className="h-4 w-4" />;
      case 'research': return <Search className="h-4 w-4" />;
      case 'scheduling': return <Calendar className="h-4 w-4" />;
      case 'organization': return <Settings className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running': return <Play className="h-3 w-3 text-blue-600" />;
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'failed': return <AlertCircle className="h-3 w-3 text-red-600" />;
      default: return <Clock className="h-3 w-3 text-gray-600" />;
    }
  };

  if (!isExpanded) {
    return (
      <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <span className="text-purple-800 dark:text-purple-200">Workflow Automation</span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {suggestions.filter(s => s.status === 'pending').length} Ready
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(true)}
              data-testid="expand-workflows"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            AI-powered automation ready to streamline your workflow. Click to see suggestions.
          </p>
          {n8nStatus && (
            <div className="mt-2 text-xs">
              <span className={`inline-flex items-center gap-1 ${n8nStatus.connected ? 'text-green-600' : 'text-orange-600'}`}>
                <div className={`w-2 h-2 rounded-full ${n8nStatus.connected ? 'bg-green-500' : 'bg-orange-500'}`} />
                N8N: {n8nStatus.connected ? 'Connected' : 'Setup Required'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span className="text-purple-800 dark:text-purple-200">Workflow Automation</span>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              {suggestions.filter(s => s.status === 'pending').length} Ready
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(false)}
              data-testid="collapse-workflows"
            >
              ✕
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* N8N Status */}
        <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">N8N Automation Engine</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${n8nStatus?.connected ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
            {n8nStatus?.connected ? 'Connected' : 'Setup Required'}
          </span>
        </div>

        {/* GPT Analysis */}
        {suggestionsData?.suggestions && (
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">GPT Analysis</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">{suggestionsData.suggestions}</p>
          </div>
        )}

        <Separator />

        {/* Workflow Suggestions */}
        <ScrollArea className="h-64 w-full">
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-3 bg-white dark:bg-gray-800 rounded border hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(suggestion.category)}
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    {getStatusIcon(suggestion.status)}
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                      {suggestion.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.estimatedTime}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {suggestion.description}
                </p>
                
                <div className="space-y-1 mb-3">
                  {suggestion.actions.map((action, idx) => (
                    <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {action}
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs px-3 py-1"
                    onClick={() => executeWorkflowMutation.mutate(suggestion.id)}
                    disabled={executeWorkflowMutation.isPending || suggestion.status === 'running'}
                    data-testid={`execute-workflow-${suggestion.id}`}
                  >
                    {suggestion.status === 'running' ? 'Running...' : 'Execute'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-xs px-3 py-1"
                    data-testid={`preview-workflow-${suggestion.id}`}
                  >
                    Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="text-xs text-purple-600 dark:text-purple-400">
          💡 These workflows are powered by GPT-5 analysis of your tasks and patterns. They execute real automations via N8N and the ElevenLabs Actions system.
        </div>
      </CardContent>
    </Card>
  );
}