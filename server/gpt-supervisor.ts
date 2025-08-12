import OpenAI from "openai";
import type { Express } from "express";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory storage for chat messages and analysis
const chatMessages = new Map<string, Array<{
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'analysis' | 'suggestion' | 'chat';
}>>();

const analysisCache = new Map<string, {
  suggestions?: string;
  patterns?: string;
  nextActions?: string;
  lastUpdated: Date;
}>();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export function setupGPTSupervisor(app: Express) {
  // Chat endpoint - get chat history
  app.get('/api/gpt-supervisor/chat', async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const messages = chatMessages.get(sessionId as string) || [];
      res.json(messages);
    } catch (error) {
      console.error('[GPT Supervisor] Error getting chat:', error);
      res.status(500).json({ error: 'Failed to get chat messages' });
    }
  });

  // Chat endpoint - send message to GPT-5
  app.post('/api/gpt-supervisor/chat', upload.array('files'), async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const userMessageId = randomUUID();
      const assistantMessageId = randomUUID();
      
      // Get current session messages
      const currentMessages = chatMessages.get(sessionId) || [];
      
      // Add user message
      const userMessage = {
        id: userMessageId,
        role: 'user' as const,
        content: message || '',
        timestamp: new Date(),
        type: 'chat' as const
      };
      
      // Process uploaded files if any
      const files = req.files as Express.Multer.File[];
      let fileContext = '';
      if (files && files.length > 0) {
        fileContext = '\n\nUploaded files:\n';
        for (const file of files) {
          fileContext += `- ${file.originalname} (${file.mimetype})\n`;
          if (file.mimetype.startsWith('text/') || file.originalname.endsWith('.md')) {
            const content = file.buffer.toString('utf-8');
            fileContext += `Content preview: ${content.substring(0, 500)}...\n\n`;
          }
        }
      }

      // Get context about current tasks and activity
      const tasks = await storage.listTasks(sessionId);
      const recentConversations = await storage.listMessages(sessionId, 10);
      
      const contextualMessage = `${message}${fileContext}

Current Context:
- Active Tasks: ${tasks.length}
- Recent Tasks: ${tasks.slice(0, 5).map(t => `"${t.title}" (${t.status})`).join(', ')}
- Recent Conversations: ${recentConversations.length} messages
`;

      // Get GPT-5 response
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Latest GPT-5 model
        messages: [
          {
            role: "system",
            content: `You are an AI supervisor for an intelligent task management system. You help users manage their tasks, analyze their productivity patterns, and provide insights.

Your capabilities:
- Analyze task patterns and productivity
- Suggest optimizations and improvements
- Help with task planning and prioritization
- Process uploaded files and documents
- Provide actionable insights

Current user context: Session ${sessionId}
Be helpful, insightful, and actionable in your responses.`
          },
          ...currentMessages.slice(-10).map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })),
          {
            role: "user",
            content: contextualMessage
          }
        ],
        max_tokens: 1000
      });

      // Add assistant message
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.',
        timestamp: new Date(),
        type: 'chat' as const
      };

      // Update chat messages
      const updatedMessages = [...currentMessages, userMessage, assistantMessage];
      chatMessages.set(sessionId, updatedMessages);

      res.json({ success: true, message: assistantMessage });
    } catch (error) {
      console.error('[GPT Supervisor] Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Analysis endpoint - get AI insights about user activity
  app.get('/api/gpt-supervisor/analysis', async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const sessionKey = sessionId as string;
      
      // Check if we have recent analysis
      const cached = analysisCache.get(sessionKey);
      const now = new Date();
      if (cached && (now.getTime() - cached.lastUpdated.getTime()) < 30000) { // 30 second cache
        return res.json(cached);
      }

      // Generate new analysis
      const tasks = await storage.listTasks(sessionKey);
      const recentConversations = await storage.listMessages(sessionKey, 20);
      
      if (tasks.length === 0 && recentConversations.length === 0) {
        return res.json({ 
          suggestions: null, 
          patterns: null, 
          nextActions: null,
          lastUpdated: now 
        });
      }

      // Analyze with GPT-5
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI productivity analyst. Analyze the user's task activity and provide brief, actionable insights.

Respond in JSON format with these fields:
- suggestions: Brief productivity suggestions (1-2 sentences)
- patterns: Notable patterns you observe (1-2 sentences)  
- nextActions: Recommended next actions (1-2 sentences)

Keep responses concise and actionable.`
          },
          {
            role: "user",
            content: `Analyze this user's activity:

Tasks (${tasks.length} total):
${tasks.map(t => `- "${t.title}" (${t.status}, ${t.context}, created: ${t.createdAt.toISOString()})`).join('\n')}

Recent Activity:
- ${recentConversations.length} recent conversations
- Task contexts: ${tasks.map(t => t.context).join(', ')}
- Task statuses: ${tasks.map(t => t.status).join(', ')}

Provide analysis in JSON format.`
          }
        ],
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      let analysis;
      try {
        analysis = JSON.parse(completion.choices[0].message.content || '{}');
      } catch {
        analysis = { 
          suggestions: "Continue working on your current tasks!", 
          patterns: "Building good task management habits",
          nextActions: "Focus on completing in-progress items"
        };
      }

      analysis.lastUpdated = now;
      analysisCache.set(sessionKey, analysis);

      res.json(analysis);
    } catch (error) {
      console.error('[GPT Supervisor] Error generating analysis:', error);
      res.status(500).json({ error: 'Failed to generate analysis' });
    }
  });

  // Endpoint to manually trigger analysis update
  app.post('/api/gpt-supervisor/analyze', async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      // Clear cache to force new analysis
      analysisCache.delete(sessionId);
      
      res.json({ success: true, message: 'Analysis will be updated on next request' });
    } catch (error) {
      console.error('[GPT Supervisor] Error triggering analysis:', error);
      res.status(500).json({ error: 'Failed to trigger analysis' });
    }
  });

  console.log('[GPT Supervisor] Routes initialized');
}