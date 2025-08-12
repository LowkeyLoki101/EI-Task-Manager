import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Brain, MessageSquare, Library, Lightbulb, FileText, Settings } from 'lucide-react';

interface GPTSupervisorProps {
  sessionId: string;
}

interface DiaryEntry {
  id: string;
  timestamp: string;
  type: 'reflection' | 'idea' | 'problem' | 'solution' | 'assumption' | 'learning';
  content: string;
  tags: string[];
  sessionId?: string;
  taskId?: string;
}

export default function GPTSupervisor({ sessionId }: GPTSupervisorProps) {
  const [isActive, setIsActive] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Get analysis and insights from GPT-5
  const { data: analysis, isLoading: isAnalysisLoading } = useQuery({
    queryKey: ['/api/gpt-supervisor/analysis', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/gpt-supervisor/analysis?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 8000, // Check for updates every 8 seconds as mentioned in the requirements
    enabled: isActive && !!sessionId
  });

  // Get historical insights for the full library
  const { data: insightsLibrary, isLoading: isLibraryLoading } = useQuery({
    queryKey: ['/api/diary/insights', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/diary/insights/${sessionId}`);
      return response.json();
    },
    enabled: isLibraryOpen && !!sessionId,
    refetchInterval: 30000
  });

  const allInsights = insightsLibrary?.insights || [];
  const successfulPatterns = insightsLibrary?.patterns || [];
  const userPreferences = insightsLibrary?.preferences || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'idea': return <Lightbulb className="h-3 w-3" />;
      case 'reflection': return <Brain className="h-3 w-3" />;
      case 'problem': return <Settings className="h-3 w-3" />;
      case 'solution': return <Settings className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-4" data-testid="gpt-supervisor">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">GPT-5 Supervisor</h3>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Paused"}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsActive(!isActive)}
          data-testid="supervisor-toggle"
        >
          {isActive ? "Pause" : "Activate"} Monitoring
        </Button>
      </div>

      {/* Analysis Panel */}
      {isActive && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Analysis & Insights
              </div>
              <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-2"
                    data-testid="view-insights-library"
                  >
                    <Library className="h-3 w-3 mr-1" />
                    View Full Library
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isAnalysisLoading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Analyzing your activity...</div>
            ) : analysis ? (
              <div className="space-y-2">
                {analysis.suggestions && (
                  <div>
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Suggestions:</div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">{analysis.suggestions}</div>
                  </div>
                )}
                {analysis.patterns && (
                  <div>
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Patterns Detected:</div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">{analysis.patterns}</div>
                  </div>
                )}
                {analysis.nextActions && (
                  <div>
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Recommended Next Actions:</div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">{analysis.nextActions}</div>
                  </div>
                )}
                {!analysis.suggestions && !analysis.patterns && !analysis.nextActions && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No analysis available yet. Start using the system to see AI insights.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No analysis available yet. Start using the system to see AI insights.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insights Library Dialog */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Complete Insights Library
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            {isLibraryLoading ? (
              <div className="text-center py-8">Loading insights library...</div>
            ) : (
              <div className="space-y-6">
                {/* User Preferences */}
                {userPreferences.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-300">
                      Learned User Preferences
                    </h3>
                    <div className="space-y-2">
                      {userPreferences.map((preference: string, index: number) => (
                        <div key={index} className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm">
                          {preference}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Successful Patterns */}
                {successfulPatterns.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-300">
                      Successful Patterns
                    </h3>
                    <div className="space-y-2">
                      {successfulPatterns.map((pattern: string, index: number) => (
                        <div key={index} className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                          {pattern}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Historical Insights */}
                {allInsights.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-purple-700 dark:text-purple-300">
                      Historical Insights ({allInsights.length})
                    </h3>
                    <div className="space-y-3">
                      {allInsights.map((entry: DiaryEntry) => (
                        <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(entry.type)}
                            <span className="font-medium capitalize text-sm">{entry.type}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            {entry.content}
                          </div>
                          {entry.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {entry.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {entry.sessionId && (
                            <div className="text-xs text-gray-500 mt-2">
                              Session: {entry.sessionId.slice(0, 8)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {allInsights.length === 0 && userPreferences.length === 0 && successfulPatterns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Library className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Insights Yet</h3>
                    <p className="text-sm">
                      Start using the AI assistant and it will begin learning your preferences and building insights over time.
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}