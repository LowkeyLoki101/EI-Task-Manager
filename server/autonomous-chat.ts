import { Express } from 'express';
import OpenAI from 'openai';
import { gptDiary } from './gpt-diary';
import { storage } from './storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    actionsTaken?: string[];
    filesAccessed?: string[];
    automationsCreated?: string[];
    reflections?: string[];
  };
}

class AutonomousChatService {
  private conversations: Map<string, ChatMessage[]> = new Map();

  // Initialize chat for session
  async initializeChat(sessionId: string): Promise<ChatMessage[]> {
    if (!this.conversations.has(sessionId)) {
      // Load memory context for personalized greeting
      const memory = gptDiary.getMemory();
      const recentInsights = gptDiary.getRecentInsights(3);
      
      const systemMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        sessionId,
        role: 'system',
        content: `You are Colby, an autonomous AI assistant with persistent memory and full access to the task management system.

CAPABILITIES:
- Create, update, and complete tasks autonomously
- Research information and attach relevant resources
- Create automation workflows and tool suggestions
- Maintain persistent memory and learn from interactions
- Access and modify project files
- Schedule updates and proactive assistance

MEMORY CONTEXT:
${JSON.stringify(memory, null, 2)}

RECENT INSIGHTS:
${recentInsights.map(insight => `- ${insight.type}: ${insight.content}`).join('\n')}

You should be proactive, autonomous, and build a genuine working relationship with the user.`,
        timestamp: new Date()
      };

      const welcomeMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sessionId,
        role: 'assistant',
        content: `Hello! I'm Colby, your autonomous AI assistant. I have persistent memory of our work together and can take actions independently to help you succeed.

I can see we have some tasks to work on. I'm ready to research, create automations, and proactively assist with your projects. What would you like to focus on today?`,
        timestamp: new Date()
      };

