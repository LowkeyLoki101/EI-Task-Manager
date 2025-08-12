import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, Plus, CheckCircle, Circle, Clock } from 'lucide-react';
import type { Task } from '@shared/schema';
import type { VideoResource } from '@/lib/types';

interface TaskManagerProps {
  sessionId: string;
  onVideoSelect: (video: VideoResource) => void;
}

export default function TaskManager({ sessionId, onVideoSelect }: TaskManagerProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskDialog, setNewTaskDialog] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: tasksResponse = { tasks: [] }, isLoading } = useQuery({
    queryKey: ['/api/tasks', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 3000,
    enabled: !!sessionId
  });

  // Extract tasks array from response
  const tasks = tasksResponse.tasks || tasksResponse || [];
  
  const filteredTasks = tasks.filter((task: Task) => {
    if (statusFilter === 'all') return true;
    return task.status === statusFilter;
  });

  // Task mutations
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

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
    }
  });

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
    }
  });

  const handleTaskComplete = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'today' : 'done';
    updateTaskMutation.mutate({ id: taskId, updates: { status: newStatus } });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleUpdateTask = (updates: Partial<Task>) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, updates });
      setEditingTask(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleFindVideo = async (task: Task) => {
    try {
      const response = await fetch(`/api/tools/youtube-search?q=${encodeURIComponent(`${task.title} how to tutorial`)}`);
      const data = await response.json();
      
      if (data.videos && data.videos.length > 0) {
        onVideoSelect(data.videos[0]);
        queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
      }
    } catch (error) {
      console.error('Failed to find video:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'doing': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'phone': return 'bg-blue-100 text-blue-800';
      case 'computer': return 'bg-green-100 text-green-800';
      case 'physical': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4" data-testid="task-manager">
      {/* Header with controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Task Manager</h2>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="doing">Doing</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={newTaskDialog} onOpenChange={setNewTaskDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-task-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
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
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              {statusFilter === 'all' 
                ? "No tasks yet. Try saying 'Create a task to buy groceries'" 
                : `No ${statusFilter} tasks found`}
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task: Task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow" data-testid={`task-card-${task.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      onClick={() => handleTaskComplete(task.id, task.status)}
                      className="mt-1 hover:scale-110 transition-transform"
                      data-testid={`task-complete-${task.id}`}
                    >
                      {getStatusIcon(task.status)}
                    </button>
                    
                    <div className="flex-1">
                      <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className={getContextColor(task.context)}>
                          {task.context}
                        </Badge>
                        <Badge variant="outline">
                          {task.status}
                        </Badge>
                        {task.timeWindow !== 'any' && (
                          <Badge variant="outline">
                            {task.timeWindow}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFindVideo(task)}
                      data-testid={`task-video-${task.id}`}
                    >
                      📹
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTask(task)}
                      data-testid={`task-edit-${task.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-500 hover:text-red-700"
                      data-testid={`task-delete-${task.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Task Dialog */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <EditTaskForm
              task={editingTask}
              onSubmit={handleUpdateTask}
              onCancel={() => setEditingTask(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// New Task Form Component
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
          data-testid="new-task-title"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description..."
          data-testid="new-task-description"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="context">Context</Label>
          <Select value={formData.context} onValueChange={(value) => setFormData({ ...formData, context: value })}>
            <SelectTrigger data-testid="new-task-context">
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
            <SelectTrigger data-testid="new-task-status">
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
      
      <div className="flex justify-end space-x-2">
        <Button type="submit" data-testid="new-task-submit">
          Create Task
        </Button>
      </div>
    </form>
  );
}

// Edit Task Form Component
function EditTaskForm({ task, onSubmit, onCancel }: { 
  task: Task; 
  onSubmit: (updates: Partial<Task>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    context: task.context,
    status: task.status,
    timeWindow: task.timeWindow
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-title">Title *</Label>
        <Input
          id="edit-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          data-testid="edit-task-title"
        />
      </div>
      
      <div>
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          data-testid="edit-task-description"
        />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="edit-context">Context</Label>
          <Select value={formData.context} onValueChange={(value) => setFormData({ ...formData, context: value as any })}>
            <SelectTrigger data-testid="edit-task-context">
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
          <Label htmlFor="edit-status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
            <SelectTrigger data-testid="edit-task-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="doing">Doing</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="edit-timeWindow">Time Window</Label>
          <Select value={formData.timeWindow} onValueChange={(value) => setFormData({ ...formData, timeWindow: value as any })}>
            <SelectTrigger data-testid="edit-task-timewindow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Time</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="midday">Midday</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="edit-task-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="edit-task-submit">
          Update Task
        </Button>
      </div>
    </form>
  );
}