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
  Target,
  Database,
  ExternalLink,
  Search,
  BookOpen
} from 'lucide-react';
import type { Task } from '@shared/schema';
import TaskDetailModal from './TaskDetailModal';

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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);

  // Fetch Knowledge Base entries (using same endpoint as Workstation)
  const { data: knowledgeBaseData } = useQuery({
    queryKey: ['/api/kb/entries', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/kb/entries?sessionId=${sessionId}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge base entries');
      }
      const result = await response.json();
      return {
        results: result.entries || [],
        total: result.total || (result.entries || []).length
      };
    },
    refetchInterval: 10000,
  });

  const { data: kbStats } = useQuery({
    queryKey: ['/api/kb/stats', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/kb/stats?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 10000,
  });

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

      {/* Knowledge Base Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Knowledge Base</h2>
            <Badge variant="secondary">{kbStats?.totalEntries || 0} entries</Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowKnowledgeBase(!showKnowledgeBase)} 
              size="sm" 
              variant="outline"
            >
              <Search className="w-4 h-4 mr-2" />
              {showKnowledgeBase ? 'Hide' : 'Browse'} Entries
            </Button>
            <a 
              href="/knowledge-base" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-green-900 dark:hover:bg-green-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Full Page View
            </a>
          </div>
        </div>

        {showKnowledgeBase && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <BookOpen className="h-5 w-5" />
                Recent Knowledge Base Entries
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              {knowledgeBaseData?.results?.length > 0 ? (
                <div className="space-y-3">
                  {knowledgeBaseData.results.slice(0, 10).map((entry: any) => (
                    <div key={entry.id} className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                            {entry.title}
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                            {entry.content?.substring(0, 150)}...
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                              {entry.type}
                            </Badge>
                            <span className="text-gray-500">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </span>
                            {entry.metadata?.category && (
                              <span className="text-gray-500">
                                • {entry.metadata.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No Knowledge Base entries found</p>
                  <p className="text-sm">Complete tasks to automatically build your knowledge base</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
                  <div 
                    key={task.id} 
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTask(task)}
                  >
                    <CheckCircle2 
                      className={`w-5 h-5 ${task.status === 'done' ? 'text-green-500' : 'text-gray-300'}`} 
                    />
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      {task.context && (
                        <p className="text-sm text-muted-foreground mt-1">{task.context}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{task.status}</Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal 
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        sessionId={sessionId}
      />
    </div>
  );
}