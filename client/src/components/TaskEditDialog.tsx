import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Edit3, 
  Calendar as CalendarIcon, 
  Plus, 
  X, 
  Link,
  FileText,
  Tag
} from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
  context: string;
  status: string;
  timeWindow?: string;
  tags?: string[];
  priority?: string;
  category?: string;
  dueDate?: string;
  resources?: Array<{type: string; title: string; url: string}>;
  notes?: string;
}

interface TaskEditDialogProps {
  task: Task;
  sessionId: string;
  trigger?: React.ReactNode;
}

export default function TaskEditDialog({ task, sessionId, trigger }: TaskEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    context: task.context || 'computer',
    status: task.status || 'backlog',
    timeWindow: task.timeWindow || 'any',
    priority: task.priority || 'medium',
    category: task.category || 'general',
    tags: task.tags || [],
    notes: task.notes || '',
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    resources: task.resources || []
  });

  const [newTag, setNewTag] = useState('');
  const [newResource, setNewResource] = useState({ type: 'link', title: '', url: '' });

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] });
      setOpen(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      ...formData,
      dueDate: formData.dueDate?.toISOString()
    };

    updateTaskMutation.mutate(updates);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addResource = () => {
    if (newResource.title.trim() && newResource.url.trim()) {
      setFormData(prev => ({
        ...prev,
        resources: [...prev.resources, { ...newResource }]
      }));
      setNewResource({ type: 'link', title: '', url: '' });
    }
  };

  const removeResource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" data-testid={`edit-task-${task.id}`}>
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
                required
                data-testid="input-task-title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the task"
                rows={3}
                data-testid="input-task-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger data-testid="select-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="doing">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="context">Context</Label>
                <Select value={formData.context} onValueChange={(value) => setFormData(prev => ({ ...prev, context: value }))}>
                  <SelectTrigger data-testid="select-task-context">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="computer">💻 Computer</SelectItem>
                    <SelectItem value="phone">📱 Phone</SelectItem>
                    <SelectItem value="physical">🏃 Physical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeWindow">Time Window</Label>
                <Select value={formData.timeWindow} onValueChange={(value) => setFormData(prev => ({ ...prev, timeWindow: value }))}>
                  <SelectTrigger data-testid="select-task-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">🌅 Morning</SelectItem>
                    <SelectItem value="midday">☀️ Midday</SelectItem>
                    <SelectItem value="evening">🌙 Evening</SelectItem>
                    <SelectItem value="any">⏰ Any Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., work, personal, project"
                  data-testid="input-task-category"
                />
              </div>

              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-due-date">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, "MMM dd, yyyy") : "Set due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                    />
                    {formData.dueDate && (
                      <div className="p-3 border-t">
                        <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, dueDate: undefined }))}>
                          Clear Date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                data-testid="input-new-tag"
              />
              <Button type="button" variant="outline" onClick={addTag} data-testid="button-add-tag">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Resources */}
          <div>
            <Label className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Resources & Links
            </Label>
            <div className="space-y-2 mb-3">
              {formData.resources.map((resource, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{resource.title}</div>
                    <div className="text-xs text-muted-foreground">{resource.url}</div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeResource(index)}
                    data-testid={`button-remove-resource-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={newResource.type} onValueChange={(value) => setNewResource(prev => ({ ...prev, type: value }))}>
                <SelectTrigger data-testid="select-resource-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">🔗 Link</SelectItem>
                  <SelectItem value="file">📎 File</SelectItem>
                  <SelectItem value="document">📄 Document</SelectItem>
                  <SelectItem value="video">🎥 Video</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newResource.title}
                onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                data-testid="input-resource-title"
              />
              <Input
                value={newResource.url}
                onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                placeholder="URL"
                data-testid="input-resource-url"
              />
            </div>
            <Button type="button" variant="outline" onClick={addResource} className="mt-2" data-testid="button-add-resource">
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes, thoughts, or reminders"
              rows={3}
              data-testid="input-task-notes"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateTaskMutation.isPending || !formData.title.trim()}
              data-testid="button-save-task"
            >
              {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}