import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
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
  BookOpen,
  Upload,
  File,
  X
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

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  result?: any;
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
  const [showProjectFiles, setShowProjectFiles] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // File Upload Handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'pending'
    }));
    
    setUploadFiles(prev => [...prev, ...newUploadFiles]);
    setShowProjectFiles(true);
    
    // Start uploading files
    newUploadFiles.forEach(uploadFile => {
      uploadSingleFile(uploadFile);
    });
  }, []);

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('sessionId', sessionId);
      formData.append('projectId', selectedProject?.id || 'general');

      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 50, status: 'processing' } : f
      ));

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          progress: 100, 
          status: 'completed', 
          result 
        } : f
      ));

      // Refresh the knowledge base
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/search'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/statistics'] });

      toast({
        title: "File Uploaded",
        description: `"${uploadFile.file.name}" has been added to the project`,
      });

    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f
      ));

      toast({
        title: "Upload Failed",
        description: `Failed to upload "${uploadFile.file.name}"`,
        variant: "destructive",
      });
    }
  };

  const removeUploadFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompletedUploads = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  // Fetch Knowledge Base entries (using correct working endpoint)
  const { data: knowledgeBaseData } = useQuery({
    queryKey: ['/api/knowledge-base/search', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/knowledge-base/search?sessionId=${sessionId}&query=&type=&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge base entries');
      }
      const result = await response.json();
      return {
        results: result.results || [],
        total: result.total || (result.results || []).length
      };
    },
    refetchInterval: 10000,
  });

  const { data: kbStats } = useQuery({
    queryKey: ['/api/knowledge-base/statistics', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/knowledge-base/statistics?sessionId=${sessionId}`);
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Knowledge Base</h2>
            <Badge variant="secondary">{kbStats?.totalEntries || 0} entries</Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setShowKnowledgeBase(!showKnowledgeBase)} 
              size="sm" 
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Search className="w-4 h-4 mr-2" />
              {showKnowledgeBase ? 'Hide' : 'Browse'} Entries
            </Button>
            <a 
              href="/knowledge-base" 
              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-green-900 dark:hover:bg-green-800 transition-colors w-full sm:w-auto"
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
              {knowledgeBaseData?.results && knowledgeBaseData.results.length > 0 ? (
                <div className="space-y-3">
                  {knowledgeBaseData.results.slice(0, 10).map((entry: any) => (
                    <a
                      key={entry.id} 
                      href={`/knowledge-base?entry=${entry.id}`}
                      className="block p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 dark:hover:border-green-700 transition-colors cursor-pointer"
                      data-testid={`knowledge-entry-${entry.id}`}
                      title={`View knowledge base entry: ${entry.title}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900 dark:text-green-100 mb-1 hover:text-green-800 dark:hover:text-green-200">
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
                        <ExternalLink className="w-4 h-4 text-green-600 dark:text-green-400 ml-2 flex-shrink-0" />
                      </div>
                    </a>
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
            
            <div className="space-y-6">
              <p className="text-muted-foreground">{selectedProject.description}</p>
              
              {/* Project File Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Project Files</h3>
                  <Button 
                    onClick={() => setShowProjectFiles(!showProjectFiles)}
                    size="sm" 
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
                
                {showProjectFiles && (
                  <div className="space-y-4">
                    {/* File Drop Zone */}
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      data-testid="project-file-drop-zone"
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg mb-2">Drop project files here</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Documents, code, designs, and research files for {selectedProject.name}
                      </p>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        id="project-file-upload"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.txt,.md,.js,.ts,.py,.jsx,.tsx,.json,.xml,.html,.css,.sql,.png,.jpg,.jpeg,.gif,.sketch,.fig"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('project-file-upload')?.click()}
                        data-testid="button-browse-project-files"
                      >
                        <File className="w-4 h-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>

                    {/* Upload Progress */}
                    {uploadFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Upload Progress</h4>
                          {uploadFiles.some(f => f.status === 'completed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearCompletedUploads}
                              data-testid="button-clear-completed"
                            >
                              Clear Completed
                            </Button>
                          )}
                        </div>
                        {uploadFiles.map(uploadFile => (
                          <div key={uploadFile.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <File className="w-4 h-4" />
                                <span className="font-medium truncate max-w-xs">
                                  {uploadFile.file.name}
                                </span>
                                <Badge 
                                  variant={
                                    uploadFile.status === 'completed' ? 'default' :
                                    uploadFile.status === 'error' ? 'destructive' :
                                    'secondary'
                                  }
                                >
                                  {uploadFile.status}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUploadFile(uploadFile.id)}
                                data-testid={`button-remove-${uploadFile.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            {uploadFile.status === 'uploading' || uploadFile.status === 'processing' ? (
                              <Progress value={uploadFile.progress} className="mb-2" />
                            ) : null}
                            
                            {uploadFile.status === 'completed' && uploadFile.result && (
                              <div className="text-sm text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                Added to project: "{uploadFile.result.title}"
                              </div>
                            )}
                            
                            {uploadFile.status === 'error' && (
                              <div className="text-sm text-red-600">
                                Error: {uploadFile.error || 'Upload failed'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Project Tasks Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Project Tasks</h3>
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