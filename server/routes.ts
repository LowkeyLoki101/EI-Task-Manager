import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertConversationSchema, insertProposalSchema, insertFileSchema, insertSessionSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
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

  // Task management
  // Add task endpoint per your specifications
  app.post("/api/tasks/add", async (req, res) => {
    try {
      const { sessionId, title } = req.body || {};
      if (!sessionId || !title) {
        return res.status(400).json({ error: "sessionId, title required" });
      }

      const dataDir = process.env.STORAGE_DIR || path.join(process.cwd(), 'data');
      const sessionDir = path.join(dataDir, sessionId);
      const taskFile = path.join(sessionDir, 'tasks.json');
      
      fs.mkdirSync(sessionDir, { recursive: true });
      
      let data = { tasks: [] as any[] };
      try {
        if (fs.existsSync(taskFile)) {
          data = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
        }
      } catch {}

      const newTask = {
        id: randomUUID(),
        title,
        status: 'todo',
        priority: 'med',
        due: null,
        notes: [],
        subtasks: [],
        attachments: [],
        meta: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      data.tasks.push(newTask);
      fs.writeFileSync(taskFile, JSON.stringify(data, null, 2));

      res.json({ ok: true });
    } catch (error) {
      console.error("Add task error:", error);
      res.status(500).json({ error: "Failed to add task" });
    }
  });

  // Update task endpoint per your specifications
  app.post("/api/tasks/update", async (req, res) => {
    try {
      const { sessionId, id, ...patch } = req.body || {};
      if (!sessionId || !id) {
        return res.status(400).json({ error: "sessionId, id required" });
      }

      const dataDir = process.env.STORAGE_DIR || path.join(process.cwd(), 'data');
      const taskFile = path.join(dataDir, sessionId, 'tasks.json');
      
      let data = { tasks: [] as any[] };
      try {
        if (fs.existsSync(taskFile)) {
          data = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
        }
      } catch {}

      const task = data.tasks.find((t: any) => t.id === id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      Object.assign(task, patch);
      task.meta = { ...(task.meta || {}), updatedAt: Date.now() };

      fs.mkdirSync(path.dirname(taskFile), { recursive: true });
      fs.writeFileSync(taskFile, JSON.stringify(data, null, 2));

      res.json({ ok: true });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        id: req.body.id || `t_${randomUUID()}`
      });
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }
      const tasks = await storage.listTasks(sessionId as string);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const updates = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, updates);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task update" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Conversation management
  app.post("/api/conversations", async (req, res) => {
    try {
      const messageData = insertConversationSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    try {
      const { sessionId, limit } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }
      const messages = await storage.listMessages(
        sessionId as string, 
        limit ? parseInt(limit as string) : undefined
      );
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // AI Supervisor agent endpoint - GPT-5 planner tick
  app.post("/api/supervisor/agent", async (req, res) => {
    try {
      const { sessionId, slug } = req.query as any;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      // Read events from memory
      const key = `${sessionId}:${slug || 'task-builder'}`;
      const events = ((global as any).__INGEST__?.[key] || []).slice(-30);
      const convo = events.map((e: any) => `${e.role || 'user'}: ${e.text || e.type}`).join('\n');

      const SYSTEM = `
You are the Task Supervisor.
Turn conversation into a rolling to-do list with layered subtasks.
When the user implies a task, create it. When details emerge, update it.
Use tools when asked: web_search (for links), save_form (to persist structured data), run_action (placeholder exec).
Never invent sensitive data. Be brief and explicit.
Return JSON: { actions: [ {type:'add'|'update'|'note', task?:{...}, id? } ], questions?:[], notes?:[] }.
`.trim();

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o as gpt-5 not available yet
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Recent conversation:\n${convo}\n\nCurrent tasks (titles only OK). Produce JSON plan as instructed.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      let plan: any = {};
      try {
        plan = JSON.parse(response.choices[0].message.content || "{}");
      } catch {
        plan = { actions: [] };
      }

      // Apply plan to JSON file storage
      const dataDir = process.env.STORAGE_DIR || path.join(process.cwd(), 'data');
      const sessionDir = path.join(dataDir, sessionId);
      const taskFile = path.join(sessionDir, 'tasks.json');
      
      // Ensure directory exists
      fs.mkdirSync(sessionDir, { recursive: true });
      
      let data = { tasks: [] as any[] };
      try {
        if (fs.existsSync(taskFile)) {
          data = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
        }
      } catch {}

      // Apply actions
      for (const action of (plan.actions || [])) {
        if (action.type === 'add' && action.task) {
          action.task.id = action.task.id || `t_${randomUUID()}`;
          action.task.status = action.task.status || 'todo';
          action.task.priority = action.task.priority || 'med';
          action.task.notes = action.task.notes || [];
          action.task.subtasks = action.task.subtasks || [];
          action.task.attachments = action.task.attachments || [];
          action.task.meta = {
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          data.tasks.push(action.task);
        }
        if (action.type === 'update' && action.id) {
          const task = data.tasks.find((t: any) => t.id === action.id);
          if (task) {
            Object.assign(task, action.patch || {});
            task.meta = { ...(task.meta || {}), updatedAt: Date.now() };
          }
        }
        if (action.type === 'note' && action.id && action.text) {
          const task = data.tasks.find((t: any) => t.id === action.id);
          if (task) {
            task.notes.push(action.text);
            task.meta = { ...(task.meta || {}), updatedAt: Date.now() };
          }
        }
      }

      // Save updated tasks
      fs.writeFileSync(taskFile, JSON.stringify(data, null, 2));

      res.json({ ok: true, plan });
    } catch (error) {
      console.error("Supervisor agent error:", error);
      res.status(500).json({ error: "Supervisor agent failed" });
    }
  });

  // YouTube search
  app.get("/api/tools/youtube-search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query required" });
      }

      const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
      if (!youtubeApiKey) {
        return res.status(500).json({ error: "YouTube API key not configured" });
      }

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(q as string)}&type=video&key=${youtubeApiKey}`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();

      const videos = data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`
      })) || [];

      res.json({ videos });
    } catch (error) {
      console.error("YouTube search error:", error);
      res.status(500).json({ error: "YouTube search failed" });
    }
  });

  // File upload
  app.post("/api/files/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file || !req.body.sessionId) {
        return res.status(400).json({ error: "File and sessionId required" });
      }

      const fileId = randomUUID();
      const fileExt = path.extname(req.file.originalname);
      const filename = `${fileId}${fileExt}`;
      const filePath = path.join('uploads', filename);
      
      // Move file to permanent location
      fs.renameSync(req.file.path, filePath);

      const file = await storage.createFile({
        id: fileId,
        sessionId: req.body.sessionId,
        filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${filename}`
      });

      res.json(file);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "File upload failed" });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:filename", (req, res) => {
    const filePath = path.join(process.cwd(), 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.get("/api/files", async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }
      const files = await storage.listFiles(sessionId as string);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Code proposals
  app.post("/api/proposals", async (req, res) => {
    try {
      const proposalData = insertProposalSchema.parse({
        ...req.body,
        id: req.body.id || `p_${randomUUID()}`
      });
      const proposal = await storage.createProposal(proposalData);
      res.json(proposal);
    } catch (error) {
      res.status(400).json({ error: "Invalid proposal data" });
    }
  });

  app.get("/api/proposals", async (req, res) => {
    try {
      const { sessionId } = req.query;
      const proposals = await storage.listProposals(sessionId as string);
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.put("/api/proposals/:id", async (req, res) => {
    try {
      const updates = insertProposalSchema.partial().parse(req.body);
      const proposal = await storage.updateProposal(req.params.id, updates);
      res.json(proposal);
    } catch (error) {
      res.status(400).json({ error: "Invalid proposal update" });
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

  // System stats
  app.get("/api/stats", async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }
      const stats = await storage.getSystemStats(sessionId as string);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Web search endpoint
  app.get("/api/tools/web-search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query required" });
      }

      // Mock web search - in production, integrate with Bing Search API
      const mockResults = [
        {
          title: `Search results for: ${q}`,
          url: "https://example.com",
          snippet: "Mock search result for development purposes"
        }
      ];

      res.json({ items: mockResults });
    } catch (error) {
      res.status(500).json({ error: "Web search failed" });
    }
  });

  // Supervisor ingest endpoint - mirror conversation events from ElevenLabs widget
  app.post("/api/supervisor/ingest", async (req, res) => {
    try {
      const { sessionId, slug, evt } = req.body || {};
      if (!sessionId || !evt) {
        return res.status(400).json({ error: "sessionId, evt required" });
      }
      
      // Store events in memory for the supervisor to process
      const key = `${sessionId}:${slug}`;
      if (!(global as any).__INGEST__) (global as any).__INGEST__ = {};
      if (!(global as any).__INGEST__[key]) (global as any).__INGEST__[key] = [];
      (global as any).__INGEST__[key].push({ ts: Date.now(), ...evt });
      
      res.json({ ok: true });
    } catch (error) {
      console.error("Ingest error:", error);
      res.status(500).json({ error: "Ingest failed" });
    }
  });

  // ElevenLabs Conversational AI endpoint
  app.post("/api/voice/conversation", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenlabsKey) {
        return res.status(500).json({ error: "ElevenLabs API key not configured" });
      }

      const agentId = "agent_8201k251883jf0hr1ym7d6dbymxc";
      
      // Read audio file as buffer
      const audioBuffer = fs.readFileSync(req.file.path);
      
      // Send audio to ElevenLabs Conversational AI
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('audio', audioBlob, 'recording.wav');

      const conversationResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsKey
        },
        body: formData
      });

      if (!conversationResponse.ok) {
        throw new Error(`ElevenLabs Conversation API error: ${conversationResponse.status}`);
      }

      // Get the response which should include both transcription and AI response
      const conversationData = await conversationResponse.json();
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json(conversationData);
    } catch (error) {
      console.error("Voice conversation error:", error);
      
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: "Voice conversation failed" });
    }
  });

  // Voice transcription endpoint (fallback)
  app.post("/api/voice/transcribe", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Use OpenAI Whisper for transcription
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: 'whisper-1',
      });

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ text: transcriptionResponse.text });
    } catch (error) {
      console.error("Voice transcription error:", error);
      
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  // Voice synthesis endpoint
  app.post("/api/voice/synthesize", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text required" });
      }

      const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenlabsKey) {
        return res.status(500).json({ error: "ElevenLabs API key not configured" });
      }

      // Use ElevenLabs for text-to-speech
      const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Default voice ID
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsKey
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString()
      });
      
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error("Voice synthesis error:", error);
      res.status(500).json({ error: "Voice synthesis failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
