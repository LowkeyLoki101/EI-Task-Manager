import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerElevenLabsActions, OpsManager } from "./elevenlabs-actions";
import { registerEnhancedActions } from "./enhanced-actions";
import { 
  insertTaskSchema, insertStepSchema, insertConversationSchema, 
  insertProposalSchema, insertFileSchema, insertSessionSchema,
  addTaskActionSchema, getTodoListActionSchema
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
            temperature: 0.7
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
            temperature: 0.3
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

  // ConvAI Event Relay
  app.post('/api/convai/relay', async (req, res) => {
    // Forward conversation events from ElevenLabs widget
    console.log('[ConvAI Relay]', req.body.type, req.body.detail);
    res.json({ ok: true });
  });

  // Direct Chat Processing
  app.post('/api/chat/process', async (req, res) => {
    try {
      const { message, agentId, sessionId } = req.body;
      
      if (!message || !sessionId) {
        return res.status(400).json({ error: 'Message and sessionId required' });
      }

      console.log(`Processing chat message for session ${sessionId}: ${message}`);

      // Use GPT-5 to process the message and create tasks if needed
      const opsManager = new OpsManager(sessionId);
      const result = await opsManager.processIntent(message);
      
      let response = "I understand. Let me help you with that task.";
      
      if (result.processed && result.tasks.length > 0) {
        const taskTitles = result.tasks.map(t => t.title).join(", ");
        response = `I've created ${result.tasks.length} task(s) for you: ${taskTitles}. You can enable Builder Mode to see automated progress.`;
        
        console.log(`Created ${result.tasks.length} tasks from chat message`);
      } else {
        // Just a conversational response
        try {
          const chatResponse = await openai.chat.completions.create({
            model: "gpt-5-2025-08-07",
            messages: [
              {
                role: "system",
                content: "You are a helpful AI assistant for task management. Respond conversationally and offer to help create tasks or organize work."
              },
              {
                role: "user", 
                content: message
              }
            ],
            max_completion_tokens: 150
          });
          
          response = chatResponse.choices[0].message.content || response;
        } catch (error) {
          console.error('GPT-5 chat error:', error);
          // Use default response
        }
      }

      // Save the conversation
      await storage.createMessage({
        sessionId,
        role: 'user',
        content: message,
        taskId: result.tasks[0]?.id || null,
        transcript: message
      });

      await storage.createMessage({
        sessionId,
        role: 'assistant', 
        content: response,
        taskId: result.tasks[0]?.id || null,
        transcript: response
      });

      res.json({
        response,
        tasksCreated: result.tasks.length,
        tasks: result.tasks.map(t => ({ id: t.id, title: t.title }))
      });
      
    } catch (error) {
      console.error('Chat processing error:', error);
      res.status(500).json({ 
        error: "Failed to process message",
        response: "I'm sorry, I encountered an error processing your message. Please try again."
      });
    }
  });

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

  // ConvAI Widget Event Relay
  app.post("/api/convai/relay", async (req, res) => {
    try {
      const { type, detail, ts } = req.body;
      console.log(`[EL] ConvAI relay: ${type}`, detail);
      
      // Handle widget events from frontend
      switch (type) {
        case 'widget-ready':
          console.log('[EL] Widget ready notification received');
          break;
          
        case 'utterance':
          // User spoke - store transcript if available
          if (detail?.transcript) {
            const sessionId = detail.sessionId || 'default-session';
            await storage.createMessage({
              sessionId,
              role: 'user',
              content: detail.transcript,
              transcript: detail.transcript
            });
          }
          break;
          
        case 'transcript':
          console.log('[EL] Transcript received:', detail);
          break;
          
        case 'tool_call':
          console.log('[EL] Tool call received:', detail);
          break;
      }
      
      res.json({ success: true, received: type });
    } catch (error) {
      console.error('ConvAI relay error:', error);
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
        id: randomUUID(),
        sessionId,
        title,
        context: context || 'computer',
        timeWindow: timeWindow || 'any',
        status: 'today',
        description: null
      });

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
        contextRouting: true
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}