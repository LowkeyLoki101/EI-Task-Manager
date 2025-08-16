/**
 * Context Aggregator - Turns raw environment into clean snapshots
 * Collects context from tasks, calendar, tool health, and system state
 */

export interface SystemContext {
  timestamp: Date;
  tasks: TaskContext;
  calendar: CalendarContext;
  tools: ToolContext;
  system: SystemHealth;
  recent: RecentActivity;
}

export interface TaskContext {
  total: number;
  completed: number;
  overdue: number;
  todayDue: number;
  recentlyCompleted: string[];
  topPriorities: string[];
}

export interface CalendarContext {
  upcomingEvents: number;
  todayEvents: number;
  nextEvent?: string;
  recentMeetings: string[];
}

export interface ToolContext {
  errors: number;
  successes: number;
  lastError?: string;
  recentlyUsed: string[];
  healthStatus: 'healthy' | 'degraded' | 'failing';
}

export interface SystemHealth {
  status: 'good' | 'degraded' | 'poor';
  uptime: number;
  memoryUsage: number;
  activeConnections: number;
  lastBackup?: Date;
}

export interface RecentActivity {
  conversationCount: number;
  tasksCreated: number;
  filesUploaded: number;
  voiceInteractions: number;
  searchQueries: string[];
}

export class ContextAggregator {
  /**
   * Aggregate current system context from various sources
   */
  async aggregateContext(sessionId: string): Promise<SystemContext> {
    const [taskContext, calendarContext, toolContext, systemHealth, recentActivity] = await Promise.all([
      this.getTaskContext(sessionId),
      this.getCalendarContext(sessionId),
      this.getToolContext(),
      this.getSystemHealth(),
      this.getRecentActivity(sessionId)
    ]);

    return {
      timestamp: new Date(),
      tasks: taskContext,
      calendar: calendarContext,
      tools: toolContext,
      system: systemHealth,
      recent: recentActivity
    };
  }

  /**
   * Get task-related context
   */
  private async getTaskContext(sessionId: string): Promise<TaskContext> {
    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${sessionId}`);
      if (!response.ok) {
        return this.getEmptyTaskContext();
      }

      const data = await response.json();
      const tasks = data.tasks || [];

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const completed = tasks.filter((t: any) => t.status === 'done');
      const overdue = tasks.filter((t: any) => 
        t.dueDate && new Date(t.dueDate) < today && t.status !== 'done'
      );
      const todayDue = tasks.filter((t: any) => 
        t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString()
      );

      // Get recently completed tasks (last 24 hours)
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentlyCompleted = completed
        .filter((t: any) => new Date(t.updatedAt) > yesterday)
        .map((t: any) => t.title)
        .slice(0, 3);

      // Get top priority tasks
      const topPriorities = tasks
        .filter((t: any) => t.status !== 'done' && t.priority === 'high')
        .map((t: any) => t.title)
        .slice(0, 3);

      return {
        total: tasks.length,
        completed: completed.length,
        overdue: overdue.length,
        todayDue: todayDue.length,
        recentlyCompleted,
        topPriorities
      };
    } catch (error) {
      console.warn('[ContextAggregator] Failed to get task context:', error);
      return this.getEmptyTaskContext();
    }
  }

  /**
   * Get calendar-related context
   */
  private async getCalendarContext(sessionId: string): Promise<CalendarContext> {
    try {
      const response = await fetch(`http://localhost:5000/api/calendar/events/${sessionId}`);
      if (!response.ok) {
        return this.getEmptyCalendarContext();
      }

      const data = await response.json();
      const events = data.events || [];

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const upcomingEvents = events.filter((e: any) => 
        new Date(e.startTime) > now
      ).length;

      const todayEvents = events.filter((e: any) => {
        const eventDate = new Date(e.startTime);
        return eventDate >= today && eventDate < tomorrow;
      }).length;

      const nextEvent = events
        .filter((e: any) => new Date(e.startTime) > now)
        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        [0]?.title;

      return {
        upcomingEvents,
        todayEvents,
        nextEvent,
        recentMeetings: []
      };
    } catch (error) {
      console.warn('[ContextAggregator] Failed to get calendar context:', error);
      return this.getEmptyCalendarContext();
    }
  }

  /**
   * Get tool health context
   */
  private async getToolContext(): Promise<ToolContext> {
    // This would typically check various tool endpoints
    // For now, simulate based on system observations
    return {
      errors: 0,
      successes: 10,
      healthStatus: 'healthy',
      recentlyUsed: ['TaskManager', 'VoiceWidget', 'KnowledgeBase'],
      lastError: undefined
    };
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'good',
      uptime: process.uptime(),
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
      activeConnections: 1, // Simplified
      lastBackup: new Date()
    };
  }

  /**
   * Get recent activity metrics
   */
  private async getRecentActivity(sessionId: string): Promise<RecentActivity> {
    try {
      const response = await fetch(`http://localhost:5000/api/chat/${sessionId}`);
      const chatData = response.ok ? await response.json() : { messages: [] };

      return {
        conversationCount: chatData.messages?.length || 0,
        tasksCreated: 1, // Simplified
        filesUploaded: 0,
        voiceInteractions: 2,
        searchQueries: []
      };
    } catch (error) {
      return {
        conversationCount: 0,
        tasksCreated: 0,
        filesUploaded: 0,
        voiceInteractions: 0,
        searchQueries: []
      };
    }
  }

  private getEmptyTaskContext(): TaskContext {
    return {
      total: 0,
      completed: 0,
      overdue: 0,
      todayDue: 0,
      recentlyCompleted: [],
      topPriorities: []
    };
  }

  private getEmptyCalendarContext(): CalendarContext {
    return {
      upcomingEvents: 0,
      todayEvents: 0,
      recentMeetings: []
    };
  }

  /**
   * Generate a human-readable context summary
   */
  generateContextSummary(context: SystemContext): string {
    const parts = [];

    // Task summary
    if (context.tasks.total > 0) {
      parts.push(`${context.tasks.total} tasks (${context.tasks.completed} completed)`);
      if (context.tasks.overdue > 0) {
        parts.push(`${context.tasks.overdue} overdue`);
      }
      if (context.tasks.recentlyCompleted.length > 0) {
        parts.push(`Recently completed: ${context.tasks.recentlyCompleted.join(', ')}`);
      }
    }

    // Calendar summary
    if (context.calendar.upcomingEvents > 0) {
      parts.push(`${context.calendar.upcomingEvents} upcoming events`);
      if (context.calendar.nextEvent) {
        parts.push(`Next: ${context.calendar.nextEvent}`);
      }
    }

    // Tool status
    if (context.tools.healthStatus !== 'healthy') {
      parts.push(`Tools: ${context.tools.healthStatus}`);
    }

    // System status
    if (context.system.status !== 'good') {
      parts.push(`System: ${context.system.status}`);
    }

    return parts.length > 0 ? parts.join('. ') : 'System running normally';
  }
}