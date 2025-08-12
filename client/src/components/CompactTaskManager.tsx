import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Circle, CheckCircle, Clock, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Task {
  id: string;
  title: string;
  description?: string;
  context: string;
  status: string;
  timeWindow?: string;
}

interface CompactTaskManagerProps {
  sessionId: string;
  onVideoSelect?: (video: any) => void;
}

export default function CompactTaskManager({ sessionId, onVideoSelect }: CompactTaskManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTaskDialog, setNewTaskDialog] = useState(false);
  const [autoExpandTimeout, setAutoExpandTimeout] = useState<NodeJS.Timeout | null>(null);

  console.log('[CompactTaskManager Debug] SessionId:', sessionId);

  // Fetch tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['/api/tasks', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?sessionId=${sessionId}`);
      const data = await response.json();
      console.log('[CompactTaskManager Debug] Raw response:', data);
      console.log('[CompactTaskManager Debug] Tasks found:', data.tasks?.length || 0);
      console.log('[CompactTaskManager Debug] Tasks:', data.tasks?.map((t: Task) => ({ title: t.title, sessionId })) || []);
      return data;
    },
    enabled: !!sessionId
  });

  const tasks: Task[] = tasksData?.tasks || [];

  // Auto-expand/collapse logic
  useEffect(() => {
    if (tasks.length > 0 && !isExpanded) {
      // Auto-expand when new tasks are detected
      setIsExpanded(true);
      
      // Auto-collapse after 5 seconds
      if (autoExpandTimeout) {
        clearTimeout(autoExpandTimeout);
      }
      const timeout = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
      setAutoExpandTimeout(timeout);
    }

    return () => {
      if (autoExpandTimeout) {
        clearTimeout(autoExpandTimeout);
      }
    };
  }, [tasks.length]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (newTask: { title: string; description?: string; context?: string; status?: string }) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ...newTask
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
      setNewTaskDialog(false);
      setIsExpanded(true); // Expand to show new task
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tasks/${id}?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
    }
  });

  const handleTaskComplete = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'today' : 'done';
    updateTaskMutation.mutate({ id: taskId, updates: { status: newStatus } });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'doing': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'phone': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'computer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'physical': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="text-center text-gray-500">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 dark:border-gray-700" data-testid="compact-task-manager">
      {/* Compact Header - Always Visible */}
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              data-testid="toggle-tasks"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Your Tasks ({tasks.length})
            </button>
            
            {/* Task Summary - Show when collapsed */}
            {!isExpanded && tasks.length > 0 && (
              <div className="flex gap-2">
                {tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-1">
                    {getStatusIcon(task.status)}
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-24">
                      {task.title}
                    </span>
                  </div>
                ))}
                {tasks.length > 3 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    +{tasks.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          <Dialog open={newTaskDialog} onOpenChange={setNewTaskDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" data-testid="add-task-compact">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <NewTaskForm onSubmit={(task) => createTaskMutation.mutate(task)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No tasks yet. Create one to get started!
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border"
                  data-testid={`compact-task-${task.id}`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => handleTaskComplete(task.id, task.status)}
                      className="hover:scale-110 transition-transform"
                      data-testid={`compact-task-complete-${task.id}`}
                    >
                      {getStatusIcon(task.status)}
                    </button>
                    
                    <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-500' : ''}`}>
                      {task.title}
                    </span>
                    
                    <Badge variant="outline" className={`text-xs ${getContextColor(task.context)}`}>
                      {task.context}
                    </Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                    data-testid={`compact-task-delete-${task.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple Task Form Component
function NewTaskForm({ onSubmit }: { onSubmit: (task: any) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    context: 'computer',
    status: 'today'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      onSubmit(formData);
      setFormData({ title: '', description: '', context: 'computer', status: 'today' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter task title..."
          required
          data-testid="input-task-title"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description..."
          data-testid="input-task-description"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="context">Context</Label>
          <Select value={formData.context} onValueChange={(value) => setFormData({ ...formData, context: value })}>
            <SelectTrigger data-testid="select-task-context">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="computer">Computer</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger data-testid="select-task-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="doing">Doing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button type="submit" data-testid="submit-task">
          Create Task
        </Button>
      </div>
    </form>
  );
}