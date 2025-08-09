import type { Express } from "express";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import OpenAI from "openai";

// GPT-5 is now available and is the latest OpenAI model
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

/**
 * Colby Actions API - matches the comprehensive Colby toolset specification
 * These endpoints provide the exact naming and behavior specified for the Colby digital operations manager
 */

export function registerColbyActions(app: Express) {
  
  // ========================================
  // TASKS & STEPS MANAGEMENT
  // ========================================

  // tasks.create - Create task with optional steps
  app.post("/api/tasks", async (req, res) => {
    try {
      const { sessionId, title, context = 'computer', time_window = 'any', priority = 'normal', steps = [] } = req.body;
      
      if (!sessionId || !title) {
        return res.status(400).json({ ok: false, error: "sessionId and title required" });
      }

      // Create the main task
      const task = await storage.createTask({
        id: randomUUID(),
        sessionId,
        title,
        status: 'backlog',
        context,
        timeWindow: time_window,
        description: ''
      });

      // Create steps if provided
      const stepIds = [];
      for (const stepTitle of steps) {
        const step = await storage.createStep({
          id: randomUUID(),
          taskId: task.id,
          title: stepTitle,
          status: 'pending',
          context,
          timeWindow: time_window,
          canAuto: false,
          description: ''
        });
        stepIds.push(step.id);
      }

      res.json({ ok: true, taskId: task.id, stepIds });

    } catch (error) {
      console.error('tasks.create error:', error);
      res.status(500).json({ ok: false, error: "Failed to create task" });
    }
  });

  // tasks.update - Update task properties
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionId, title, status, context, time_window, priority } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ ok: false, error: "sessionId required" });
      }

      const updates: any = {};
      if (title) updates.title = title;
      if (status) updates.status = status;
      if (context) updates.context = context;
      if (time_window) updates.timeWindow = time_window;
      if (priority) updates.priority = priority;

      await storage.updateTask(id, updates);
      res.json({ ok: true });

    } catch (error) {
      console.error('tasks.update error:', error);
      res.status(500).json({ ok: false, error: "Failed to update task" });
    }
  });

  // steps.add - Add step to a task
  app.post("/api/tasks/:id/steps", async (req, res) => {
    try {
      const { id: taskId } = req.params;
      const { sessionId, title, context = 'computer', time_window = 'any', can_auto = false, parent_step_id = null } = req.body;
      
      if (!sessionId || !title) {
        return res.status(400).json({ ok: false, error: "sessionId and title required" });
      }

      const step = await storage.createStep({
        id: randomUUID(),
        taskId,
        title,
        status: 'pending',
        context,
        timeWindow: time_window,
        canAuto: can_auto,
        parentStepId: parent_step_id,
        description: ''
      });

      res.json({ ok: true, stepId: step.id });

    } catch (error) {
      console.error('steps.add error:', error);
      res.status(500).json({ ok: false, error: "Failed to add step" });
    }
  });

  // steps.update - Update step status/metadata
  app.patch("/api/steps/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { sessionId, status, can_auto, blocked_reason } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ ok: false, error: "sessionId required" });
      }

      const updates: any = {};
      if (status) updates.status = status;
      if (typeof can_auto === 'boolean') updates.canAuto = can_auto;
      if (blocked_reason !== undefined) updates.blockedReason = blocked_reason;

      await storage.updateStep(id, updates);
      res.json({ ok: true });

    } catch (error) {
      console.error('steps.update error:', error);
      res.status(500).json({ ok: false, error: "Failed to update step" });
    }
  });

  // todo.get - Fetch filtered task/step list
  app.post("/api/todo/get", async (req, res) => {
    try {
      const { sessionId, context, time_window, view = 'items' } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ ok: false, error: "sessionId required" });
      }

      const tasks = await storage.listTasks(sessionId);
      
      // Get all steps for this session's tasks
      const allSteps: any[] = [];
      for (const task of tasks) {
        const taskSteps = await storage.listSteps(task.id);
        allSteps.push(...taskSteps);
      }
      let filteredSteps = allSteps;
      
      // Filter by context and time_window
      let filteredTasks = tasks;

      if (context) {
        filteredTasks = filteredTasks.filter((t: any) => t.context === context || t.context === 'any');
        filteredSteps = filteredSteps.filter((s: any) => s.context === context || s.context === 'any');
      }

      if (time_window) {
        filteredTasks = filteredTasks.filter((t: any) => t.timeWindow === time_window || t.timeWindow === 'any');
        filteredSteps = filteredSteps.filter((s: any) => s.timeWindow === time_window || s.timeWindow === 'any');
      }

      // Format response based on view
      const response: any = { ok: true };

      if (view === 'items' || view === 'tasks') {
        response.items = filteredTasks.map((t: any) => ({
          taskId: t.id,
          title: t.title,
          status: t.status,
          context: t.context,
          timeWindow: t.timeWindow
        }));
      }

      if (view === 'steps' || view === 'substeps') {
        response.steps = filteredSteps.map((s: any) => ({
          taskId: s.taskId,
          stepId: s.id,
          title: s.title,
          status: s.status,
          context: s.context,
          timeWindow: s.timeWindow,
          canAuto: s.canAuto
        }));
      }

      res.json(response);

    } catch (error) {
      console.error('todo.get error:', error);
      res.status(500).json({ ok: false, error: "Failed to fetch todo list" });
    }
  });

  // ========================================
  // ARTIFACTS MANAGEMENT
  // ========================================

  // artifacts.add - Attach artifact to step
  app.post("/api/artifacts", async (req, res) => {
    try {
      const { sessionId, step_id, type, label, url_or_path } = req.body;
      
      if (!sessionId || !step_id || !type || !url_or_path) {
        return res.status(400).json({ ok: false, error: "sessionId, step_id, type, and url_or_path required" });
      }

      const artifact = await storage.createArtifact({
        id: randomUUID(),
        stepId: step_id,
        type,
        title: label || `${type} artifact`,
        content: url_or_path
      });

      res.json({ ok: true, artifactId: artifact.id });

    } catch (error) {
      console.error('artifacts.add error:', error);
      res.status(500).json({ ok: false, error: "Failed to add artifact" });
    }
  });

  // ========================================
  // MEMORY SYSTEM
  // ========================================

  // memory.save - Persist reusable value
  app.post("/api/memory/save", async (req, res) => {
    try {
      const { sessionId, domain, key, value } = req.body;
      
      if (!sessionId || !domain || !key || value === undefined) {
        return res.status(400).json({ ok: false, error: "sessionId, domain, key, and value required" });
      }

      // Use the existing memory API format
      await storage.setMemory({
        id: randomUUID(),
        sessionId,
        domain,
        key,
        value: JSON.stringify(value)
      });

      res.json({ ok: true });

    } catch (error) {
      console.error('memory.save error:', error);
      res.status(500).json({ ok: false, error: "Failed to save memory" });
    }
  });

  // memory.get - Retrieve value
  app.post("/api/memory/get", async (req, res) => {
    try {
      const { sessionId, domain, key } = req.body;
      
      if (!sessionId || !domain || !key) {
        return res.status(400).json({ ok: false, error: "sessionId, domain, and key required" });
      }

      const memory = await storage.getMemory(sessionId, domain, key);
      
      if (!memory) {
        return res.json({ ok: true, value: null });
      }

      res.json({ ok: true, value: JSON.parse(memory.value as string) });

    } catch (error) {
      console.error('memory.get error:', error);
      res.status(500).json({ ok: false, error: "Failed to get memory" });
    }
  });

  // ========================================
  // WEB SEARCH & FETCH (Placeholder for Step 2)
  // ========================================

  // web.search - Real web search (TODO: Implement with search API)
  app.post("/api/actions/web_search", async (req, res) => {
    try {
      const { sessionId, query, k = 5 } = req.body;
      
      if (!sessionId || !query) {
        return res.status(400).json({ ok: false, error: "sessionId and query required" });
      }

      // TODO: Implement real web search API (SerpAPI, Tavily, etc.)
      res.json({ 
        ok: true, 
        results: [
          {
            title: `Search result for: ${query}`,
            url: "https://example.com/search-placeholder",
            snippet: "Placeholder search result - real web search to be implemented in Step 2"
          }
        ]
      });

    } catch (error) {
      console.error('web.search error:', error);
      res.status(500).json({ ok: false, error: "Failed to search web" });
    }
  });

  // web.fetch - Fetch and clean page content (TODO: Implement)
  app.post("/api/actions/web_fetch", async (req, res) => {
    try {
      const { sessionId, url } = req.body;
      
      if (!sessionId || !url) {
        return res.status(400).json({ ok: false, error: "sessionId and url required" });
      }

      // TODO: Implement web content fetching and cleaning
      res.json({ 
        ok: true, 
        content: "Placeholder content - web fetching to be implemented in Step 2",
        meta: { title: "Placeholder", wordCount: 0 }
      });

    } catch (error) {
      console.error('web.fetch error:', error);
      res.status(500).json({ ok: false, error: "Failed to fetch web content" });
    }
  });

  // ========================================
  // FILE OPERATIONS (Placeholder for Step 2)  
  // ========================================

  // files.upload - File upload (TODO: Implement)
  app.post("/api/files/upload", async (req, res) => {
    res.json({ ok: false, error: "File upload to be implemented in Step 2" });
  });

  // files.ocr - OCR processing (TODO: Implement)
  app.post("/api/files/ocr", async (req, res) => {
    res.json({ ok: false, error: "OCR to be implemented in Step 2" });
  });

  // files.chunk_embed - Vector embedding (TODO: Implement)
  app.post("/api/files/chunk_embed", async (req, res) => {
    res.json({ ok: false, error: "Vector embedding to be implemented in Step 2" });
  });

  // ========================================
  // KNOWLEDGE BASE (Placeholder for Step 2)
  // ========================================

  // kb.upload - Upload to ElevenLabs KB (TODO: Implement)
  app.post("/api/kb/upload", async (req, res) => {
    res.json({ ok: false, error: "KB upload to be implemented in Step 2" });
  });

  // kb.delete - Delete from KB (TODO: Implement)
  app.post("/api/kb/delete", async (req, res) => {
    res.json({ ok: false, error: "KB delete to be implemented in Step 2" });
  });

  // kb.reindex - Reindex KB (TODO: Implement)
  app.post("/api/kb/reindex", async (req, res) => {
    res.json({ ok: false, error: "KB reindex to be implemented in Step 2" });
  });

  // ========================================
  // UTILITIES (Updated to match Colby spec)
  // ========================================

  // qr.generate - Generate QR code (updated from existing)
  app.post("/api/actions/qr", async (req, res) => {
    try {
      const { sessionId, url, label } = req.body;
      
      if (!sessionId || !url) {
        return res.status(400).json({ ok: false, error: "sessionId and url required" });
      }

      // Generate QR code URL
      const qrContent = encodeURIComponent(url);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrContent}`;
      
      // TODO: Save as artifact and return proper paths for Step 2
      res.json({
        ok: true,
        artifactId: `qr_${randomUUID()}`,
        pngPath: qrCodeUrl // For now, return the service URL
      });

    } catch (error) {
      console.error('qr.generate error:', error);
      res.status(500).json({ ok: false, error: "Failed to generate QR code" });
    }
  });

  // page.scaffold - Create HTML page (updated from existing)
  app.post("/api/actions/scaffold_page", async (req, res) => {
    try {
      const { sessionId, slug, title, html } = req.body;
      
      if (!sessionId || !slug || !title) {
        return res.status(400).json({ ok: false, error: "sessionId, slug, and title required" });
      }

      // Use provided HTML or generate default
      const pageHtml = html || `<!DOCTYPE html>
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
        <div id="agent-root"></div>
    </div>
</body>
</html>`;

      // TODO: Actually save the page in Step 2
      res.json({ 
        ok: true, 
        path: `/${slug}`,
        html: pageHtml
      });

    } catch (error) {
      console.error('page.scaffold error:', error);
      res.status(500).json({ ok: false, error: "Failed to scaffold page" });
    }
  });
}