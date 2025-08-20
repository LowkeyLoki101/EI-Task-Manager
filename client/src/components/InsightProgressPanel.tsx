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
        // Convert timestamp strings to Date objects
        const activities = (data.activities || []).map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
        setActivities(activities);
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
      <Card className="industrial-card hex-mesh-pattern">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-industrial-primary font-industrial-display">
            <div className="drone-camera-lens" style={{width: '24px', height: '24px'}}></div>
            AI Insight Generation
            <Badge className={`${getHealthColor(stats.systemHealth)} bg-industrial-medium border-industrial-accent`}>
              {stats.systemHealth}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center solar-panel-texture p-3 rounded">
              <div className="text-2xl font-bold text-industrial-accent font-industrial-mono">{stats.totalEntries}</div>
              <div className="text-xs text-industrial-secondary font-industrial-body">Total Insights</div>
            </div>
            <div className="text-center photovoltaic-shimmer p-3 rounded">
              <div className="text-2xl font-bold text-industrial-success font-industrial-mono">{stats.todayCreated}</div>
              <div className="text-xs text-industrial-secondary font-industrial-body">Created Today</div>
            </div>
            <div className="text-center fine-grid-mesh p-3 rounded">
              <div className="text-2xl font-bold text-solar-gold font-industrial-mono">{stats.researchConducted}</div>
              <div className="text-xs text-industrial-secondary font-industrial-body">Research Done</div>
            </div>
            <div className="text-center carbon-fiber-weave p-3 rounded">
              <div className="text-2xl font-bold text-industrial-warning font-industrial-mono">{stats.tasksGenerated}</div>
              <div className="text-xs text-industrial-secondary font-industrial-body">Tasks Generated</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-industrial-display text-sm text-industrial-primary">Recent Activity</h4>
            {activities.length === 0 ? (
              <div className="text-center py-4 text-industrial-secondary font-industrial-body">
                <div className="drone-hud-status mb-2">STANDBY</div>
                No recent insight generation activity
              </div>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-industrial-medium carbon-fiber-weave border border-industrial-accent/20">
                  <div className="flex-shrink-0 text-industrial-accent">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-industrial-primary font-industrial-body">
                      {activity.description}
                    </div>
                    <div className="text-xs text-industrial-secondary font-industrial-mono">
                      {activity.timestamp instanceof Date 
                        ? activity.timestamp.toLocaleTimeString() 
                        : new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(activity.status)} shadow-lg`} style={{
                      boxShadow: activity.status === 'active' ? '0 0 6px currentColor' : '0 0 3px currentColor'
                    }} />
                  </div>
                  {activity.progress !== undefined && activity.status === 'active' && (
                    <div className="w-16">
                      <Progress value={activity.progress} className="h-2 bg-industrial-dark" />
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