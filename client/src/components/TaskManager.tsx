import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TaskWithSubtasks } from '@shared/schema';
import type { VideoResource } from '@/lib/types';

interface TaskManagerProps {
  sessionId: string;
  onVideoSelect: (video: VideoResource) => void;
}

export default function TaskManager({ sessionId, onVideoSelect }: TaskManagerProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['/api/tasks', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 3000,
    enabled: !!sessionId
  });

  const filteredTasks = tasks.filter((task: TaskWithSubtasks) => {
    if (statusFilter === 'all') return true;
    return task.status === statusFilter;
  });

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: completed ? 'done' : 'todo' })
    });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
  };

  const handleFindVideo = async (task: TaskWithSubtasks) => {
    try {
      const response = await fetch(`/api/tools/youtube-search?q=${encodeURIComponent(`${task.title} how to tutorial`)}`);
      const data = await response.json();
      
      if (data.videos && data.videos.length > 0) {
        onVideoSelect(data.videos[0]);
        
        // Update task with video attachment
        const updatedAttachments = [
          ...(task.attachments || []),
          {
            name: data.videos[0].title,
            url: data.videos[0].embedUrl,
            type: 'video' as const
          }
        ];
        
        await fetch(`/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachments: updatedAttachments })
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
      }
    } catch (error) {
      console.error('Failed to find video:', error);
    }
  };

  const addNewTask = async () => {
    const title = prompt('Enter task title:');
    if (!title || !sessionId) return;
    
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        title,
        status: 'todo',
        priority: 'med'
      })
    });
    
    queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-error/10 text-error';
      case 'med': return 'bg-warning/10 text-warning';
      case 'low': return 'bg-success/10 text-success';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-success/10 text-success';
      case 'doing': return 'bg-primary/10 text-primary';
      case 'blocked': return 'bg-error/10 text-error';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={addNewTask}
              variant="ghost" 
              className="text-sm text-primary hover:text-blue-700 font-medium"
              data-testid="button-add-task"
            >
              + Add Task
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="doing">In Progress</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="h-96 overflow-y-auto conversation-scroll" data-testid="tasks-container">
        {isLoading && (
          <div className="p-4 text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">Loading tasks...</p>
          </div>
        )}

        {!isLoading && filteredTasks.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No tasks yet. Start by adding a new task or talking to the assistant!</p>
          </div>
        )}

        {filteredTasks.map((task: TaskWithSubtasks) => (
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
                <div className="flex items-center space-x-2 mb-1">
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
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}
                    data-testid={`text-task-priority-${task.id}`}
                  >
                    {task.priority}
                  </span>
                  {task.status !== 'todo' && (
                    <span 
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}
                      data-testid={`text-task-status-${task.id}`}
                    >
                      {task.status}
                    </span>
                  )}
                </div>
                {task.due && (
                  <p className="text-xs text-slate-500 mb-2" data-testid={`text-task-due-${task.id}`}>
                    Due: {new Date(task.due).toLocaleDateString()}
                  </p>
                )}
                
                {task.status !== 'done' && (
                  <div className="flex items-center space-x-3 text-xs mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFindVideo(task)}
                      className="h-6 px-2 text-primary hover:text-blue-700"
                      data-testid={`button-find-video-${task.id}`}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Find Video
                    </Button>
                  </div>
                )}
                
                {/* Subtasks */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {task.subtasks.map((subtask: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 ml-4">
                        <Checkbox 
                          checked={subtask.status === 'done'}
                          className="w-3 h-3"
                          data-testid={`checkbox-subtask-${task.id}-${index}`}
                        />
                        <span 
                          className={`text-xs ${
                            subtask.status === 'done' 
                              ? 'text-slate-600 line-through' 
                              : 'text-slate-600'
                          }`}
                          data-testid={`text-subtask-${task.id}-${index}`}
                        >
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Attachments */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="mt-2 flex items-center space-x-2">
                    {task.attachments.map((attachment: any, index: number) => (
                      <div 
                        key={index}
                        className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer hover:bg-blue-100"
                        onClick={() => {
                          if (attachment.type === 'video') {
                            onVideoSelect({
                              id: '',
                              title: attachment.name,
                              description: '',
                              thumbnail: '',
                              url: attachment.url,
                              embedUrl: attachment.url
                            });
                          }
                        }}
                        data-testid={`attachment-${task.id}-${index}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {attachment.type === 'video' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          )}
                          {attachment.type === 'document' && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          )}
                        </svg>
                        <span>{attachment.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            <span className="font-medium text-slate-900" data-testid="text-active-tasks">
              {filteredTasks.filter((t: TaskWithSubtasks) => t.status !== 'done').length}
            </span> active tasks
          </span>
          <span className="text-slate-600">
            <span className="font-medium text-success" data-testid="text-completed-tasks">
              {filteredTasks.filter((t: TaskWithSubtasks) => t.status === 'done').length}
            </span> completed
          </span>
        </div>
      </div>
    </div>
  );
}
