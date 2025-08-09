import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task } from '@shared/schema';

interface SimpleTaskManagerProps {
  sessionId: string;
}

export default function SimpleTaskManager({ sessionId }: SimpleTaskManagerProps) {
  const [statusFilter, setStatusFilter] = useState('all');
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

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: completed ? 'done' : 'backlog' })
    });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'today': return 'bg-blue-100 text-blue-800';
      case 'doing': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContextIcon = (context: string) => {
    switch (context) {
      case 'computer': return '💻';
      case 'phone': return '📱';
      case 'physical': return '🏃';
      default: return '📋';
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900" data-testid="header-tasks">
            Tasks ({tasks.length})
          </h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="doing">Doing</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="h-96 overflow-y-auto" data-testid="tasks-container">
        {isLoading && (
          <div className="p-4 text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">Loading tasks...</p>
          </div>
        )}

        {!isLoading && filteredTasks.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm">No tasks found. Try creating a task through voice or text chat!</p>
          </div>
        )}

        {filteredTasks.map((task: Task) => (
          <div 
            key={task.id} 
            className={`border-b border-slate-100 p-4 hover:bg-slate-50 transition-colors ${
              task.status === 'done' ? 'bg-green-50/50' : ''
            }`}
            data-testid={`task-item-${task.id}`}
          >
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={task.status === 'done'}
                onCheckedChange={(checked) => handleTaskComplete(task.id, !!checked)}
                className="mt-1"
                data-testid={`checkbox-task-${task.id}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 
                    className={`text-sm font-medium ${
                      task.status === 'done' 
                        ? 'text-slate-600 line-through' 
                        : 'text-slate-900'
                    }`}
                    data-testid={`text-task-title-${task.id}`}
                  >
                    {task.title}
                  </h3>
                  <span 
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}
                    data-testid={`text-task-status-${task.id}`}
                  >
                    {task.status}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <span data-testid={`text-task-context-${task.id}`}>
                    {getContextIcon(task.context)} {task.context}
                  </span>
                  <span data-testid={`text-task-timewindow-${task.id}`}>
                    ⏰ {task.timeWindow}
                  </span>
                  <span className="text-slate-400">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {task.description && (
                  <p className="text-xs text-slate-600 mt-2" data-testid={`text-task-description-${task.id}`}>
                    {task.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}