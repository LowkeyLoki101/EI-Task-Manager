import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Play, FileText, Globe, Wrench, BookOpen, Sparkles, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface Resource {
  id: string;
  type: 'document' | 'website' | 'video' | 'research' | 'tool' | 'guide';
  title: string;
  url?: string;
  content?: string;
  description: string;
  relevance_score: number;
  source: string;
  metadata?: any;
  taskId?: string;
  createdAt: string;
}

interface TaskResourcesProps {
  taskId: string;
  taskTitle: string;
  taskContext?: string;
}

const resourceIcons = {
  document: FileText,
  website: Globe,
  video: Play,
  research: BookOpen,
  tool: Wrench,
  guide: BookOpen
};

const resourceColors = {
  document: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  website: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  video: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  research: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  tool: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  guide: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
};

export function TaskResources({ taskId, taskTitle, taskContext }: TaskResourcesProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const queryClient = useQueryClient();

  // Fetch resources for this task
  const { data: resourcesData, isLoading, error } = useQuery({
    queryKey: ['/api/gpt-supervisor/resources', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/gpt-supervisor/resources/${taskId}`);
      return response.json();
    },
    enabled: !!taskId
  });

  // Discover new resources mutation
  const discoverResourcesMutation = useMutation({
    mutationFn: async () => {
      setIsDiscovering(true);
      const response = await fetch('/api/gpt-supervisor/discover-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle,
          taskContext,
          taskId
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gpt-supervisor/resources', taskId] });
      setIsDiscovering(false);
    },
    onError: () => {
      setIsDiscovering(false);
    }
  });

  // Enhance task with AI
  const enhanceTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/gpt-supervisor/enhance-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gpt-supervisor/resources', taskId] });
    }
  });

  const resources: Resource[] = resourcesData?.resources || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Task Resources
          </CardTitle>
          <CardDescription>AI-discovered resources to help complete this task</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Smart Resources ({resources.length})
            </CardTitle>
            <CardDescription>
              AI-discovered resources to help complete this task
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => discoverResourcesMutation.mutate()}
              disabled={isDiscovering}
              data-testid="button-discover-resources"
            >
              {isDiscovering ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isDiscovering ? 'Discovering...' : 'Find More'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => enhanceTaskMutation.mutate()}
              disabled={enhanceTaskMutation.isPending}
              data-testid="button-enhance-task"
            >
              <Wrench className="h-4 w-4" />
              {enhanceTaskMutation.isPending ? 'Enhancing...' : 'AI Enhance'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No resources discovered yet</p>
            <p className="text-sm mb-4">Click "Find More" to discover helpful resources</p>
            <Button
              variant="outline"
              onClick={() => discoverResourcesMutation.mutate()}
              disabled={isDiscovering}
              data-testid="button-initial-discover"
            >
              {isDiscovering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Discovering Resources...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Discover Resources
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {resources
              .sort((a, b) => b.relevance_score - a.relevance_score)
              .map((resource) => {
                const Icon = resourceIcons[resource.type];
                return (
                  <div
                    key={resource.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`resource-${resource.type}-${resource.id}`}
                  >
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-md ${resourceColors[resource.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-1" title={resource.title}>
                            {resource.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {resource.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {resource.source}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(resource.relevance_score * 100)}% match
                            </span>
                          </div>
                        </div>
                        {resource.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            data-testid={`button-open-resource-${resource.id}`}
                          >
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                      
                      {/* Show content for guides */}
                      {resource.type === 'guide' && resource.content && (
                        <details className="mt-3">
                          <summary className="text-xs cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            View Complete Guide
                          </summary>
                          <div className="mt-2 p-3 bg-muted rounded text-xs whitespace-pre-wrap">
                            {resource.content}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        
        {enhanceTaskMutation.isSuccess && enhanceTaskMutation.data && (
          <div className="mt-4 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
            <h5 className="font-medium text-sm text-green-800 dark:text-green-300 mb-2">
              🤖 AI Enhancement Complete
            </h5>
            <div className="text-xs text-green-700 dark:text-green-400">
              <p>✅ Added {enhanceTaskMutation.data.stepsAdded} suggested steps</p>
              <p>✅ Found {enhanceTaskMutation.data.resources?.length || 0} resources</p>
              {enhanceTaskMutation.data.enhancement?.timeEstimate && (
                <p>⏱️ Estimated time: {enhanceTaskMutation.data.enhancement.timeEstimate}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}