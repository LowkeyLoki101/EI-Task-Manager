import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FolderOpen, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  BarChart3,
  Users,
  Lightbulb,
  Zap,
  FileText,
  Target
} from 'lucide-react';
import type { Task } from '@shared/schema';

interface Project {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  completedTasks: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'paused' | 'completed';
  category: string;
  icon: any;
  tasks: Task[];
}

interface ProjectManagerProps {
  sessionId: string;
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'real work': return Target;
    case 'solar/energy': return Zap;
    case 'ai/development': return Lightbulb;
    case 'blog/content': return FileText;
    case 'customer/business': return Users;
    default: return FolderOpen;
  }
};

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'real work': return 'bg-green-500';
    case 'solar/energy': return 'bg-yellow-500';
    case 'ai/development': return 'bg-blue-500';
    case 'blog/content': return 'bg-purple-500';
    case 'customer/business': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

export default function ProjectManager({ sessionId }: ProjectManagerProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // Fetch tasks and automatically organize into projects
  const { data: tasksResponse = { tasks: [] }, isLoading } = useQuery({
    queryKey: ['/api/tasks', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 5000,
    enabled: !!sessionId
  });

  const tasks = Array.isArray(tasksResponse?.tasks) ? tasksResponse.tasks : [];

  // Auto-organize tasks into projects
  const projects: Project[] = [
    {
      id: 'real-work',
      name: 'Real Work Projects',
      description: 'Your actual business tasks and meetings',
      category: 'Real Work',
      priority: 'urgent',
      status: 'active',
      icon: Target,
      tasks: tasks.filter((task: Task) => task.tags?.includes('real-work')),
      taskCount: 0,
      completedTasks: 0
    },
    {
      id: 'solar-energy',
      name: 'Solar & Energy Research',
      description: 'Renewable energy analysis, solar technology research',
      category: 'Solar/Energy', 
      priority: 'medium',
      status: 'active',
      icon: Zap,
      tasks: tasks.filter((task: Task) => {
        const title = task.title.toLowerCase();
        return title.includes('solar') || title.includes('energy') || title.includes('renewable');
      }),
      taskCount: 0,
      completedTasks: 0
    },
    {
      id: 'ai-development',
      name: 'AI Development',
      description: 'Artificial intelligence research and automation projects',
      category: 'AI/Development',
      priority: 'high',
      status: 'active', 
      icon: Lightbulb,
      tasks: tasks.filter((task: Task) => {
        const title = task.title.toLowerCase();
        return title.includes('ai') || title.includes('artificial') || title.includes('automation');
      }),
      taskCount: 0,
      completedTasks: 0
    },
    {
      id: 'content-blog',
      name: 'Content & Blog Posts',
      description: 'Blog writing, content creation, and publishing',
      category: 'Blog/Content',
      priority: 'medium',
      status: 'active',
      icon: FileText,
      tasks: tasks.filter((task: Task) => {
        const title = task.title.toLowerCase();
        return title.includes('blog') || title.includes('draft') || title.includes('post');
      }),
      taskCount: 0,
      completedTasks: 0
    },
    {
      id: 'customer-business',
      name: 'Customer Operations',
      description: 'Client management, customer service, and business operations',
      category: 'Customer/Business',
      priority: 'high',
      status: 'active',
      icon: Users,
      tasks: tasks.filter((task: Task) => {
        const title = task.title.toLowerCase();
        return title.includes('customer') || title.includes('client') || title.includes('service');
      }),
      taskCount: 0,
      completedTasks: 0
    }
  ];

  // Calculate task counts and completion rates  
  projects.forEach(project => {
    project.taskCount = project.tasks.length;
    project.completedTasks = project.tasks.filter(task => task.status === 'done').length;
  });

  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter((task: Task) => task.status === 'done').length;

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
                <div className="text-2xl font-bold">{totalTasks}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Completed</div>
                <div className="text-2xl font-bold">{totalCompleted}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FolderOpen className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-sm text-muted-foreground">Projects</div>
                <div className="text-2xl font-bold">{projects.filter(p => p.taskCount > 0).length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-sm text-muted-foreground">In Progress</div>
                <div className="text-2xl font-bold">{totalTasks - totalCompleted}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Projects</h2>
          <Button onClick={() => setShowCreateProject(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="grid gap-4">
          {projects
            .filter(project => project.taskCount > 0)
            .sort((a, b) => {
              // Sort by priority: Real Work first, then by task count
              if (a.category === 'Real Work') return -1;
              if (b.category === 'Real Work') return 1;
              return b.taskCount - a.taskCount;
            })
            .map((project) => {
              const Icon = project.icon;
              const progress = project.taskCount > 0 ? (project.completedTasks / project.taskCount) * 100 : 0;
              
              return (
                <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedProject(project)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(project.category)}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                          
                          <div className="flex items-center gap-4 mt-3">
                            <Badge variant={project.priority === 'urgent' ? 'destructive' : 'secondary'}>
                              {project.priority}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {project.taskCount} tasks
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {project.completedTasks} completed
                            </span>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      {/* Project Detail Dialog */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <selectedProject.icon className="w-6 h-6" />
                {selectedProject.name}
                <Badge>{selectedProject.taskCount} tasks</Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedProject.description}</p>
              
              <div className="space-y-2">
                {selectedProject.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle2 
                      className={`w-5 h-5 ${task.status === 'done' ? 'text-green-500' : 'text-gray-300'}`} 
                    />
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      {task.context && (
                        <p className="text-sm text-muted-foreground mt-1">{task.context}</p>
                      )}
                    </div>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}