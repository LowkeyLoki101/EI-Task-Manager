import { Express } from 'express';
import { storage } from './storage';
import { n8nService } from './n8n-integration';

// Enhanced actions for n8n integration
export function registerEnhancedActions(app: Express) {
  // Enhanced add_task with automatic workflow suggestions
  app.post('/api/actions/add_task_with_automation', async (req, res) => {
    try {
      const { title, sessionId, context = 'computer', priority = 'medium' } = req.body;
      
      if (!title || !sessionId) {
        return res.status(400).json({ error: 'Title and sessionId required' });
      }

      // Create the task first
      const task = await storage.createTask({
        id: `task-${Date.now()}`,
        title: title.trim(),
        status: 'backlog',
        context: context as 'computer' | 'phone' | 'physical',
        priority: priority as 'low' | 'medium' | 'high',
        sessionId,
        timeWindow: 'any'
      });

      console.log(`[Enhanced Actions] Created task with automation: ${title}`);

      // Get workflow suggestions for this task
      let suggestions: any[] = [];
      if (n8nService.isReady()) {
        try {
          const response = await fetch('http://localhost:5000/api/n8n/suggest-workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskTitle: title,
              taskContext: context,
              sessionId
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            suggestions = data.suggestions || [];
          }
        } catch (error) {
          console.warn('[Enhanced Actions] Failed to get workflow suggestions:', error);
        }
      }

      // Auto-create simple workflow for certain task types
      let autoWorkflow = null;
      if (n8nService.isReady() && shouldAutoCreateWorkflow(title)) {
        try {
          autoWorkflow = await n8nService.createTaskWorkflow(task);
          console.log(`[Enhanced Actions] Auto-created workflow for task: ${title}`);
        } catch (error) {
          console.warn('[Enhanced Actions] Failed to auto-create workflow:', error);
        }
      }

      res.json({
        success: true,
        task,
        message: `Task "${title}" created successfully${autoWorkflow ? ' with automation workflow' : ''}`,
        workflowSuggestions: suggestions,
        autoWorkflow: autoWorkflow ? { id: autoWorkflow.id, name: autoWorkflow.name } : null
      });
    } catch (error: any) {
      console.error('[Enhanced Actions] Error creating task with automation:', error);
      res.status(500).json({ error: error?.message || 'Failed to create task' });
    }
  });

  // Create and execute LLM workflow for a task
  app.post('/api/actions/automate_task_with_llm', async (req, res) => {
    try {
      const { taskId, prompt, sessionId } = req.body;
      
      if (!taskId || !prompt || !sessionId) {
        return res.status(400).json({ error: 'TaskId, prompt, and sessionId required' });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (!n8nService.isReady()) {
        return res.status(503).json({ error: 'n8n automation service not available' });
      }

      // Create LLM workflow
      const workflow = await n8nService.createLLMWorkflow(prompt, taskId);
      
      // Execute the workflow immediately
      await n8nService.executeWorkflow(workflow.id);

      // Update task to show it's being automated
      await storage.updateTask(taskId, {
        status: 'running',
        description: `${task.description || ''}\n\n🤖 LLM Automation: ${prompt}`
      });

      res.json({
        success: true,
        workflow,
        message: `LLM automation started for task: ${task.title}`,
        taskStatus: 'running'
      });
    } catch (error: any) {
      console.error('[Enhanced Actions] Error automating task with LLM:', error);
      res.status(500).json({ error: error?.message || 'Failed to automate task' });
    }
  });

  // Get automation status for tasks
  app.get('/api/actions/automation_status/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const tasks = await storage.getTasks(sessionId);
      const automatedTasks = tasks.filter(task => 
        task.description?.includes('🤖') || task.status === 'running'
      );

      let workflowCount = 0;
      if (n8nService.isReady()) {
        try {
          const workflows = await n8nService.getWorkflows();
          workflowCount = workflows.length;
        } catch (error) {
          console.warn('[Enhanced Actions] Failed to get workflow count:', error);
        }
      }

      res.json({
        success: true,
        automatedTasks: automatedTasks.length,
        totalTasks: tasks.length,
        activeWorkflows: workflowCount,
        n8nConnected: n8nService.isReady(),
        message: `Found ${automatedTasks.length} automated tasks with ${workflowCount} active workflows`
      });
    } catch (error: any) {
      console.error('[Enhanced Actions] Error getting automation status:', error);
      res.status(500).json({ error: error?.message || 'Failed to get automation status' });
    }
  });

  // Smart task recommendations based on workflow patterns
  app.post('/api/actions/recommend_automations', async (req, res) => {
    try {
      const { sessionId, taskTitle } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'SessionId required' });
      }

      const recommendations = getAutomationRecommendations(taskTitle);
      
      res.json({
        success: true,
        recommendations,
        message: `Found ${recommendations.length} automation recommendations`
      });
    } catch (error: any) {
      console.error('[Enhanced Actions] Error getting recommendations:', error);
      res.status(500).json({ error: error?.message || 'Failed to get recommendations' });
    }
  });
}

// Helper function to determine if a task should auto-create a workflow
function shouldAutoCreateWorkflow(title: string): boolean {
  const autoWorkflowPatterns = [
    /send.*email/i,
    /notify.*when/i,
    /backup.*data/i,
    /schedule.*meeting/i,
    /report.*daily/i,
    /monitor.*status/i
  ];
  
  return autoWorkflowPatterns.some(pattern => pattern.test(title));
}

// Helper function to get automation recommendations
function getAutomationRecommendations(taskTitle?: string): any[] {
  const baseRecommendations = [
    {
      type: 'email_notification',
      title: 'Email Status Updates',
      description: 'Get notified via email when tasks are completed',
      icon: '📧',
      complexity: 'Easy'
    },
    {
      type: 'slack_integration',
      title: 'Slack Notifications',
      description: 'Send task updates to your Slack channels',
      icon: '💬',
      complexity: 'Easy'
    },
    {
      type: 'calendar_sync',
      title: 'Calendar Integration',
      description: 'Automatically schedule task deadlines in your calendar',
      icon: '📅',
      complexity: 'Medium'
    },
    {
      type: 'data_backup',
      title: 'Automated Backups',
      description: 'Backup important task data to cloud storage',
      icon: '💾',
      complexity: 'Medium'
    },
    {
      type: 'ai_analysis',
      title: 'AI Task Analysis',
      description: 'Get AI insights and suggestions for task optimization',
      icon: '🤖',
      complexity: 'Advanced'
    }
  ];

  // Add task-specific recommendations
  if (taskTitle) {
    const title = taskTitle.toLowerCase();
    
    if (title.includes('email') || title.includes('send')) {
      baseRecommendations.unshift({
        type: 'email_automation',
        title: 'Smart Email Automation',
        description: 'Automatically compose and send emails based on task context',
        icon: '🔄',
        complexity: 'Medium'
      });
    }
    
    if (title.includes('data') || title.includes('analyze')) {
      baseRecommendations.unshift({
        type: 'data_processing',
        title: 'Data Processing Pipeline',
        description: 'Automated data analysis and reporting workflow',
        icon: '📊',
        complexity: 'Advanced'
      });
    }
    
    if (title.includes('social') || title.includes('post')) {
      baseRecommendations.unshift({
        type: 'social_automation',
        title: 'Social Media Automation',
        description: 'Schedule and post content across social platforms',
        icon: '📱',
        complexity: 'Medium'
      });
    }
  }

  return baseRecommendations.slice(0, 5); // Return top 5 recommendations
}