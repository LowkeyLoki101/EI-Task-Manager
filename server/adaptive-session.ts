import OpenAI from "openai";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import type { InsertTask, InsertStep, InsertEvent, InsertNote, InsertProtocol, InsertConversation } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-fake-key-for-development" 
});

export class AdaptiveSession {
  private sessionId: string;
  private conversationHistory: InsertConversation[] = [];
  private notes: any[] = [];
  private protocols: any[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async processMessage(message: string, context?: { isVoiceMessage?: boolean, hasFiles?: boolean }): Promise<{
    response: string;
    tasksCreated: number;
    tasksUpdated: number;
    notesCreated: number;
    protocolsUpdated: number;
    sessionState: any;
  }> {
    try {
      // Store the conversation
      await this.addToConversation('user', message);

      // Load session context (previous notes, protocols, task history)
      await this.loadSessionContext();

      // Build adaptive system prompt based on learned patterns
      const systemPrompt = await this.buildAdaptivePrompt(context);

      // Process with GPT-4o in continuous conversation mode
      const chatResponse = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...this.conversationHistory.slice(-10).map(conv => ({
              role: conv.role as 'user' | 'assistant',
              content: conv.content
            })),
            {
              role: "user",
              content: message
            }
          ],
          max_completion_tokens: 1000
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GPT timeout')), 12000)
        )
      ]) as any;

      const response = chatResponse.choices[0].message.content || "I'm here and ready to help!";

      // Store assistant response
      await this.addToConversation('assistant', response);

      // Analyze the conversation for task management actions
      const actions = await this.analyzeAndExecuteActions(message, response);

      // Learn from this interaction (create notes, update protocols)
      const learningResults = await this.learnFromInteraction(message, response, actions);

      // Create event log for this interaction
      await this.logEvent('conversation.processed', {
        userMessage: message,
        assistantResponse: response,
        actions,
        learning: learningResults,
        context
      });

      return {
        response,
        tasksCreated: actions.tasksCreated,
        tasksUpdated: actions.tasksUpdated,
        notesCreated: learningResults.notesCreated,
        protocolsUpdated: learningResults.protocolsUpdated,
        sessionState: await this.getSessionState()
      };

    } catch (error) {
      console.error('Adaptive session error:', error);
      
      const fallbackResponse = "I'm having a technical issue, but I'm still learning from our conversation. What would you like to work on?";
      await this.addToConversation('assistant', fallbackResponse);
      
      return {
        response: fallbackResponse,
        tasksCreated: 0,
        tasksUpdated: 0,
        notesCreated: 0,
        protocolsUpdated: 0,
        sessionState: await this.getSessionState()
      };
    }
  }

  private async addToConversation(role: 'user' | 'assistant', content: string) {
    const conversation: InsertConversation = {
      sessionId: this.sessionId,
      role,
      content,
      transcript: role === 'user' ? content : undefined
    };
    
    this.conversationHistory.push(conversation);
    
    // Store in database (implement when ready)
    // await storage.createConversation(conversation);
  }

  private async loadSessionContext() {
    try {
      // Load previous notes and protocols for this session
      // this.notes = await storage.getNotesBySession(this.sessionId);
      // this.protocols = await storage.getProtocolsBySession(this.sessionId);
      
      // For now, use in-memory context
      console.log(`Loading context for session ${this.sessionId}`);
    } catch (error) {
      console.error('Failed to load session context:', error);
    }
  }

  private async buildAdaptivePrompt(context?: any): string {
    const basePrompt = `You are an adaptive AI assistant that maintains persistent conversations and continuously organizes tasks. You learn from each interaction and improve your understanding of the user's preferences and patterns.

## Current Session Context:
- Session ID: ${this.sessionId}
- Conversation history: ${this.conversationHistory.length} messages
- Learned notes: ${this.notes.length} insights
- Active protocols: ${this.protocols.length} patterns

## Your Capabilities:
1. **Continuous Task Management**: Create, update, merge, and reorganize tasks based on ongoing conversation
2. **Adaptive Learning**: Take notes about user preferences, patterns, and successful workflows
3. **Protocol Evolution**: Develop and refine approaches that work well for this user
4. **Memory Building**: Remember context across conversations to provide better assistance

## Behavioral Guidelines:
- Never end conversations - always keep the dialogue flowing
- Automatically reorganize and update task lists as new information emerges
- Take notes on patterns you observe (user preferences, successful approaches, context clues)
- Suggest improvements based on learned protocols
- Be conversational and adaptive, not robotic or scripted

## Current User Context:
${context?.isVoiceMessage ? '- User is speaking via voice input' : '- User is typing text input'}
${context?.hasFiles ? '- User has uploaded files for processing' : ''}

## Task Management Protocol:
- Create tasks for actionable items mentioned
- Merge similar or duplicate tasks automatically (with user confirmation)
- Update task status based on conversation progress  
- Reorganize task priorities based on user's apparent urgency and context
- Suggest next steps and ask clarifying questions to improve task breakdown

## Learning Protocol:
- Note user preferences (communication style, task organization patterns, time preferences)
- Track successful workflows and approaches
- Identify recurring themes or needs
- Build protocols that make future interactions more efficient

Respond naturally and conversationally while managing tasks and learning from the interaction.`;

    // Add learned insights to prompt
    if (this.notes.length > 0) {
      basePrompt += `\n\n## Learned Insights:\n${this.notes.slice(-5).map(note => `- ${note.title}: ${note.content}`).join('\n')}`;
    }

    if (this.protocols.length > 0) {
      basePrompt += `\n\n## Active Protocols:\n${this.protocols.slice(-3).map(p => `- ${p.name}: ${JSON.stringify(p.rules)}`).join('\n')}`;
    }

    return basePrompt;
  }

  private async analyzeAndExecuteActions(userMessage: string, assistantResponse: string): Promise<{
    tasksCreated: number;
    tasksUpdated: number;
    taskActions: any[];
  }> {
    try {
      // Use GPT-4o to analyze what task actions should be taken
      const actionAnalysis = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Analyze this conversation and determine what task management actions should be taken.

Return JSON format: {
  "actions": [
    {
      "type": "create_task",
      "title": "string",
      "context": "computer|phone|physical", 
      "timeWindow": "morning|midday|evening|any",
      "priority": "high|medium|low"
    },
    {
      "type": "update_task",
      "taskId": "string",
      "updates": { "status": "done", "title": "new title" }
    },
    {
      "type": "merge_tasks",
      "taskIds": ["id1", "id2"],
      "newTitle": "merged title"
    }
  ]
}

Only include actions that are clearly indicated by the conversation.`
            },
            {
              role: "user",
              content: `User: ${userMessage}\nAssistant: ${assistantResponse}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 500
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Action analysis timeout')), 8000)
        )
      ]) as any;

      const actions = JSON.parse(actionAnalysis.choices[0].message.content || '{"actions": []}');
      
      let tasksCreated = 0;
      let tasksUpdated = 0;
      const taskActions = [];

      // Execute the determined actions
      for (const action of actions.actions || []) {
        try {
          if (action.type === 'create_task' && action.title) {
            const task = await storage.createTask({
              id: randomUUID(),
              sessionId: this.sessionId,
              title: action.title,
              context: action.context || 'computer',
              timeWindow: action.timeWindow || 'any',
              status: 'today',
              description: null,
            });
            tasksCreated++;
            taskActions.push({ type: 'created', task });
            
            await this.logEvent('task.created', { task, source: 'conversation' });
          }
          // Add more action types as needed (update, merge, etc.)
        } catch (error) {
          console.error('Failed to execute task action:', action, error);
        }
      }

      return { tasksCreated, tasksUpdated, taskActions };
    } catch (error) {
      console.error('Action analysis failed:', error);
      return { tasksCreated: 0, tasksUpdated: 0, taskActions: [] };
    }
  }

  private async learnFromInteraction(userMessage: string, assistantResponse: string, actions: any): Promise<{
    notesCreated: number;
    protocolsUpdated: number;
  }> {
    try {
      // Analyze interaction for learning opportunities
      const learningAnalysis = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Analyze this interaction for learning opportunities. What patterns, preferences, or protocols should be noted for future conversations?

Return JSON format: {
  "notes": [
    {
      "category": "user_preference|workflow_pattern|context_hint|communication_style",
      "title": "brief title",
      "content": "detailed insight",
      "confidence": 1-10
    }
  ],
  "protocols": [
    {
      "name": "protocol_name",
      "rules": { "key": "value" },
      "trigger": "when to apply this protocol"
    }
  ]
}`
            },
            {
              role: "user",
              content: `User: ${userMessage}\nAssistant: ${assistantResponse}\nActions taken: ${JSON.stringify(actions)}`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 400
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Learning analysis timeout')), 6000)
        )
      ]) as any;

      const learning = JSON.parse(learningAnalysis.choices[0].message.content || '{"notes": [], "protocols": []}');
      
      let notesCreated = 0;
      let protocolsUpdated = 0;

      // Store learned notes
      for (const note of learning.notes || []) {
        if (note.title && note.content && note.confidence > 3) {
          // Store note (implement when ready)
          this.notes.push({
            sessionId: this.sessionId,
            category: note.category,
            title: note.title,
            content: note.content,
            confidence: note.confidence
          });
          notesCreated++;
        }
      }

      // Update protocols
      for (const protocol of learning.protocols || []) {
        if (protocol.name && protocol.rules) {
          // Store/update protocol (implement when ready)
          this.protocols.push({
            sessionId: this.sessionId,
            name: protocol.name,
            rules: protocol.rules,
            version: 1
          });
          protocolsUpdated++;
        }
      }

      return { notesCreated, protocolsUpdated };
    } catch (error) {
      console.error('Learning analysis failed:', error);
      return { notesCreated: 0, protocolsUpdated: 0 };
    }
  }

  private async logEvent(kind: string, payload: any) {
    try {
      // Log event for audit trail and undo functionality
      const event: InsertEvent = {
        sessionId: this.sessionId,
        kind,
        payloadJson: payload
      };
      
      // Store event (implement when ready)
      console.log(`Event logged: ${kind}`, payload);
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }

  private async getSessionState() {
    return {
      sessionId: this.sessionId,
      conversationLength: this.conversationHistory.length,
      notesCount: this.notes.length,
      protocolsCount: this.protocols.length,
      lastUpdate: new Date().toISOString()
    };
  }

  // Method to continue conversation naturally
  async continueConversation(context?: any): Promise<string> {
    // Proactively suggest next steps or ask follow-up questions
    const prompt = `Based on our ongoing conversation and the current task list, what would be a helpful next step or question to move things forward?`;
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are continuing an ongoing conversation. Be natural, helpful, and forward-moving. Suggest next steps or ask relevant questions."
          },
          ...this.conversationHistory.slice(-5).map(conv => ({
            role: conv.role as 'user' | 'assistant',
            content: conv.content
          })),
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 200
      });

      return response.choices[0].message.content || "What would you like to work on next?";
    } catch (error) {
      console.error('Continue conversation error:', error);
      return "What would you like to focus on next?";
    }
  }
}