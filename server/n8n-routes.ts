import { Express } from 'express';
import { n8nService } from './n8n-integration';
import { storage } from './storage';

export function registerN8nRoutes(app: Express) {
  // Initialize n8n connection
  app.get('/api/n8n/status', async (req, res) => {
    try {
      const isConnected = await n8nService.initialize();
      res.json({
        connected: isConnected,
        baseUrl: 'http://localhost:5678',
        status: isConnected ? 'Connected' : 'Disconnected'
      });
    } catch (error: any) {
      res.status(500).json({
        connected: false,
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Get all workflows
  app.get('/api/n8n/workflows', async (req, res) => {
    try {
      const workflows = await n8nService.getWorkflows();
      res.json({ workflows });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Create workflow from task
  app.post('/api/n8n/workflows/from-task/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const workflow = await n8nService.createTaskWorkflow(task);
      
      // Save workflow reference to task
      await storage.updateTask(taskId, {
        description: `${task.description || ''}\n\n🤖 Automated workflow created: ${workflow.name}`
      });

      res.json({
        success: true,
        workflow,
        message: `Workflow created for task: ${task.title}`
      });
    } catch (error: any) {
      console.error('[N8N Routes] Error creating workflow from task:', error);
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Create LLM automation workflow
  app.post('/api/n8n/workflows/llm-automation', async (req, res) => {
    try {
      const { prompt, taskId } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const workflow = await n8nService.createLLMWorkflow(prompt, taskId);
      
      res.json({
        success: true,
        workflow,
        message: `LLM automation workflow created`
      });
    } catch (error: any) {
      console.error('[N8N Routes] Error creating LLM workflow:', error);
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Execute workflow
  app.post('/api/n8n/workflows/:workflowId/execute', async (req, res) => {
    try {
      const { workflowId } = req.params;
      const { inputData } = req.body;

      const result = await n8nService.executeWorkflow(workflowId, inputData);
      
      res.json({
        success: true,
        execution: result,
        message: 'Workflow executed successfully'
      });
    } catch (error: any) {
      console.error('[N8N Routes] Error executing workflow:', error);
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Get workflow executions
  app.get('/api/n8n/executions', async (req, res) => {
    try {
      const { workflowId } = req.query;
      const executions = await n8nService.getWorkflowExecutions(workflowId as string);
      
      res.json({ executions });
    } catch (error: any) {
      console.error('[N8N Routes] Error fetching executions:', error);
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Webhook endpoint for n8n to send results back
  app.post('/api/llm-automation/result', async (req, res) => {
    try {
      const { taskId, prompt, result } = req.body;
      
      console.log('[N8N Webhook] LLM automation result received:', {
        taskId,
        prompt: prompt?.slice(0, 50),
        result: result?.slice(0, 100)
      });

      // If taskId provided, update the task with the result
      if (taskId) {
        const task = await storage.getTask(taskId);
        if (task) {
          await storage.updateTask(taskId, {
            description: `${task.description || ''}\n\n🤖 LLM Result: ${result}`
          });
        }
      }

      // Store the automation result
      const artifact = await storage.createArtifact({
        id: `llm-${Date.now()}`,
        stepId: taskId || 'automation',
        type: 'note',
        title: `LLM Automation: ${prompt?.slice(0, 50)}...`,
        content: `Prompt: ${prompt}\n\nResult: ${result}`
      });

      res.json({
        success: true,
        message: 'LLM automation result processed',
        artifact
      });
    } catch (error: any) {
      console.error('[N8N Webhook] Error processing LLM result:', error);
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });

  // Smart workflow suggestions based on task content
  app.post('/api/n8n/suggest-workflows', async (req, res) => {
    try {
      const { taskTitle, taskContext, sessionId } = req.body;
      
      if (!taskTitle) {
        return res.status(400).json({ error: 'Task title is required' });
      }

      // Analyze task and suggest appropriate workflow types
      const suggestions = analyzeTaskForWorkflows(taskTitle, taskContext);
      
      res.json({
        suggestions,
        message: `Found ${suggestions.length} workflow suggestions for: ${taskTitle}`
      });
    } catch (error: any) {
      console.error('[N8N Routes] Error suggesting workflows:', error);
      res.status(500).json({ error: error?.message || 'Unknown error' });
    }
  });
}

// Helper function to analyze tasks and suggest workflows
function analyzeTaskForWorkflows(taskTitle: string, taskContext?: string): any[] {
  const title = taskTitle.toLowerCase();
  const context = (taskContext || '').toLowerCase();
  const suggestions: any[] = [];

  // Email automation patterns
  if (title.includes('email') || title.includes('send') || title.includes('notify')) {
    suggestions.push({
      type: 'email_automation',
      name: 'Email Notification Workflow',
      description: 'Automatically send emails when task status changes',
      nodes: ['Manual Trigger', 'Gmail', 'Task Update'],
      useCase: 'Perfect for keeping stakeholders informed'
    });
  }

  // Data processing patterns
  if (title.includes('data') || title.includes('process') || title.includes('analyze')) {
    suggestions.push({
      type: 'data_processing',
      name: 'Data Analysis Workflow',
      description: 'Process and analyze data with AI assistance',
      nodes: ['HTTP Request', 'OpenAI', 'Spreadsheet File'],
      useCase: 'Great for automated data insights'
    });
  }

  // Research automation
  if (title.includes('research') || title.includes('find') || title.includes('learn')) {
    suggestions.push({
      type: 'research_automation',
      name: 'Research Assistant Workflow',
      description: 'Automated research with web scraping and AI summarization',
      nodes: ['Web Scraper', 'OpenAI', 'Knowledge Base'],
      useCase: 'Excellent for gathering and organizing information'
    });
  }

  // Social media automation
  if (title.includes('post') || title.includes('social') || title.includes('share')) {
    suggestions.push({
      type: 'social_automation',
      name: 'Social Media Workflow',
      description: 'Schedule and publish content across platforms',
      nodes: ['Schedule Trigger', 'Twitter', 'LinkedIn', 'Discord'],
      useCase: 'Perfect for content distribution'
    });
  }

  // File management
  if (title.includes('file') || title.includes('document') || title.includes('upload')) {
    suggestions.push({
      type: 'file_management',
      name: 'File Processing Workflow',
      description: 'Organize, process, and distribute files automatically',
      nodes: ['Google Drive', 'File Converter', 'Cloud Storage'],
      useCase: 'Great for document workflows'
    });
  }

  // Default AI assistant workflow
  suggestions.push({
    type: 'ai_assistant',
    name: 'AI Task Assistant',
    description: 'General AI assistance for task completion',
    nodes: ['Manual Trigger', 'OpenAI', 'Task Update'],
    useCase: 'Universal helper for any task'
  });

  return suggestions;
}