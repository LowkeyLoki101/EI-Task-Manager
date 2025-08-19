import type { Express } from "express";
import { circuitBreakers } from "../lib/error-recovery";

// Mock real-time insight activity (in production, this would come from queues/events)
let mockActivities: any[] = [
  {
    id: "act_1",
    type: "research", 
    status: "completed",
    description: "AI-powered autonomous workstations in 2025",
    timestamp: new Date(),
    progress: 100
  },
  {
    id: "act_2", 
    type: "kb_creation",
    status: "completed", 
    description: "Created knowledge base entry for drone technology",
    timestamp: new Date(Date.now() - 300000), // 5 min ago
    progress: 100
  }
];

export function registerInsightRoutes(app: Express) {
  // Get real-time insight generation activity
  app.get('/api/insights/activity', (req, res) => {
    try {
      res.json({
        activities: mockActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      });
    } catch (error) {
      console.error('[InsightRoutes] Error fetching activities:', error);
      res.status(500).json({ error: 'Failed to fetch insight activities' });
    }
  });

  // Get insight generation statistics  
  app.get('/api/insights/stats', async (req, res) => {
    try {
      // Get actual stats from knowledge base
      const kbResponse = await fetch('http://localhost:5000/api/knowledge-base/statistics');
      let kbStats = { totalEntries: 0 };
      
      if (kbResponse.ok) {
        kbStats = await kbResponse.json();
      }

      const stats = {
        totalEntries: kbStats.totalEntries || 0,
        todayCreated: mockActivities.filter(a => 
          new Date(a.timestamp).toDateString() === new Date().toDateString()
        ).length,
        researchConducted: mockActivities.filter(a => a.type === 'research').length,
        tasksGenerated: mockActivities.filter(a => a.type === 'task_generation').length,
        systemHealth: getSystemHealth()
      };

      res.json(stats);
    } catch (error) {
      console.error('[InsightRoutes] Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch insight statistics' });
    }
  });

  // Add new activity (called by other systems)
  app.post('/api/insights/activity', (req, res) => {
    try {
      const activity = {
        id: `act_${Date.now()}`,
        timestamp: new Date(),
        ...req.body
      };

      mockActivities.unshift(activity);
      
      // Keep only last 50 activities
      if (mockActivities.length > 50) {
        mockActivities = mockActivities.slice(0, 50);
      }

      res.json({ success: true, activity });
    } catch (error) {
      console.error('[InsightRoutes] Error adding activity:', error);
      res.status(500).json({ error: 'Failed to add insight activity' });
    }
  });
}

function getSystemHealth(): 'healthy' | 'degraded' | 'failing' {
  const states = Object.values(circuitBreakers).map(cb => cb.getState());
  const openCircuits = states.filter(s => s.state === 'open').length;
  const failingCircuits = states.filter(s => s.failures > 2).length;

  if (openCircuits > 2) return 'failing';
  if (failingCircuits > 1 || openCircuits > 0) return 'degraded';
  return 'healthy';
}