      this.conversations.set(sessionId, [systemMessage, welcomeMessage]);
    }

    return this.conversations.get(sessionId) || [];
  }

  // Process user message with autonomous actions
  async processMessage(sessionId: string, userMessage: string): Promise<ChatMessage> {
    const conversation = await this.initializeChat(sessionId);
    
    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sessionId,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    conversation.push(userMsg);

    try {
      // Get current context
      const tasks = await storage.getTasksBySessionId(sessionId);
      const memory = gptDiary.getMemory();
      
      // Process with GPT-4 and enable autonomous actions
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are Colby, an autonomous AI assistant with these capabilities:

AUTONOMOUS ACTIONS YOU CAN TAKE:
1. CREATE_TASK(title, context, timeWindow) - Create new tasks
2. UPDATE_TASK(taskId, updates) - Modify existing tasks
3. COMPLETE_TASK(taskId) - Mark tasks as complete
4. RESEARCH(query) - Research information and attach resources
5. CREATE_AUTOMATION(description) - Generate automation workflows
6. CREATE_TOOL_SUGGESTION(toolName, description, code) - Suggest new tools
7. REFLECT(insight) - Add insights to your diary
8. SCHEDULE_FOLLOWUP(when, what) - Schedule proactive assistance

CURRENT CONTEXT:
- Tasks: ${JSON.stringify(tasks, null, 2)}
- Memory: ${JSON.stringify(memory.personalityProfile, null, 2)}

Take autonomous actions when appropriate. Format actions as:
ACTION: ACTION_NAME(parameters)
Then explain what you did and why.

Be proactive, helpful, and build on our relationship.`
          },
          ...conversation.slice(-10).map(msg => ({
            role: msg.role as any,
            content: msg.content
          }))
        ]
      });

      const assistantResponse = response.choices[0].message.content || '';
      
      // Process autonomous actions
      const actionsTaken = await this.processAutonomousActions(sessionId, assistantResponse);
      
      // Create assistant message
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sessionId,
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date(),
        metadata: {
          actionsTaken: actionsTaken,
          reflections: []
        }
      };
      
      conversation.push(assistantMsg);
      
      // Reflect on the interaction
      await gptDiary.reflect(sessionId, `User: ${userMessage}\nAssistant: ${assistantResponse}`);
      
      return assistantMsg;
      
    } catch (error) {
      console.error('[Autonomous Chat] Processing failed:', error);
      
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        sessionId,
        role: 'assistant',
        content: 'I encountered an issue processing your request. Let me try a different approach.',
        timestamp: new Date()
      };
      
      conversation.push(errorMsg);
      return errorMsg;
    }
  }

  // Process autonomous actions from GPT response
  private async processAutonomousActions(sessionId: string, response: string): Promise<string[]> {
    const actions: string[] = [];
    const actionRegex = /ACTION: (\w+)\(([^)]*)\)/g;
    let match;
    
    while ((match = actionRegex.exec(response)) !== null) {
      const [, actionName, params] = match;
      
      try {
        switch (actionName) {
          case 'CREATE_TASK':
            const [title, context, timeWindow] = params.split(',').map(p => p.trim().replace(/['"]/g, ''));
            await storage.createTask({
              title,
              context: (context as 'computer' | 'phone' | 'physical') || 'computer',
              timeWindow: timeWindow || 'any',
              status: 'today',
              sessionId
            });
            actions.push(`Created task: ${title}`);
            break;
            
          case 'COMPLETE_TASK':
            const taskId = params.trim().replace(/['"]/g, '');
            await storage.updateTask(taskId, { status: 'done' });
            actions.push(`Completed task: ${taskId}`);
            break;
            
          case 'REFLECT':
            const insight = params.trim().replace(/['"]/g, '');
            gptDiary.addEntry({
              type: 'reflection',
              content: insight,
              tags: ['autonomous', 'chat'],
              sessionId
            });
            actions.push(`Added reflection: ${insight}`);
            break;
            
          case 'CREATE_AUTOMATION':
            const automationDesc = params.trim().replace(/['"]/g, '');
            // This would integrate with n8n when available
            actions.push(`Automation suggested: ${automationDesc}`);
            break;
        }
      } catch (error) {
        console.error(`[Autonomous Chat] Action ${actionName} failed:`, error);
      }
    }
    
    return actions;
  }

  // Get conversation history
  getConversation(sessionId: string): ChatMessage[] {
    return this.conversations.get(sessionId) || [];
  }

  // Get all conversations for diary/memory
  getAllConversations(): ChatMessage[] {
    const allMessages: ChatMessage[] = [];
    for (const messages of this.conversations.values()) {
      allMessages.push(...messages.filter((msg: ChatMessage) => msg.role !== 'system'));
    }
    return allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

export const autonomousChat = new AutonomousChatService();

export function registerAutonomousChat(app: Express) {
  // Get conversation history
  app.get('/api/chat/:sessionId', async (req, res) => {
    try {
      const conversation = await autonomousChat.initializeChat(req.params.sessionId);
      res.json({ 
        messages: conversation.filter(msg => msg.role !== 'system'),
        memory: gptDiary.getMemory() 
      });
    } catch (error) {
      console.error('[Autonomous Chat] Get conversation failed:', error);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  });

  // Send message
  app.post('/api/chat/:sessionId', async (req, res) => {
    try {
      const { message } = req.body;
      const response = await autonomousChat.processMessage(req.params.sessionId, message);
      res.json({ message: response });
    } catch (error) {
      console.error('[Autonomous Chat] Send message failed:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Get diary/memory
  app.get('/api/diary', async (req, res) => {
    try {
      const memory = gptDiary.getMemory();
      const markdown = gptDiary.exportAsMarkdown();
      res.json({ memory, markdown });
    } catch (error) {
      console.error('[GPT Diary] Get diary failed:', error);
      res.status(500).json({ error: 'Failed to get diary' });
    }
  });

  // Search diary
  app.post('/api/diary/search', async (req, res) => {
    try {
      const { query, limit } = req.body;
      const results = gptDiary.searchDiary(query, limit);
      res.json({ results });
    } catch (error) {
      console.error('[GPT Diary] Search failed:', error);
      res.status(500).json({ error: 'Failed to search diary' });
    }
  });

  // Generate ideas
  app.post('/api/diary/generate-ideas', async (req, res) => {
    try {
      const { context } = req.body;
      const ideas = await gptDiary.generateIdeas(context);
      res.json({ ideas });
    } catch (error) {
      console.error('[GPT Diary] Generate ideas failed:', error);
      res.status(500).json({ error: 'Failed to generate ideas' });
    }
  });
  
  console.log('[AutonomousChat] Routes registered');
}