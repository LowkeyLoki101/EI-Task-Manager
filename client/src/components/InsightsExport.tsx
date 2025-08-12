import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  FileText, 
  Code, 
  FileJson, 
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ExportRequest {
  id: string;
  sessionId: string;
  contentType: 'recommendations' | 'analysis' | 'insights' | 'all';
  exportType: 'json' | 'txt' | 'ts' | 'markdown';
  status: 'pending' | 'processing' | 'completed' | 'error';
  fileName?: string;
  fileUrl?: string;
  createdAt: string;
  completedAt?: string;
}

interface SystemInsights {
  summary: {
    totalRecommendations: number;
    highPriorityRecommendations: number;
    pendingRecommendations: number;
    approvedRecommendations: number;
    averageConfidence: number;
    totalAnalyses: number;
    totalTasks: number;
    totalProjects: number;
  };
  recentRecommendations: any[];
  topIssueTypes: Array<{ type: string; count: number }>;
  recommendationsByType: Array<{ type: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
}

interface InsightsExportProps {
  sessionId: string;
}

export function InsightsExport({ sessionId }: InsightsExportProps) {
  const [exportConfig, setExportConfig] = useState({
    contentType: 'all' as 'recommendations' | 'analysis' | 'insights' | 'all',
    exportType: 'json' as 'json' | 'txt' | 'ts' | 'markdown'
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch system insights
  const { data: insights, isLoading: insightsLoading } = useQuery<{insights: SystemInsights}>({
    queryKey: ['/api/insights', sessionId],
    queryFn: async () => {
      return await apiRequest(`/api/insights/${sessionId}`);
    },
  });

  // Fetch export requests
  const { data: exports = [], isLoading: exportsLoading } = useQuery<{exports: ExportRequest[]}>({
    queryKey: ['/api/exports', sessionId],
    queryFn: async () => {
      return await apiRequest(`/api/exports/${sessionId}`);
    },
  });

  // Create export mutation
  const createExportMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/exports', {
        method: 'POST',
        body: {
          sessionId,
          contentType: exportConfig.contentType,
          exportType: exportConfig.exportType,
          fileName: `insights-${Date.now()}.${exportConfig.exportType}`,
          filters: {}
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exports'] });
      toast({
        title: "Export started",
        description: "Your export request is being processed.",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Unable to create export request.",
        variant: "destructive",
      });
    }
  });

  const downloadExport = async (exportId: string) => {
    try {
      const response = await fetch(`/api/exports/${exportId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${exportId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "Export file is downloading.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download export file.",
        variant: "destructive",
      });
    }
  };

  const getExportIcon = (type: string) => {
    switch (type) {
      case 'json': return <FileJson className="h-4 w-4" />;
      case 'txt': return <FileText className="h-4 w-4" />;
      case 'ts': return <Code className="h-4 w-4" />;
      case 'markdown': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (insightsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Insights & Export</CardTitle>
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
    <div className="space-y-6" data-testid="insights-export-container">
      {/* System Insights Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            System Insights
          </CardTitle>
          <CardDescription>
            Comprehensive analysis of your development environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights?.insights ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-total-recommendations">
                <div className="text-2xl font-bold text-blue-600">
                  {insights.insights.summary.totalRecommendations}
                </div>
                <div className="text-sm text-muted-foreground">Total Recommendations</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-high-priority">
                <div className="text-2xl font-bold text-orange-600">
                  {insights.insights.summary.highPriorityRecommendations}
                </div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-pending">
                <div className="text-2xl font-bold text-yellow-600">
                  {insights.insights.summary.pendingRecommendations}
                </div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg" data-testid="stat-average-confidence">
                <div className="text-2xl font-bold text-green-600">
                  {insights.insights.summary.averageConfidence.toFixed(1)}/10
                </div>
                <div className="text-sm text-muted-foreground">Avg Confidence</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No insights available. Generate some recommendations first.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Export Insights</CardTitle>
          <CardDescription>
            Export your code analysis insights in multiple formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Content Type</label>
                <select
                  value={exportConfig.contentType}
                  onChange={(e) => setExportConfig(prev => ({ 
                    ...prev, 
                    contentType: e.target.value as any 
                  }))}
                  className="w-full border rounded px-3 py-2"
                  data-testid="select-content-type"
                >
                  <option value="all">All Data</option>
                  <option value="recommendations">Recommendations Only</option>
                  <option value="analysis">File Analysis Only</option>
                  <option value="insights">System Insights Only</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Export Format</label>
                <select
                  value={exportConfig.exportType}
                  onChange={(e) => setExportConfig(prev => ({ 
                    ...prev, 
                    exportType: e.target.value as any 
                  }))}
                  className="w-full border rounded px-3 py-2"
                  data-testid="select-export-format"
                >
                  <option value="json">JSON</option>
                  <option value="txt">Text Report</option>
                  <option value="ts">TypeScript</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>
            </div>
            
            <Button
              onClick={() => createExportMutation.mutate()}
              disabled={createExportMutation.isPending}
              className="w-full"
              data-testid="button-create-export"
            >
              {createExportMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Export...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Create Export
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Download previous exports or check their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exportsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : exports.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No exports yet. Create your first export above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exports.map((exportRequest: ExportRequest) => (
                <div
                  key={exportRequest.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`export-item-${exportRequest.id}`}
                >
                  <div className="flex items-center gap-3">
                    {getExportIcon(exportRequest.exportType)}
                    <div>
                      <div className="font-medium">
                        {exportRequest.contentType} - {exportRequest.exportType.toUpperCase()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(exportRequest.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(exportRequest.status)}
                      <Badge 
                        variant={exportRequest.status === 'completed' ? 'default' : 'secondary'}
                        data-testid={`export-status-${exportRequest.id}`}
                      >
                        {exportRequest.status}
                      </Badge>
                    </div>
                    
                    {exportRequest.status === 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => downloadExport(exportRequest.id)}
                        data-testid={`button-download-${exportRequest.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}