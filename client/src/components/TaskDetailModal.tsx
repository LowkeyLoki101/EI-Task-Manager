import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  CheckCircle2, 
  Play, 
  FileText, 
  Search, 
  Lightbulb,
  Clock,
  User,
  Bot,
  Archive,
  Trash2,
  Edit3,
  Target,
  ChevronRight
} from 'lucide-react';
import type { Task } from '@shared/schema';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

interface TaskProgress {
  research: { completed: boolean; notes: string };
  planning: { completed: boolean; notes: string };
  execution: { completed: boolean; notes: string };
  knowledge: { completed: boolean; notes: string };
  publication: { completed: boolean; notes: string };
}

export default function TaskDetailModal({ task, isOpen, onClose, sessionId }: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [aiNotes, setAiNotes] = useState('');
  const [isAiFocused, setIsAiFocused] = useState(false);
  const queryClient = useQueryClient();

  // Get task progress and details
  const { data: taskDetails, isLoading } = useQuery({
    queryKey: ['/api/tasks/details', task?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${task?.id}/details`);
      return response.json();
    },
    enabled: !!task?.id && isOpen
  });

  // AI Focus mutation - tells AI to work on this specific task
  const aiFocusMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/workstation/ai-focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          taskId: task?.id,
          instruction: `Focus on completing this task: ${task?.title}. ${aiNotes || 'Complete all stages: research, planning, execution, knowledge synthesis, and publication.'}`
        })
      });
      return response.json();
    },
    onSuccess: () => {
      setIsAiFocused(true);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/details', task?.id] });
    }
  });

  // Task completion mutation
  const completeMutation = useMutation({
    mutationFn: async (stage: keyof TaskProgress) => {
      const response = await fetch(`/api/tasks/${task?.id}/complete-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          stage,
          notes: aiNotes
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/details', task?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
    }
  });

  // Archive task mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${task?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
      onClose();
    }
  });

  if (!task) return null;

  const progress: TaskProgress = taskDetails?.progress || {
    research: { completed: false, notes: '' },
    planning: { completed: false, notes: '' },
    execution: { completed: false, notes: '' },
    knowledge: { completed: false, notes: '' },
    publication: { completed: false, notes: '' }
  };

  const completedStages = Object.values(progress).filter(stage => stage.completed).length;
  const totalStages = Object.keys(progress).length;
  const completionPercent = Math.round((completedStages / totalStages) * 100);

  const getStageIcon = (stage: keyof TaskProgress) => {
    switch (stage) {
      case 'research': return <Search className="w-4 h-4" />;
      case 'planning': return <FileText className="w-4 h-4" />;
      case 'execution': return <Target className="w-4 h-4" />;
      case 'knowledge': return <Brain className="w-4 h-4" />;
      case 'publication': return <Archive className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStageName = (stage: keyof TaskProgress) => {
    switch (stage) {
      case 'research': return 'Research & Analysis';
      case 'planning': return 'Planning & Strategy';  
      case 'execution': return 'Execution & Implementation';
      case 'knowledge': return 'Knowledge Synthesis';
      case 'publication': return 'Publication & Documentation';
      default: return stage;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Target className="w-6 h-6" />
            {task.title}
            <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
              {task.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="ai-focus">AI Focus</TabsTrigger>
            <TabsTrigger value="notes">Notes & Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Task Overview
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveTab('ai-focus')}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    AI Focus
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-muted-foreground">{task.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Priority</h4>
                    <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}>
                      {task.priority}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Category</h4>
                    <Badge variant="outline">{task.category}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Context</h4>
                    <Badge variant="outline">{task.context}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Time Window</h4>
                    <Badge variant="outline">{task.timeWindow}</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Progress</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Completion</span>
                      <span>{completionPercent}%</span>
                    </div>
                    <Progress value={completionPercent} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <div className="space-y-3">
              {Object.entries(progress).map(([stage, stageData]) => (
                <Card key={stage} className={`${stageData.completed ? 'border-green-200 bg-green-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${stageData.completed ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                          {getStageIcon(stage as keyof TaskProgress)}
                        </div>
                        <div>
                          <h4 className="font-medium">{getStageName(stage as keyof TaskProgress)}</h4>
                          {stageData.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{stageData.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {stageData.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => completeMutation.mutate(stage as keyof TaskProgress)}
                            disabled={completeMutation.isPending}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai-focus" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Focus Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    Direct the AI to focus specifically on this task. The AI will prioritize this task in its autonomous cycles.
                  </p>
                  {isAiFocused && (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">AI is currently focused on this task</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Additional Instructions (Optional)</h4>
                  <Textarea
                    placeholder="Provide specific instructions for the AI to follow when working on this task..."
                    value={aiNotes}
                    onChange={(e) => setAiNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => aiFocusMutation.mutate()}
                    disabled={aiFocusMutation.isPending}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Focus AI on This Task
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => archiveMutation.mutate()}
                    disabled={archiveMutation.isPending}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Task Notes & Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.notes ? (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                      {task.notes}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No notes available for this task.</p>
                )}

                {task.resources && Array.isArray(task.resources) && task.resources.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Resources</h4>
                    <div className="space-y-2">
                      {task.resources.map((resource: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{resource.title || resource.url || 'Resource'}</span>
                          {resource.url && (
                            <a 
                              href={resource.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline text-sm ml-auto"
                            >
                              Open
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}