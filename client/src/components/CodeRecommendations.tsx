import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Code, 
  FileText, 
  Download,
  Play,
  Brain,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CodeRecommendation {
  id: string;
  sessionId: string;
  type: 'improvement' | 'bug_fix' | 'feature' | 'optimization' | 'security' | 'refactor';
  title: string;
  description: string;
  recommendation: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: 'quick' | 'moderate' | 'substantial' | 'major';
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  votes: number;
  confidence: number;
  filePath?: string;
  codeSnippet?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CodeRecommendationsProps {
  sessionId: string;
}

export function CodeRecommendations({ sessionId }: CodeRecommendationsProps) {
  const [filter, setFilter] = useState<{
    type?: string;
    status?: string;
    priority?: string;
  }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recommendations
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['/api/code-recommendations', sessionId, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.type) params.append('type', filter.type);
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);
      
      const response = await apiRequest(`/api/code-recommendations/${sessionId}?${params}`);
      return response.recommendations;
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ recommendationId, voteType, feedback }: {
      recommendationId: string;
      voteType: 'up' | 'down';
      feedback?: string;
    }) => {
      return await apiRequest(`/api/code-recommendations/${recommendationId}/vote`, {
        method: 'POST',
        body: { sessionId, voteType, feedback }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/code-recommendations'] });
      toast({
        title: "Vote recorded",
        description: "Thank you for your feedback!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record vote. You may have already voted on this recommendation.",
        variant: "destructive",
      });
    }
  });

  // Approve recommendation mutation
  const approveMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      return await apiRequest(`/api/code-recommendations/${recommendationId}`, {
        method: 'PATCH',
        body: { status: 'approved' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/code-recommendations'] });
      toast({
        title: "Recommendation approved",
        description: "Development request has been sent to the editor agent.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve recommendation.",
        variant: "destructive",
      });
    }
  });

  // Trigger analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/code-analysis/analyze', {
        method: 'POST',
        body: { sessionId, targetPath: '.' }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/code-recommendations'] });
      toast({
        title: "Analysis complete",
        description: `Generated ${data.analysis?.recommendations?.length || 0} recommendations`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Unable to analyze codebase. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug_fix': return <AlertTriangle className="h-4 w-4" />;
      case 'feature': return <Zap className="h-4 w-4" />;
      case 'optimization': return <Brain className="h-4 w-4" />;
      case 'security': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'refactor': return <Code className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Code Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="code-recommendations-container">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                GPT-5 Code Analysis & Recommendations
              </CardTitle>
              <CardDescription>
                Intelligent code analysis with AI-powered improvement suggestions
              </CardDescription>
            </div>
            <Button
              onClick={() => analysisMutation.mutate()}
              disabled={analysisMutation.isPending}
              data-testid="button-analyze-code"
            >
              {analysisMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Analyze Codebase
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="flex gap-2 mb-4">
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value || undefined }))}
              className="border rounded px-3 py-1"
              data-testid="select-status-filter"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filter.priority || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value || undefined }))}
              className="border rounded px-3 py-1"
              data-testid="select-priority-filter"
            >
              <option value="">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filter.type || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value || undefined }))}
              className="border rounded px-3 py-1"
              data-testid="select-type-filter"
            >
              <option value="">All Types</option>
              <option value="bug_fix">Bug Fix</option>
              <option value="feature">Feature</option>
              <option value="optimization">Optimization</option>
              <option value="security">Security</option>
              <option value="refactor">Refactor</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recommendations yet. Start by analyzing your codebase.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((recommendation: CodeRecommendation) => (
            <Card key={recommendation.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getTypeIcon(recommendation.type)}
                    <div>
                      <CardTitle className="text-lg" data-testid={`recommendation-title-${recommendation.id}`}>
                        {recommendation.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          className={`${getPriorityColor(recommendation.priority)} text-white`}
                          data-testid={`badge-priority-${recommendation.id}`}
                        >
                          {recommendation.priority}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-type-${recommendation.id}`}>
                          {recommendation.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-effort-${recommendation.id}`}>
                          {recommendation.estimatedEffort}
                        </Badge>
                        {recommendation.status === 'approved' && (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Voting and Actions */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => voteMutation.mutate({ 
                          recommendationId: recommendation.id, 
                          voteType: 'up' 
                        })}
                        disabled={voteMutation.isPending}
                        data-testid={`button-vote-up-${recommendation.id}`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium" data-testid={`vote-count-${recommendation.id}`}>
                        {recommendation.votes}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => voteMutation.mutate({ 
                          recommendationId: recommendation.id, 
                          voteType: 'down' 
                        })}
                        disabled={voteMutation.isPending}
                        data-testid={`button-vote-down-${recommendation.id}`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {recommendation.status === 'pending' && (
                      <Button
                        onClick={() => approveMutation.mutate(recommendation.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`button-approve-${recommendation.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground" data-testid={`description-${recommendation.id}`}>
                    {recommendation.description}
                  </p>
                  
                  <div>
                    <h4 className="font-medium mb-2">Reasoning:</h4>
                    <p className="text-sm text-muted-foreground" data-testid={`reasoning-${recommendation.id}`}>
                      {recommendation.reasoning}
                    </p>
                  </div>

                  {recommendation.codeSnippet && (
                    <div>
                      <h4 className="font-medium mb-2">Code Example:</h4>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto" data-testid={`code-snippet-${recommendation.id}`}>
                        <code>{recommendation.codeSnippet}</code>
                      </pre>
                    </div>
                  )}

                  {recommendation.filePath && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span data-testid={`file-path-${recommendation.id}`}>{recommendation.filePath}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Confidence: {recommendation.confidence}/10</span>
                      <span>Created: {new Date(recommendation.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}