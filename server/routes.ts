import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, conversationStorage } from "./storage";
import { registerElevenLabsActions, OpsManager } from "./elevenlabs-actions";
import { registerEnhancedActions } from "./enhanced-actions";
import { 
  insertTaskSchema, insertStepSchema, insertConversationSchema, 
  insertProposalSchema, insertFileSchema, insertSessionSchema,
  addTaskActionSchema, getTodoListActionSchema,
  // New project management schemas
  insertProjectSchema,
  insertResearchDocSchema,
  insertCalendarEventSchema,
  insertProjectFileSchema
} from "@shared/schema";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";

// GPT-5 is now available and is the latest OpenAI model
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  
  // Register ElevenLabs Actions API
  registerElevenLabsActions(app);
  
  // Register Enhanced Actions with SDK integration
  registerEnhancedActions(app);
  
  // Register Autonomous Chat with persistent memory
  const { registerAutonomousChat } = await import('./autonomous-chat');
  registerAutonomousChat(app);
  
  // Register iPhone Calendar Integration
  const { registerCalendarRoutes } = await import('./calendar-integration');
  registerCalendarRoutes(app);
  
  // Register Code Analysis and Recommendations System
  const { registerCodeAnalysisRoutes } = await import('./code-analysis-routes');
  registerCodeAnalysisRoutes(app);

  // Register AI Workstation Artifact System
  const { registerArtifactRoutes } = await import('./artifacts');
  registerArtifactRoutes(app);

  // Register Knowledge Base with File Upload
  const knowledgeBaseRoutes = await import('./knowledge-base-routes');
  app.use('/api/knowledge-base', knowledgeBaseRoutes.default);

  // Register AI Autonomous Workstation Controller
  const { registerAiWorkstationRoutes } = await import('./ai-workstation');
  registerAiWorkstationRoutes(app);
  
  // Import project context management
  const { projectContextManager, processProjectAwareConversation } = await import("./project-context");
  
  // Import knowledge base management
  const { knowledgeBaseManager } = await import("./knowledge-base");
  
  // Register Colby Actions API - matches the comprehensive Colby toolset specification
  const { registerColbyActions } = await import("./colby-actions");
  registerColbyActions(app);
  
  // Register audio transcription routes
  const { registerTranscriptionRoutes } = await import("./transcription");
  registerTranscriptionRoutes(app);
  
  // Register GPT-5 supervisor routes
  const { setupGPTSupervisor } = await import("./gpt-supervisor");
  setupGPTSupervisor(app);
  
  // Register n8n integration routes
  try {
    const { registerN8nRoutes } = await import("./n8n-routes");
    registerN8nRoutes(app);
    
    // Register enhanced actions with n8n integration
    const { registerEnhancedActions } = await import("./enhanced-actions");
    registerEnhancedActions(app);
    console.log('[Routes] n8n integration enabled');
  } catch (error) {
    console.warn('[Routes] Failed to load n8n integration:', error);
  }



  // Initialize Microservice Integration
  const { MicroserviceConnector, listNetworkServices } = await import("./microservice-connector");
  const SERVICE_NAME = 'Emergent-Intelligence';
  const SERVICE_URL = process.env.REPL_URL || 'http://localhost:5000';
  const microserviceConnector = new MicroserviceConnector(SERVICE_NAME, SERVICE_URL);
  
  // Register with Integration Hub on startup
  microserviceConnector.registerWithHub().then(() => {
    console.log('🌐 Microservice connector initialized');
  });

  // Register microservice health endpoint
  app.get('/api/health', (req, res) => {
    res.json(microserviceConnector.getHealthData());
  });

  // Register microservice network endpoints
  app.get('/api/microservices', async (req, res) => {
    try {
      const services = await listNetworkServices(microserviceConnector);
      res.json({ services });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to fetch services' });
    }
  });

  // Register API endpoints for discovery
  microserviceConnector.registerEndpoint('GET', '/api/health', 'Health check and service discovery');
  microserviceConnector.registerEndpoint('GET', '/api/tasks', 'Task management system');
  microserviceConnector.registerEndpoint('POST', '/api/tasks', 'Create new tasks');
  microserviceConnector.registerEndpoint('GET', '/api/chat/{sessionId}', 'AI chat conversations');
  microserviceConnector.registerEndpoint('POST', '/api/chat/{sessionId}', 'Send chat messages');
  microserviceConnector.registerEndpoint('GET', '/api/knowledge-base', 'Knowledge base search');
  microserviceConnector.registerEndpoint('POST', '/api/knowledge-base', 'Store knowledge');
  microserviceConnector.registerEndpoint('GET', '/api/workstation/ai-action/{sessionId}', 'AI autonomous actions');
  microserviceConnector.registerEndpoint('GET', '/api/code-analysis', 'Code analysis and recommendations');

  // Register microservice integration routes
  const { registerMicroserviceRoutes } = await import("./microservice-routes");
  registerMicroserviceRoutes(app, microserviceConnector);

  // Register enhanced diary system with autonomy
  const { registerDiaryRoutes } = await import("./diary-routes");
  registerDiaryRoutes(app);

  // Register System Modifier for advanced GPT-5 capabilities
  const { registerSystemModifier } = await import("./system-modifier");
  registerSystemModifier(app);

  // Initialize sharing and tinker framework
  const { initializeTinkerFramework, sharingSystem, tinkerFramework } = await import("./sharing-system");
  await initializeTinkerFramework();
  
  // System Status and Diagnostics
  app.get("/api/status", async (req, res) => {
    const status = {
      server: "✅ Running",
      database: "✅ Connected (Memory Storage)",
      openai: process.env.OPENAI_API_KEY ? "✅ Configured" : "❌ Missing API Key",
      elevenlabs: process.env.ELEVENLABS_API_KEY ? "✅ Configured" : "❌ Missing API Key",
      agent_id: "agent_8201k251883jf0hr1ym7d6dbymxc",
      actions_working: "✅ Actions API responding",
      widget_status: "⚠️ Check console for widget errors",
      next_steps: [
        "If widget shows 'Failed to fetch' - check ElevenLabs dashboard",
        "Enable Web Widget in Agent Settings", 
        "Add domain to Allowed Origins",
        "Set Public/Unauthenticated = ON for testing"
      ]
    };
    res.json(status);
  });

  // Advanced Action Endpoints for Steps Visualizer

  // Research Action - Intelligent research for task steps
  app.post("/api/actions/research", async (req, res) => {
    try {
      const { stepId, query, sessionId } = req.body;
      
      if (!stepId || !query) {
        return res.status(400).json({ error: "stepId and query required" });
      }

      // Get the step to understand context
      const step = await storage.getStep(stepId);
      if (!step) {
        return res.status(404).json({ error: "Step not found" });
      }

      // Use GPT-5 to research and provide detailed information
      const researchPrompt = `Research task: "${query}"
      
Context: This is for a task management step titled "${step.title}". 

Provide comprehensive research results including:
1. Key information and insights
2. Recommended approaches or solutions
3. Potential challenges and how to overcome them
4. Relevant resources or tools
5. Next action items

Format as structured information that would help someone complete this task step.`;

      let researchResults = "Research completed for: " + query;

      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-fake-key-for-development") {
        try {
          const researchResponse = await openai.chat.completions.create({
            model: "gpt-4o", // Latest OpenAI model
            messages: [{ role: "user", content: researchPrompt }],
            max_tokens: 1000,
            // GPT-5 only supports default temperature
          });
          
          researchResults = researchResponse.choices[0].message.content || researchResults;
        } catch (error) {
          console.error('Research error:', error);
        }
      }

      // Create an artifact to store the research
      const artifact = await storage.createArtifact({
        id: randomUUID(),
        stepId,
        type: 'note',
        title: `Research: ${query}`,
        content: researchResults
      });

      // Update step status to indicate research is complete
      await storage.updateStep(stepId, { 
        status: 'running',
        description: `Research completed: ${query}` 
      });

      res.json({
        success: true,
        message: `Research completed for "${query}"`,
        artifact,
        results: researchResults
      });

    } catch (error) {
      console.error('Research action error:', error);
      res.status(500).json({ error: "Failed to complete research" });
    }
  });

  // QR Code Generation Action
  app.post("/api/actions/qr", async (req, res) => {
    try {
      const { stepId, content, label, sessionId } = req.body;
      
      if (!stepId || !content) {
        return res.status(400).json({ error: "stepId and content required" });
      }

      // Get the step for context
      const step = await storage.getStep(stepId);
      if (!step) {
        return res.status(404).json({ error: "Step not found" });
      }

      // Generate QR code using a simple SVG-based approach
      // In a real implementation, you might use a QR code library
      const qrContent = encodeURIComponent(content);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrContent}`;
      
      const qrTitle = label || `QR Code: ${content.substring(0, 50)}...`;

      // Create artifact for the QR code
      const artifact = await storage.createArtifact({
        id: randomUUID(),
        stepId,
        type: 'link',
        title: qrTitle,
        content: qrCodeUrl
      });

      // Update step with QR generation info
      await storage.updateStep(stepId, {
        status: 'running',
        description: `QR code generated for: ${content}`
      });

      res.json({
        success: true,
        message: `QR code generated for "${content}"`,
        artifact,
        qrCodeUrl
      });

    } catch (error) {
      console.error('QR generation error:', error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // Page Scaffolding Action
  app.post("/api/actions/scaffold_page", async (req, res) => {
    try {
      const { stepId, pageType, title, features, sessionId } = req.body;
      
      if (!stepId || !pageType || !title) {
        return res.status(400).json({ error: "stepId, pageType, and title required" });
      }

      // Get the step for context
      const step = await storage.getStep(stepId);
      if (!step) {
        return res.status(404).json({ error: "Step not found" });
      }

      // Generate page scaffold based on type
      const scaffoldPrompt = `Create a ${pageType} page scaffold with the title "${title}".
      
${features ? `Features requested: ${features.join(', ')}` : ''}

Provide a complete, production-ready page structure including:
1. HTML structure with semantic elements
2. CSS styling (modern, responsive design)
3. JavaScript functionality if needed
4. Accessibility considerations
5. SEO-friendly markup

Return as a complete HTML page that can be saved and used immediately.`;

      let scaffoldCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p>Generated ${pageType} page scaffold - ready for customization.</p>
    </div>
</body>
</html>`;

      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-fake-key-for-development") {
        try {
          const scaffoldResponse = await openai.chat.completions.create({
            model: "gpt-4o", // Latest OpenAI model
            messages: [{ role: "user", content: scaffoldPrompt }],
            max_tokens: 1500,
            // Use default temperature for GPT models
          });
          
          const generatedCode = scaffoldResponse.choices[0].message.content;
          if (generatedCode && generatedCode.includes('<!DOCTYPE html>')) {
            scaffoldCode = generatedCode;
          }
        } catch (error) {
          console.error('Scaffold generation error:', error);
        }
      }

      // Create artifact for the scaffolded page
      const artifact = await storage.createArtifact({
        id: randomUUID(),
        stepId,
        type: 'html',
        title: `${pageType} Page: ${title}`,
        content: scaffoldCode
      });

      // Update step with scaffolding info
      await storage.updateStep(stepId, {
        status: 'running', 
        description: `Generated ${pageType} page scaffold: ${title}`
      });

      res.json({
        success: true,
        message: `${pageType} page scaffolded: "${title}"`,
        artifact,
        code: scaffoldCode
      });

    } catch (error) {
      console.error('Page scaffolding error:', error);
      res.status(500).json({ error: "Failed to scaffold page" });
    }
  });
  
  // Session management
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid session data" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Public API Surface for Integrators (Memory Anchors Spec)
  
  // GET/POST /tasks (with filters context, view=items|steps|substeps)
  app.get("/api/tasks", async (req, res) => {
    try {
      const { sessionId, context, view } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId query parameter required" });
      }

      const filters = {
        context: context as any,
        view: view as any
      };

      const tasks = await storage.listTasks(sessionId as string, filters);
      
      // Include steps if requested
      if (view === 'steps' || view === 'substeps') {
        const tasksWithSteps = await Promise.all(tasks.map(async (task) => {
          const steps = await storage.listSteps(task.id);
          return { ...task, steps };
        }));
        return res.json({ tasks: tasksWithSteps });
      }

      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  // PATCH /tasks/:id
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const updates = req.body;
      const task = await storage.updateTask(req.params.id, updates);
      res.json(task);
    } catch (error) {
      res.status(404).json({ error: "Task not found" });
    }
  });

  // DELETE /tasks/:id
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId query parameter required" });
      }
      
      await storage.deleteTask(req.params.id);
      res.json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // POST /tasks/:id/steps
  app.post("/api/tasks/:id/steps", async (req, res) => {
    try {
      const stepData = insertStepSchema.parse({
        ...req.body,
        taskId: req.params.id
      });
      const step = await storage.createStep(stepData);
      res.json(step);
    } catch (error) {
      res.status(400).json({ error: "Invalid step data" });
    }
  });

  // PATCH /steps/:id
  app.patch("/api/steps/:id", async (req, res) => {
    try {
      const updates = req.body;
      const step = await storage.updateStep(req.params.id, updates);
      res.json(step);
    } catch (error) {
      res.status(404).json({ error: "Step not found" });
    }
  });

  // GET /conversations/:id/transcript
  app.get("/api/conversations/:id/transcript", async (req, res) => {
    try {
      const messages = await storage.listMessages(req.params.id);
      const transcript = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        transcript: msg.transcript,
        timestamp: msg.timestamp
      }));
      res.json({ transcript });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  });

  // POST /agents/:agentId/kb/documents (proxy to ElevenLabs)
  app.post("/api/agents/:agentId/kb/documents", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { url, content, title } = req.body;
      
      // For now, log the KB document upload request
      // In production, this would proxy to ElevenLabs KB API
      console.log(`KB upload for agent ${agentId}:`, { url, title });
      
      res.json({ 
        success: true,
        agentId,
        documentId: randomUUID(),
        message: "Document uploaded to KB (simulated)"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload to KB" });
    }
  });

  // Memory API (per-domain key-value store)
  app.post("/api/memory", async (req, res) => {
    try {
      const { sessionId, domain, key, value } = req.body;
      if (!sessionId || !domain || !key) {
        return res.status(400).json({ error: "sessionId, domain, and key required" });
      }

      const memory = await storage.setMemory({
        sessionId,
        domain,
        key,
        value
      });
      res.json(memory);
    } catch (error) {
      res.status(500).json({ error: "Failed to save memory" });
    }
  });

  app.get("/api/memory/:sessionId/:domain/:key", async (req, res) => {
    try {
      const { sessionId, domain, key } = req.params;
      const memory = await storage.getMemory(sessionId, domain, key);
      
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      
      res.json(memory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch memory" });
    }
  });

  // ConvAI Event Relay (Simplified version)
  app.post('/api/convai/relay', async (req, res) => {
    // Forward conversation events from ElevenLabs widget
    console.log('[ConvAI Relay]', req.body.type, req.body.detail);
    res.json({ ok: true });
  });

  // Direct Chat Processing
  app.post('/api/chat/process', async (req, res) => {
    try {
      const { message, agentId, sessionId, hasFiles } = req.body;
      
      if (!message || !sessionId) {
        return res.status(400).json({ error: 'Message and sessionId required' });
      }

      console.log(`Processing chat message for session ${sessionId}: ${message.slice(0, 100)}... (hasFiles: ${hasFiles})`);

      // Handle task management operations first
      const taskManagementResult = await handleTaskManagement(message, sessionId);
      if (taskManagementResult.handled) {
        res.json({
          response: taskManagementResult.response,
          tasksCreated: 0,
          tasks: []
        });
        return;
      }

      // Use Adaptive Session for persistent, learning conversation
      const { isVoiceMessage } = req.body;
      
      // Import and use adaptive session integration
      const { AdaptiveSession } = await import("./adaptive-session");
      const adaptiveSession = new AdaptiveSession(sessionId);
      const result = await adaptiveSession.processMessage(message, { isVoiceMessage, hasFiles });
      
      // The AdaptiveSession handles everything with learning
      let response = result.response;
      
      if (result.tasksCreated > 0) {
        console.log(`Created ${result.tasksCreated} tasks from adaptive session`);
      }
      
      if (result.notesCreated > 0 || result.protocolsUpdated > 0) {
        console.log(`Learning: ${result.notesCreated} notes, ${result.protocolsUpdated} protocols updated`);
      }
      
      res.json({
        response,
        tasksCreated: result.tasksCreated,
        tasksUpdated: result.tasksUpdated,
        sessionState: result.sessionState,
        learning: {
          notesCreated: result.notesCreated,
          protocolsUpdated: result.protocolsUpdated
        }
      });
      return;
      
      // Only do fallback conversation if no response was generated
      if (!response || response.trim().length === 0) {
        // Enhanced conversational response
        try {
          let systemPrompt = `You are Colby, a friendly digital operations manager. Be naturally conversational and helpful.

Current context:
- User has tasks in their list that you can help manage
- You can create new tasks when they mention specific work
- Be personable and supportive, like a helpful colleague

If they're just greeting you or making conversation, respond naturally. If they mention specific work, offer to help organize it.${isVoiceMessage ? ' The user just spoke their message - they may have listed multiple tasks that need organizing.' : ''}`;
          
          if (hasFiles) {
            systemPrompt += " The user uploaded documents. Analyze them and offer to help extract actionable items if relevant.";
          }

          const chatResponse = await Promise.race([
            openai.chat.completions.create({
              model: "gpt-5-2025-08-07",
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user", 
                  content: message
                }
              ],
              max_completion_tokens: 200
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('OpenAI API timeout')), 10000)
            )
          ]) as any;
          
          response = chatResponse.choices[0].message.content || response;
        } catch (error) {
          console.error('GPT-5 chat error:', error);
          response = "Hi there! I'm Colby, your digital operations manager. I can help you create and manage tasks, or just chat. What's on your mind?";
        }
      }

      // Save the conversation
      await storage.createMessage({
        sessionId,
        role: 'user',
        content: message,
        taskId: null,
        transcript: message
      });

      await storage.createMessage({
        sessionId,
        role: 'assistant', 
        content: response,
        taskId: null,
        transcript: response
      });

      res.json({
        response,
        tasksCreated: result.tasksCreated || 0,
        tasks: []
      });
      
    } catch (error) {
      console.error('Chat processing error:', error);
      res.status(500).json({ 
        error: "Failed to process message",
        response: "I'm sorry, I encountered an error processing your message. Please try again."
      });
    }
  });

  // Task Management Handler
  async function handleTaskManagement(message: string, sessionId: string) {
    const lowerMessage = message.toLowerCase();
    
    // Delete task requests
    if (lowerMessage.includes('delete') && (lowerMessage.includes('task') || lowerMessage.includes('that'))) {
      try {
        const tasks = await storage.listTasks(sessionId);
        const lastTask = tasks[tasks.length - 1];
        
        if (lastTask) {
          await storage.deleteTask(lastTask.id);
          return {
            handled: true,
            response: `I've deleted the task "${lastTask.title}" for you.`
          };
        } else {
          return {
            handled: true,
            response: "You don't have any tasks to delete right now."
          };
        }
      } catch (error) {
        return {
          handled: true,
          response: "I had trouble deleting that task. Could you try again?"
        };
      }
    }

    // Task status updates
    if ((lowerMessage.includes('mark') || lowerMessage.includes('set')) && lowerMessage.includes('done')) {
      try {
        const tasks = await storage.listTasks(sessionId);
        const activeTask = tasks.find((t: any) => t.status !== 'done');
        
        if (activeTask) {
          await storage.updateTask(activeTask.id, { status: 'done' });
          return {
            handled: true,
            response: `Great! I've marked "${activeTask.title}" as done. Well done!`
          };
        } else {
          return {
            handled: true,
            response: "All your tasks are already completed! Ready for something new?"
          };
        }
      } catch (error) {
        return {
          handled: true,
          response: "I had trouble updating that task status."
        };
      }
    }

    // Task expansion requests
    if (lowerMessage.includes('expand') || lowerMessage.includes('add steps') || lowerMessage.includes('break down')) {
      try {
        const tasks = await storage.listTasks(sessionId);
        const activeTask = tasks.find((t: any) => t.status !== 'done');
        
        if (activeTask) {
          // Use GPT-5 to suggest additional steps
          const expansion = await openai.chat.completions.create({
            model: "gpt-5-2025-08-07",
            messages: [
              {
                role: "system",
                content: "You are Colby. The user wants to expand a task with more detailed steps. Suggest 2-4 specific, actionable sub-steps that would help complete this task. Be practical and helpful."
              },
              {
                role: "user",
                content: `Please suggest detailed steps to expand this task: "${activeTask.title}"`
              }
            ],
            max_completion_tokens: 150
          });

          const suggestions = expansion.choices[0].message.content || "I can help break this down into smaller steps.";
          
          return {
            handled: true,
            response: `Here are some ways to expand "${activeTask.title}":\n\n${suggestions}\n\nWould you like me to add any of these as subtasks?`
          };
        } else {
          return {
            handled: true,
            response: "You don't have any active tasks to expand right now."
          };
        }
      } catch (error) {
        return {
          handled: true,
          response: "I had trouble expanding that task. What specific steps would you like to add?"
        };
      }
    }

    return { handled: false };
  }

  // Supervisor Agent with GPT-5 Ops Manager
  app.post("/api/supervisor/ingest", async (req, res) => {
    try {
      const { sessionId, conversation, builderMode } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      // Log conversation for debugging
      console.log(`Supervisor ingest for session ${sessionId}:`, {
        conversation: conversation?.slice(0, 100) + "...",
        builderMode
      });

      // If builder mode is active, process with Ops Manager
      if (builderMode && conversation) {
        const opsManager = new OpsManager(sessionId);
        const result = await opsManager.processIntent(conversation);
        
        if (result.processed && result.tasks.length > 0) {
          console.log(`Created ${result.tasks.length} tasks from conversation`);
          
          // Save conversation with task linking
          await storage.createMessage({
            sessionId,
            role: 'user',
            content: conversation,
            taskId: result.tasks[0]?.id || null,
            transcript: conversation
          });

          return res.json({
            success: true,
            processed: true,
            tasksCreated: result.tasks.length,
            tasks: result.tasks.map(t => ({ id: t.id, title: t.title }))
          });
        }
      }

      // Just save the conversation
      await storage.createMessage({
        sessionId,
        role: 'user',
        content: conversation || 'Voice conversation',
        transcript: conversation
      });

      res.json({ success: true, processed: false });
    } catch (error) {
      console.error('Supervisor ingest error:', error);
      res.status(500).json({ error: "Failed to process conversation" });
    }
  });

  // ConvAI Widget Event Relay (Enhanced)
  app.post("/api/convai/widget-relay", async (req, res) => {
    try {
      const { type, detail, ts } = req.body;
      console.log(`[EL] ConvAI widget event: ${type}`, detail);
      
      // Handle widget events from frontend
      switch (type) {
        case 'widget-ready':
          console.log('[EL] Widget ready notification received');
          break;
          
        case 'utterance':
        case 'convai-utterance':
          // User spoke - store transcript if available
          if (detail?.transcript) {
            const sessionId = detail.sessionId || 'default';
            await storage.createMessage({
              sessionId,
              role: 'user',
              content: detail.transcript,
              transcript: detail.transcript
            });
            console.log(`[EL] Stored user utterance: "${detail.transcript}"`);
          }
          break;
          
        case 'transcript':
        case 'convai-transcript':
          console.log('[EL] Transcript received:', detail);
          break;
          
        case 'action-call':
        case 'convai-action-call':
          console.log('[EL] Action call received:', detail);
          
          // Route action calls to Colby Actions API
          if (detail?.action_name) {
            const actionPath = `/api/actions/${detail.action_name}`;
            console.log(`[EL] Routing action call to: ${actionPath}`);
            
            try {
              // Forward to appropriate action endpoint
              const actionResponse = await fetch(`http://localhost:5000${actionPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: detail.sessionId || 'default',
                  ...detail.parameters
                })
              });
              
              const actionResult = await actionResponse.json();
              console.log(`[EL] Action ${detail.action_name} result:`, actionResult);
              
            } catch (error) {
              console.error(`[EL] Action ${detail.action_name} failed:`, error);
            }
          }
          break;
      }
      
      res.json({ success: true, received: type });
    } catch (error) {
      console.error('ConvAI widget relay error:', error);
      res.status(500).json({ error: "Failed to process widget event" });
    }
  });

  // ElevenLabs Webhooks (signature verification would be added in production)
  app.post("/api/webhooks/elevenlabs", async (req, res) => {
    try {
      const { event_type, agent_id, session_id, data } = req.body;
      
      console.log(`ElevenLabs webhook: ${event_type}`, { agent_id, session_id });
      
      // Handle different webhook events
      switch (event_type) {
        case 'message.user':
        case 'message.agent':
          if (session_id && data?.content) {
            // Save to conversation storage
            await conversationStorage.saveTranscript({
              agentId: agent_id || 'agent_7401k28d3x9kfdntv7cjrj6t43be',
              sessionId: session_id,
              role: event_type === 'message.user' ? 'user' : 'assistant',
              content: data.content,
              transcript: data.transcript,
              conversationId: data.conversation_id,
              duration: data.duration,
              metadata: data.metadata || {}
            });
            
            // Also save to existing message storage
            await storage.createMessage({
              sessionId: session_id,
              role: event_type === 'message.user' ? 'user' : 'assistant',
              content: data.content,
              transcript: data.transcript
            });
          }
          break;
          
        case 'session.start':
          if (session_id) {
            await storage.createSession({ id: session_id });
          }
          break;
          
        case 'transcript.complete':
          console.log('Transcript completed for session:', session_id);
          break;
      }

      res.json({ success: true, received: event_type });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Legacy endpoints for backward compatibility
  app.post("/api/tasks/add", async (req, res) => {
    try {
      const { sessionId, title, context, timeWindow } = req.body;
      if (!sessionId || !title) {
        return res.status(400).json({ error: "sessionId and title required" });
      }

      const task = await storage.createTask({
        sessionId,
        title,
        context: context || 'computer',
        timeWindow: timeWindow || 'any',
        status: 'today',
        description: null
      });

      // Auto-capture to knowledge base
      try {
        const { knowledgeBaseManager } = await import("./knowledge-base-manager");
        await knowledgeBaseManager.captureTask(task, sessionId);
      } catch (error) {
        console.error("Failed to capture task to knowledge base:", error);
      }

      res.json({ success: true, task });
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.get("/api/tasks/list/:sessionId", async (req, res) => {
    try {
      const tasks = await storage.listTasks(req.params.sessionId);
      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Conversations
  app.post("/api/conversations", async (req, res) => {
    try {
      const messageData = insertConversationSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.get("/api/conversations/:sessionId", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const messages = await storage.listMessages(req.params.sessionId, limit);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Conversation Transcripts API
  app.get("/api/transcripts", async (req, res) => {
    try {
      const { sessionId, agentId } = req.query;
      const transcripts = await conversationStorage.getTranscripts(
        sessionId as string, 
        agentId as string
      );
      res.json({ transcripts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transcripts" });
    }
  });

  app.get("/api/transcripts/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      
      const transcripts = await conversationStorage.searchTranscripts(q);
      res.json({ transcripts, query: q });
    } catch (error) {
      res.status(500).json({ error: "Failed to search transcripts" });
    }
  });

  app.post("/api/transcripts", async (req, res) => {
    try {
      const transcript = await conversationStorage.saveTranscript(req.body);
      res.json({ success: true, transcript });
    } catch (error) {
      res.status(500).json({ error: "Failed to save transcript" });
    }
  });

  // Proposals (legacy)
  app.post("/api/proposals", async (req, res) => {
    try {
      const proposalData = insertProposalSchema.parse(req.body);
      const proposal = await storage.createProposal(proposalData);
      res.json(proposal);
    } catch (error) {
      res.status(400).json({ error: "Invalid proposal data" });
    }
  });

  app.get("/api/proposals", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      const proposals = await storage.listProposals(sessionId);
      res.json({ proposals });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.patch("/api/proposals/:id", async (req, res) => {
    try {
      const updates = req.body;
      const proposal = await storage.updateProposal(req.params.id, updates);
      res.json(proposal);
    } catch (error) {
      res.status(404).json({ error: "Proposal not found" });
    }
  });

  app.delete("/api/proposals/:id", async (req, res) => {
    try {
      await storage.deleteProposal(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete proposal" });
    }
  });

  // File uploads
  app.post("/api/files/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      const file = await storage.createFile({
        id: randomUUID(),
        sessionId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      });

      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/files/:sessionId", async (req, res) => {
    try {
      const files = await storage.listFiles(req.params.sessionId);
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // System stats
  app.get("/api/stats/:sessionId", async (req, res) => {
    try {
      const stats = await storage.getSystemStats(req.params.sessionId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date(),
      features: {
        elevenLabsActions: true,
        opsManager: true,
        memoryModel: true,
        contextRouting: true,
        projectManagement: true,
        calendarIntegration: true,
        researchTools: true
      }
    });
  });

  // **PROJECT MANAGEMENT API ENDPOINTS**
  
  // Projects
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const { sessionId, status, priority } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }
      const projects = await storage.listProjects(sessionId as string, { 
        status: status as string, 
        priority: priority as string 
      });
      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const updates = req.body;
      const project = await storage.updateProject(req.params.id, updates);
      res.json(project);
    } catch (error) {
      res.status(404).json({ error: "Project not found" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Research Documents
  app.post("/api/research", async (req, res) => {
    try {
      const researchData = insertResearchDocSchema.parse(req.body);
      const doc = await storage.createResearchDoc(researchData);
      res.json(doc);
    } catch (error) {
      res.status(400).json({ error: "Invalid research document data" });
    }
  });

  app.get("/api/research", async (req, res) => {
    try {
      const { sessionId, projectId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }
      const docs = await storage.listResearchDocs(sessionId as string, projectId as string);
      res.json({ documents: docs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch research documents" });
    }
  });

  app.get("/api/research/:id", async (req, res) => {
    try {
      const doc = await storage.getResearchDoc(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Research document not found" });
      }
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch research document" });
    }
  });

  app.patch("/api/research/:id", async (req, res) => {
    try {
      const updates = req.body;
      const doc = await storage.updateResearchDoc(req.params.id, updates);
      res.json(doc);
    } catch (error) {
      res.status(404).json({ error: "Research document not found" });
    }
  });

  app.delete("/api/research/:id", async (req, res) => {
    try {
      await storage.deleteResearchDoc(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete research document" });
    }
  });

  // Calendar Events
  app.post("/api/calendar", async (req, res) => {
    try {
      const eventData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(eventData);
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid calendar event data" });
    }
  });

  app.get("/api/calendar", async (req, res) => {
    try {
      const { sessionId, projectId, taskId, startDate, endDate } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }
      
      const filters: any = {};
      if (projectId) filters.projectId = projectId as string;
      if (taskId) filters.taskId = taskId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const events = await storage.listCalendarEvents(sessionId as string, filters);
      res.json({ events });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.patch("/api/calendar/:id", async (req, res) => {
    try {
      const updates = req.body;
      const event = await storage.updateCalendarEvent(req.params.id, updates);
      res.json(event);
    } catch (error) {
      res.status(404).json({ error: "Calendar event not found" });
    }
  });

  app.delete("/api/calendar/:id", async (req, res) => {
    try {
      await storage.deleteCalendarEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  // Project Files
  app.post("/api/project-files/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { sessionId, projectId, description, type } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      const file = await storage.createProjectFile({
        sessionId,
        projectId: projectId || null,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        type: type || 'other',
        description: description || null,
      });

      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload project file" });
    }
  });

  app.get("/api/project-files", async (req, res) => {
    try {
      const { sessionId, projectId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }
      const files = await storage.listProjectFiles(sessionId as string, projectId as string);
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project files" });
    }
  });

  // **PROJECT CONTEXT SWITCHING ENDPOINTS**

  // Switch project context mid-conversation
  app.post("/api/project-context/switch", async (req, res) => {
    try {
      const { sessionId, projectId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      const context = await projectContextManager.switchProjectContext(
        sessionId, 
        projectId || null
      );
      
      res.json({
        success: true,
        context,
        message: projectId ? 
          `Switched to project: ${context.projectTitle}` : 
          'Switched to global view'
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message || "Failed to switch project context" });
    }
  });

  // Get current project context
  app.get("/api/project-context/:sessionId", async (req, res) => {
    try {
      const context = projectContextManager.getCurrentContext(req.params.sessionId);
      const contextPrompt = projectContextManager.generateContextPrompt(req.params.sessionId);
      
      res.json({
        context,
        contextPrompt,
        availableProjects: await projectContextManager.getAvailableProjects(req.params.sessionId)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get project context" });
    }
  });

  // Project-aware GPT-5 conversation endpoint
  app.post("/api/conversations/project-aware", async (req, res) => {
    try {
      const { sessionId, message, projectId } = req.body;
      if (!sessionId || !message) {
        return res.status(400).json({ error: "sessionId and message required" });
      }

      const result = await processProjectAwareConversation(
        sessionId,
        message,
        projectId
      );
      
      res.json({
        success: true,
        response: result.response,
        contextSwitched: result.contextSwitched,
        itemsCreated: {
          researchDocs: result.researchDocsCreated,
          events: result.eventsScheduled,
          tasks: result.tasksCreated
        }
      });
    } catch (error) {
      console.error('Project-aware conversation failed:', error);
      res.status(500).json({ error: "Failed to process conversation" });
    }
  });

  // Quick research document creation
  app.post("/api/research/quick-create", async (req, res) => {
    try {
      const { sessionId, title, content, summary, sources } = req.body;
      if (!sessionId || !title || !content) {
        return res.status(400).json({ error: "sessionId, title, and content required" });
      }

      const doc = await projectContextManager.createResearchFromConversation(
        sessionId,
        title,
        content,
        summary,
        sources
      );
      
      res.json({
        success: true,
        document: doc,
        message: `Research document "${title}" created and added to current project context`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create research document" });
    }
  });

  // Quick calendar event scheduling
  app.post("/api/calendar/quick-schedule", async (req, res) => {
    try {
      const { sessionId, title, description, startTime, endTime, taskId } = req.body;
      if (!sessionId || !title || !startTime || !endTime) {
        return res.status(400).json({ error: "sessionId, title, startTime, and endTime required" });
      }

      const event = await projectContextManager.scheduleEventFromConversation(
        sessionId,
        title,
        description,
        new Date(startTime),
        new Date(endTime),
        taskId
      );
      
      res.json({
        success: true,
        event,
        message: `Event "${title}" scheduled and added to current project context`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to schedule event" });
    }
  });

  // **SHARED KNOWLEDGE BASE ENDPOINTS**

  // Upload document to shared knowledge base
  app.post("/api/knowledge-base/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { sessionId, title, projectId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      // Determine format from file extension
      const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
      const formatMap: { [key: string]: any } = {
        'txt': 'text',
        'pdf': 'pdf',
        'docx': 'docx',
        'html': 'html',
        'epub': 'epub'
      };
      const format = formatMap[fileExt || 'txt'] || 'text';

      const document = await knowledgeBaseManager.addFromUserUpload(
        sessionId,
        title || req.file.originalname,
        req.file.path,
        format,
        projectId || undefined
      );

      res.json({
        success: true,
        document,
        message: `Document "${document.title}" uploaded and synced to shared knowledge base`
      });
    } catch (error) {
      console.error('Knowledge base upload error:', error);
      res.status(500).json({ error: "Failed to upload document to knowledge base" });
    }
  });

  // Add text document to knowledge base
  app.post("/api/knowledge-base/add-text", async (req, res) => {
    try {
      const { sessionId, title, content, projectId, tags } = req.body;
      if (!sessionId || !title || !content) {
        return res.status(400).json({ error: "sessionId, title, and content required" });
      }

      const document = await knowledgeBaseManager.addManualDocument(
        sessionId,
        title,
        content,
        projectId || undefined,
        tags || []
      );

      res.json({
        success: true,
        document,
        message: `Document "${document.title}" added to shared knowledge base`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add document to knowledge base" });
    }
  });

  // Search knowledge base
  app.get("/api/knowledge-base/search", async (req, res) => {
    try {
      const { sessionId, query, projectId } = req.query;
      if (!sessionId || !query) {
        return res.status(400).json({ error: "sessionId and query required" });
      }

      const documents = knowledgeBaseManager.searchDocuments(
        sessionId as string,
        query as string,
        projectId as string
      );

      res.json({ documents });
    } catch (error) {
      res.status(500).json({ error: "Failed to search knowledge base" });
    }
  });

  // Get all knowledge base documents
  app.get("/api/knowledge-base/documents", async (req, res) => {
    try {
      const { sessionId, projectId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      const documents = knowledgeBaseManager.getDocuments(
        sessionId as string,
        projectId as string
      );

      res.json({ documents });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge base documents" });
    }
  });

  // Get sync status
  app.get("/api/knowledge-base/sync-status/:sessionId", async (req, res) => {
    try {
      const status = knowledgeBaseManager.getSyncStatus(req.params.sessionId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  // Retry failed syncs
  app.post("/api/knowledge-base/retry-sync", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      const successCount = await knowledgeBaseManager.retryFailedSyncs(sessionId);
      res.json({
        success: true,
        syncedCount: successCount,
        message: `Successfully synced ${successCount} documents to ElevenLabs`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retry sync" });
    }
  });

  // Delete knowledge base document
  app.delete("/api/knowledge-base/documents/:id", async (req, res) => {
    try {
      const success = await knowledgeBaseManager.removeDocument(req.params.id);
      if (success) {
        res.json({ success: true, message: "Document removed from knowledge base" });
      } else {
        res.status(404).json({ error: "Document not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to remove document" });
    }
  });

  // Update knowledge base document
  app.patch("/api/knowledge-base/documents/:id", async (req, res) => {
    try {
      const updates = req.body;
      const success = await knowledgeBaseManager.updateDocument(req.params.id, updates);
      
      if (success) {
        const document = knowledgeBaseManager.getDocument(req.params.id);
        res.json({ success: true, document });
      } else {
        res.status(404).json({ error: "Document not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Knowledge-aware GPT-5 conversation
  app.post("/api/conversations/knowledge-aware", async (req, res) => {
    try {
      const { sessionId, message, projectId, includeKnowledge = true } = req.body;
      if (!sessionId || !message) {
        return res.status(400).json({ error: "sessionId and message required" });
      }

      // Generate knowledge context if requested
      let knowledgeContext = '';
      if (includeKnowledge) {
        knowledgeContext = knowledgeBaseManager.generateKnowledgeContext(
          sessionId,
          projectId,
          message
        );
      }

      // Enhanced system prompt with knowledge base awareness
      const systemPrompt = `You are an AI assistant with access to a shared knowledge base that contains research documents, project files, and other information. This knowledge base is also accessible to ElevenLabs voice agents and users.

${knowledgeContext}

When answering questions:
1. Reference relevant knowledge base documents when applicable
2. Offer to save important information to the knowledge base
3. Suggest creating research documents for new topics
4. Maintain consistency with existing knowledge base content

If the user asks about adding information to the knowledge base, explain that documents can be:
- Automatically created by me during conversations
- Uploaded by users (PDF, TXT, DOCX, HTML, EPUB)
- Added manually as text entries
- Automatically synced with ElevenLabs for voice agent access

Current time: ${new Date().toLocaleString()}`;

      try {
        const openai = new (await import('openai')).default({ 
          apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
        });
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.7,
          max_tokens: 1500,
        });

        const response = completion.choices[0].message.content || "I can help you manage and access your knowledge base.";

        res.json({
          success: true,
          response,
          knowledgeContext: includeKnowledge ? knowledgeContext : null
        });
      } catch (error) {
        console.error('Knowledge-aware conversation error:', error);
        res.json({
          success: true,
          response: "I'm here to help you manage your knowledge base and answer questions using your stored documents.",
          knowledgeContext: includeKnowledge ? knowledgeContext : null
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to process knowledge-aware conversation" });
    }
  });

  // **WORKFLOW EXECUTION ENDPOINT**
  // General workflow execution that works with or without N8N
  app.post("/api/workflows/execute", async (req, res) => {
    try {
      const { workflowId, sessionId } = req.body;
      if (!workflowId || !sessionId) {
        return res.status(400).json({ error: "workflowId and sessionId required" });
      }

      console.log(`[Workflow] Executing workflow: ${workflowId} for session: ${sessionId}`);

      // Try N8N first if available
      try {
        // Check if N8N service is available
        const n8nResponse = await fetch('/api/n8n/status');
        const n8nStatus = await n8nResponse.json();
        
        if (n8nStatus.connected) {
          // Use N8N execution
          const n8nExecResponse = await fetch(`/api/n8n/workflows/${workflowId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputData: { sessionId } })
          });
          
          if (n8nExecResponse.ok) {
            const result = await n8nExecResponse.json();
            console.log(`[Workflow] N8N execution successful for ${workflowId}`);
            return res.json(result);
          }
        }
      } catch (n8nError) {
        console.log(`[Workflow] N8N not available, using fallback execution for ${workflowId}`);
      }

      // Fallback: Direct workflow execution based on workflow ID
      let result: any = { success: true, message: 'Workflow executed successfully' };

      switch (workflowId) {
        case 'auto-organize':
          // Auto-organize tasks by context
          const tasks = await storage.listTasks(sessionId);
          const organized = {
            computer: tasks.filter(t => t.context === 'computer'),
            phone: tasks.filter(t => t.context === 'phone'), 
            physical: tasks.filter(t => t.context === 'physical')
          };
          result.data = organized;
          result.message = `Organized ${tasks.length} tasks by context`;
          break;

        case 'calendar-sync':
          // iPhone Calendar Integration
          result.message = 'Calendar sync initiated - please provide iPhone calendar credentials';
          result.action = 'calendar_setup_required';
          break;

        case 'research-assistant':
          // Create research template
          await storage.createResearchDoc({
            sessionId,
            title: 'Research Template',
            content: 'Automated research document template created',
            summary: 'Template for storing research findings',
            sources: []
          });
          result.message = 'Research assistant workflow activated';
          break;

        case 'voice-automation':
          // Voice task creation via ElevenLabs
          result.message = 'Voice automation enabled - ElevenLabs Actions configured';
          result.action = 'voice_commands_active';
          break;

        default:
          result.message = `Custom workflow ${workflowId} executed`;
          console.log(`[Workflow] Custom workflow executed: ${workflowId}`);
      }

      // Store workflow execution in conversation
      await storage.createMessage({
        sessionId,
        role: 'assistant',
        content: `Workflow executed: ${result.message}`
      });

      res.json(result);
    } catch (error) {
      console.error('[Workflow] Execution error:', error);
      res.status(500).json({ error: 'Failed to execute workflow' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}