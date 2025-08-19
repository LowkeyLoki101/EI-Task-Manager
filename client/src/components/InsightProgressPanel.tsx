import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Brain, Database, Search, Zap } from "lucide-react";

interface InsightActivity {
  id: string;
  type: 'research' | 'kb_creation' | 'task_generation' | 'lens_processing';
  status: 'active' | 'completed' | 'failed';
  description: string;
  timestamp: Date;
  progress?: number;
}

interface InsightStats {
  totalEntries: number;
  todayCreated: number;
  researchConducted: number;
  tasksGenerated: number;
  systemHealth: 'healthy' | 'degraded' | 'failing';
}

export function InsightProgressPanel() {
  const [activities, setActivities] = useState<InsightActivity[]>([]);
  const [stats, setStats] = useState<InsightStats>({
    totalEntries: 0,
    todayCreated: 0,
    researchConducted: 0,
    tasksGenerated: 0,
    systemHealth: 'healthy'
  });

  // Simulate real-time activity updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real implementation, this would be a WebSocket or SSE connection
      fetchInsightActivity();
      fetchInsightStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchInsightActivity = async () => {
    try {
      const response = await fetch('/api/insights/activity');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('[InsightProgress] Failed to fetch activity:', error);
    }
  };

  const fetchInsightStats = async () => {
    try {
      const response = await fetch('/api/insights/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('[InsightProgress] Failed to fetch stats:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'research': return <Search className="w-4 h-4" />;
      case 'kb_creation': return <Database className="w-4 h-4" />;
      case 'task_generation': return <Activity className="w-4 h-4" />;
      case 'lens_processing': return <Brain className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'failing': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Insight Generation
            <Badge className={getHealthColor(stats.systemHealth)}>
              {stats.systemHealth}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalEntries}</div>
              <div className="text-sm text-muted-foreground">Total Insights</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.todayCreated}</div>
              <div className="text-sm text-muted-foreground">Created Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.researchConducted}</div>
              <div className="text-sm text-muted-foreground">Research Done</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.tasksGenerated}</div>
              <div className="text-sm text-muted-foreground">Tasks Generated</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Recent Activity</h4>
            {activities.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No recent insight generation activity
              </div>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {activity.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`} />
                  </div>
                  {activity.progress !== undefined && activity.status === 'active' && (
                    <div className="w-16">
                      <Progress value={activity.progress} className="h-1" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}