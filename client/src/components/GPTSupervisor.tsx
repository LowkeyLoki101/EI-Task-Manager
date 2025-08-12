import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, MessageSquare } from 'lucide-react';

interface GPTSupervisorProps {
  sessionId: string;
}

export default function GPTSupervisor({ sessionId }: GPTSupervisorProps) {
  const [isActive, setIsActive] = useState(true);

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
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Analysis & Insights
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
    </div>
  );
}