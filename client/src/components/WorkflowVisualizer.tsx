import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Workflow, Play, Bot, Zap, GitBranch, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { Task } from '@shared/schema';

interface WorkflowVisualizerProps {
  sessionId: string;
  currentTask?: Task;
}

interface WorkflowSuggestion {
  type: string;
  name: string;
  description: string;
  nodes: string[];
  useCase: string;
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowVisualizer({ sessionId, currentTask }: WorkflowVisualizerProps) {
  const [createWorkflowDialog, setCreateWorkflowDialog] = useState(false);
  const [llmPrompt, setLlmPrompt] = useState('');
  const queryClient = useQueryClient();

  // Get current tasks to find a default current task if not provided
  const { data: tasksData } = useQuery({
    queryKey: ['/api/tasks', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?sessionId=${sessionId}`);
      return response.json();
    }
  });

  // Use provided currentTask or find one from tasks
  const effectiveCurrentTask = currentTask || 
    (tasksData?.tasks?.find((t: Task) => t.status === 'today') || tasksData?.tasks?.[0]);

  // Check n8n connection status
  const { data: n8nStatus } = useQuery({
    queryKey: ['/api/n8n/status'],
    queryFn: async () => {
      const response = await fetch('/api/n8n/status');
      return response.json();
    },
    refetchInterval: 10000
  });

  // Get all workflows
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['/api/n8n/workflows', sessionId],
    queryFn: async () => {
      const response = await fetch('/api/n8n/workflows');
      return response.json();
    },
    enabled: n8nStatus?.connected
  });

  // Get workflow suggestions for current task
  const { data: suggestionsData } = useQuery({
    queryKey: ['/api/n8n/suggest-workflows', effectiveCurrentTask?.id],
    queryFn: async () => {
      if (!effectiveCurrentTask) return { suggestions: [] };
      const response = await fetch('/api/n8n/suggest-workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: effectiveCurrentTask.title,
          taskContext: effectiveCurrentTask.context,
          sessionId
        })
      });
      return response.json();
    },
    enabled: !!effectiveCurrentTask
  });

  // Create workflow from task
  const createTaskWorkflow = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/n8n/workflows/from-task/${taskId}`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/n8n/workflows'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  // Create LLM automation workflow
  const createLlmWorkflow = useMutation({
    mutationFn: async ({ prompt, taskId }: { prompt: string; taskId?: string }) => {
      const response = await fetch('/api/n8n/workflows/llm-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, taskId })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/n8n/workflows'] });
      setCreateWorkflowDialog(false);
      setLlmPrompt('');
    }
  });

  // Execute workflow
  const executeWorkflow = useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await fetch(`/api/n8n/workflows/${workflowId}/execute`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/n8n/executions'] });
    }
  });

  const workflows = workflowsData?.workflows || [];
  const suggestions = suggestionsData?.suggestions || [];

  if (!n8nStatus?.connected) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertCircle className="h-5 w-5" />
            n8n Workflow Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-orange-700 dark:text-orange-300">
              n8n automation engine is not connected.
            </p>
            <div className="p-4 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                <strong>To enable workflow automation:</strong>
              </p>
              <ol className="text-sm text-orange-700 dark:text-orange-300 space-y-1 ml-4 list-decimal">
                <li>Install Docker on your system</li>
                <li>Run: <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">docker run -d --name n8n -p 5678:5678 docker.n8n.io/n8nio/n8n</code></li>
                <li>Visit <a href="http://localhost:5678" target="_blank" rel="noopener noreferrer" className="underline">http://localhost:5678</a> to configure n8n</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            n8n Workflow Automation
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Visual workflow automation with 400+ integrations and AI capabilities.
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Dialog open={createWorkflowDialog} onOpenChange={setCreateWorkflowDialog}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <Bot className="h-8 w-8 mx-auto text-purple-500" />
                  <h3 className="font-semibold">LLM Automation</h3>
                  <p className="text-sm text-gray-600">Create AI-powered workflows</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create LLM Automation Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="llm-prompt">AI Automation Prompt</Label>
                <Textarea
                  id="llm-prompt"
                  placeholder="Describe what you want the AI to automate... (e.g., 'Analyze this data and send a summary email', 'Generate social media posts for this content')"
                  value={llmPrompt}
                  onChange={(e) => setLlmPrompt(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
              <Button 
                onClick={() => createLlmWorkflow.mutate({ 
                  prompt: llmPrompt, 
                  taskId: effectiveCurrentTask?.id 
                })}
                disabled={!llmPrompt.trim() || createLlmWorkflow.isPending}
                className="w-full"
              >
                {createLlmWorkflow.isPending ? 'Creating...' : 'Create AI Workflow'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {effectiveCurrentTask && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => createTaskWorkflow.mutate(effectiveCurrentTask.id)}
          >
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center space-y-2">
                <Zap className="h-8 w-8 mx-auto text-blue-500" />
                <h3 className="font-semibold">Automate Task</h3>
                <p className="text-sm text-gray-600">Create workflow for current task</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center space-y-2">
              <GitBranch className="h-8 w-8 mx-auto text-green-500" />
              <h3 className="font-semibold">Browse Templates</h3>
              <p className="text-sm text-gray-600">900+ ready-to-use workflows</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Suggested Workflows for "{effectiveCurrentTask?.title}"
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {suggestions.map((suggestion: WorkflowSuggestion, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-semibold">{suggestion.name}</h4>
                      <p className="text-sm text-gray-600">{suggestion.description}</p>
                      <div className="flex gap-2 flex-wrap">
                        {suggestion.nodes.map((node: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {node}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-blue-600">{suggestion.useCase}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Workflows ({workflows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workflowsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8">
              <Workflow className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No workflows created yet</p>
              <p className="text-sm text-gray-500">Create your first automation workflow above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow: N8nWorkflow) => (
                <div key={workflow.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-semibold">{workflow.name}</h4>
                    <p className="text-sm text-gray-600">
                      {workflow.nodes?.length || 0} nodes • 
                      Created {new Date(workflow.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={workflow.active ? "default" : "secondary"}>
                      {workflow.active ? "Active" : "Inactive"}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => executeWorkflow.mutate(workflow.id)}
                      disabled={executeWorkflow.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}