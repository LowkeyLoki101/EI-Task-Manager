import OpenAI from "openai";
import { storage } from "./storage";
import { randomUUID } from "crypto";

// Direct GPT-5 integration - no filters, no restrictions, real conversation
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

export class DirectGPT5Chat {
  constructor(private sessionId: string) {}

  async processMessage(message: string, context?: { isVoiceMessage?: boolean, hasFiles?: boolean }): Promise<{
    response: string;
    tasksCreated: number;
    tasks: any[];
  }> {
    try {
      // Build conversation context
      let systemPrompt = `You are an intelligent assistant with access to task management tools. You can have natural conversations AND create tasks when the user mentions actionable items.

Key abilities:
- Natural conversation on any topic
- Smart task creation when you detect actionable items
- Process long documents and extract tasks
- Handle meeting transcripts and create organized task lists
- Voice message processing with natural language understanding

When you detect actionable items, suggest creating tasks. Be conversational and helpful, not robotic.`;

      if (context?.isVoiceMessage) {
        systemPrompt += `\n\nNote: This is a voice message - the user may have listed multiple items that could become tasks.`;
      }

      if (context?.hasFiles) {
        systemPrompt += `\n\nNote: The user uploaded documents. Look for actionable items and offer to create tasks.`;
      }

      // Direct GPT-5 conversation with timeout protection
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
          max_completion_tokens: 800 // Allow longer responses
          // Note: GPT-5 only supports default temperature (1)
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GPT-5 timeout')), 15000)
        )
      ]) as any;

      const response = chatResponse.choices[0].message.content || "I'm here to help! What would you like to work on?";

      // Simple task detection - let GPT-5 decide if tasks should be created
      if (this.shouldCreateTasks(response, message)) {
        const tasks = await this.extractAndCreateTasks(message, response);
        return {
          response,
          tasksCreated: tasks.length,
          tasks
        };
      }

      return {
        response,
        tasksCreated: 0,
        tasks: []
      };

    } catch (error) {
      console.error('Direct GPT-5 error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.status,
        error: error instanceof Error ? error.stack : error
      });
      
      if (error instanceof Error && error.message.includes('timeout')) {
        return {
          response: "I apologize for the delay. Let me help you more efficiently - what specifically would you like to work on?",
          tasksCreated: 0,
          tasks: []
        };
      }

      // More specific error handling
      if (error instanceof Error && error.message.includes('model')) {
        return {
          response: "I'm having trouble with the AI model right now. This could be a configuration issue. Let me know what you'd like to work on and I'll do my best to help.",
          tasksCreated: 0,
          tasks: []
        };
      }

      return {
        response: `I'm having a technical issue (${error instanceof Error ? error.message : 'unknown'}), but I'm here to help. Could you try rephrasing your request?`,
        tasksCreated: 0,
        tasks: []
      };
    }
  }

  private shouldCreateTasks(response: string, userMessage: string): boolean {
    // Simple heuristics - much less restrictive
    const taskKeywords = ['task', 'todo', 'need to', 'should', 'have to', 'plan', 'organize', 'create', 'build', 'call', 'email', 'buy', 'research', 'schedule'];
    const hasTaskKeywords = taskKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword) || response.toLowerCase().includes(keyword)
    );
    
    // Voice messages or file uploads are more likely to contain tasks
    const isLikelyTaskContent = userMessage.length > 50 || userMessage.includes(',') || userMessage.includes('\n');
    
    return hasTaskKeywords && isLikelyTaskContent;
  }

  private async extractAndCreateTasks(userMessage: string, gptResponse: string): Promise<any[]> {
    try {
      // Let GPT-4o extract tasks naturally  
      const taskExtraction = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4o", // Using GPT-4o for task extraction
          messages: [
            {
              role: "system",
              content: `Extract actionable tasks from the user's message. Be practical and helpful.

Return JSON format: { "tasks": [{ "title": string, "context": "computer|phone|physical", "timeWindow": "morning|midday|evening|any" }] }

Only extract clear, actionable items. Don't create tasks for general conversation.`
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 300
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Task extraction timeout')), 8000)
        )
      ]) as any;

      const taskData = JSON.parse(taskExtraction.choices[0].message.content || '{"tasks": []}');
      
      // Create tasks in storage
      const createdTasks = [];
      for (const taskInfo of taskData.tasks || []) {
        if (taskInfo.title && taskInfo.title.trim()) {
          const task = await storage.createTask({
            id: randomUUID(),
            sessionId: this.sessionId,
            title: taskInfo.title.trim(),
            context: taskInfo.context || 'computer',
            timeWindow: taskInfo.timeWindow || 'any',
            status: 'today',
            description: null,
          });
          createdTasks.push(task);
        }
      }

      return createdTasks;
    } catch (error) {
      console.error('Task extraction error:', error);
      return []; // Fail gracefully - conversation continues
    }
  }
}