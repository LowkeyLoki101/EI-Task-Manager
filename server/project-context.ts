// Project Context Management for GPT-5 Conversations
import { storage } from "./storage";
import { randomUUID } from "crypto";
import type { Project, ResearchDoc, CalendarEvent, Task } from "@shared/schema";

export interface ProjectContext {
  projectId: string | null;
  projectTitle?: string;
  activeResearchDocs: ResearchDoc[];
  upcomingEvents: CalendarEvent[];
  relatedTasks: Task[];
  lastUpdated: Date;
}

export class ProjectContextManager {
  private sessionContexts: Map<string, ProjectContext>;

  constructor() {
    this.sessionContexts = new Map();
  }

  // Switch project context for a session
  async switchProjectContext(sessionId: string, projectId: string | null): Promise<ProjectContext> {
    let context: ProjectContext;
    
    if (projectId) {
      // Load project-specific context
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const activeResearchDocs = await storage.listResearchDocs(sessionId, projectId);
      const upcomingEvents = await storage.listCalendarEvents(sessionId, { projectId });
      const relatedTasks = await storage.listTasks(sessionId);
      const projectTasks = relatedTasks.filter(task => 
        task.description?.includes(project.title) ||
        activeResearchDocs.some(doc => task.title.includes(doc.title))
      );

      context = {
        projectId,
        projectTitle: project.title,
        activeResearchDocs: activeResearchDocs.slice(0, 5), // Most recent 5
        upcomingEvents: upcomingEvents.slice(0, 3), // Next 3 events
        relatedTasks: projectTasks.slice(0, 10), // Top 10 related tasks
        lastUpdated: new Date()
      };
    } else {
      // Global context (no specific project)
      const allResearchDocs = await storage.listResearchDocs(sessionId);
      const allEvents = await storage.listCalendarEvents(sessionId);
      const allTasks = await storage.listTasks(sessionId);

      context = {
        projectId: null,
        activeResearchDocs: allResearchDocs.slice(0, 3),
        upcomingEvents: allEvents.slice(0, 3),
        relatedTasks: allTasks.filter(t => t.status !== 'done').slice(0, 5),
        lastUpdated: new Date()
      };
    }

    this.sessionContexts.set(sessionId, context);
    return context;
  }

  // Get current project context
  getCurrentContext(sessionId: string): ProjectContext | null {
    return this.sessionContexts.get(sessionId) || null;
  }

  // Generate context summary for GPT-5
  generateContextPrompt(sessionId: string): string {
    const context = this.getCurrentContext(sessionId);
    if (!context) {
      return "No specific project context is currently active.";
    }

    let prompt = "";
    
    if (context.projectId && context.projectTitle) {
      prompt += `🎯 **Current Project Focus: "${context.projectTitle}"**\n\n`;
    } else {
      prompt += `🌐 **Global View - All Projects**\n\n`;
    }

    if (context.activeResearchDocs.length > 0) {
      prompt += `📚 **Active Research:**\n`;
      context.activeResearchDocs.forEach(doc => {
        prompt += `• ${doc.title} (${doc.type}) - ${doc.summary || 'No summary'}\n`;
      });
      prompt += `\n`;
    }

    if (context.upcomingEvents.length > 0) {
      prompt += `📅 **Upcoming Events:**\n`;
      context.upcomingEvents.forEach(event => {
        const eventDate = new Date(event.startTime).toLocaleDateString();
        prompt += `• ${event.title} - ${eventDate}\n`;
      });
      prompt += `\n`;
    }

    if (context.relatedTasks.length > 0) {
      prompt += `✅ **Related Tasks:**\n`;
      context.relatedTasks.forEach(task => {
        prompt += `• ${task.title} (${task.status}) - ${task.context}\n`;
      });
      prompt += `\n`;
    }

    prompt += `*Context updated: ${context.lastUpdated.toLocaleTimeString()}*`;
    
    return prompt;
  }

  // Create research document from GPT-5 conversation
  async createResearchFromConversation(
    sessionId: string, 
    title: string, 
    content: string,
    summary?: string,
    sources?: string[]
  ): Promise<ResearchDoc> {
    const context = this.getCurrentContext(sessionId);
    
    const researchDoc = await storage.createResearchDoc({
      sessionId,
      projectId: context?.projectId || null,
      title,
      content,
      summary: summary || null,
      sources: sources || [],
      type: 'research',
      tags: context?.projectTitle ? [context.projectTitle] : []
    });

    // Update context to include the new document
    if (context) {
      context.activeResearchDocs.unshift(researchDoc);
      context.activeResearchDocs = context.activeResearchDocs.slice(0, 5); // Keep only top 5
      context.lastUpdated = new Date();
      this.sessionContexts.set(sessionId, context);
    }

    return researchDoc;
  }

  // Auto-sync to shared knowledge base
  async createResearchFromConversationWithKB(
    sessionId: string, 
    title: string, 
    content: string,
    summary?: string,
    sources?: string[]
  ): Promise<ResearchDoc> {
    const researchDoc = await this.createResearchFromConversation(
      sessionId, title, content, summary, sources
    );

    // Auto-sync to shared knowledge base
    try {
      const { knowledgeBaseManager } = await import("./knowledge-base");
      await knowledgeBaseManager.addFromResearchDoc(researchDoc);
      console.log(`Research document "${title}" synced to shared knowledge base`);
    } catch (error) {
      console.error('Failed to sync research doc to knowledge base:', error);
    }

    return researchDoc;
  }

  // Add calendar event from conversation
  async scheduleEventFromConversation(
    sessionId: string,
    title: string,
    description: string,
    startTime: Date,
    endTime: Date,
    taskId?: string
  ): Promise<CalendarEvent> {
    const context = this.getCurrentContext(sessionId);
    
    const event = await storage.createCalendarEvent({
      sessionId,
      projectId: context?.projectId || null,
      taskId: taskId || null,
      title,
      description: description || null,
      startTime,
      endTime,
      isAllDay: false
    });

    // Update context
    if (context) {
      context.upcomingEvents.unshift(event);
      context.upcomingEvents = context.upcomingEvents.slice(0, 3); // Keep only top 3
      context.lastUpdated = new Date();
      this.sessionContexts.set(sessionId, context);
    }

    return event;
  }

  // Get project list for context switching
  async getAvailableProjects(sessionId: string): Promise<Project[]> {
    return await storage.listProjects(sessionId, { status: 'active' });
  }

  // Clear project context
  clearContext(sessionId: string): void {
    this.sessionContexts.delete(sessionId);
  }
}

export const projectContextManager = new ProjectContextManager();

// Enhanced GPT-5 conversation system with project awareness
export async function processProjectAwareConversation(
  sessionId: string,
  userMessage: string,
  projectId?: string
): Promise<{
  response: string;
  contextSwitched: boolean;
  researchDocsCreated: number;
  eventsScheduled: number;
  tasksCreated: number;
}> {
  let contextSwitched = false;
  let researchDocsCreated = 0;
  let eventsScheduled = 0;
  let tasksCreated = 0;

  // Switch project context if requested
  if (projectId !== undefined) {
    await projectContextManager.switchProjectContext(sessionId, projectId);
    contextSwitched = true;
  }

  // Generate context-aware prompt
  const contextPrompt = projectContextManager.generateContextPrompt(sessionId);
  const currentContext = projectContextManager.getCurrentContext(sessionId);

  const systemPrompt = `You are an AI project assistant with deep contextual awareness. You help users organize projects, conduct research, schedule events, and manage tasks.

${contextPrompt}

**Your Capabilities:**
1. 📝 Create and save research documents to the current project
2. 📅 Schedule calendar events and deadlines  
3. ✅ Create tasks with smart context assignment (computer/phone/physical)
4. 🔄 Switch between project contexts mid-conversation
5. 📁 Organize files and resources by project
6. 🔍 Search and reference existing research and documents

**Response Guidelines:**
- Always consider the current project context when responding
- If user asks about research, offer to create/save documents
- If user mentions deadlines or scheduling, offer to create calendar events  
- If user describes work to be done, offer to create organized tasks
- When appropriate, suggest switching project context
- Be proactive in offering to organize and structure information

Current time: ${new Date().toLocaleString()}`;

  try {
    const completion = await import('openai').then(({ default: OpenAI }) => {
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
      });
      
      return openai.chat.completions.create({
        model: "gpt-4o", // Latest OpenAI model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
    });

    let response = completion.choices[0].message.content || "I understand. How would you like me to help organize this?";

    // Parse response for actionable items
    const lowerResponse = response.toLowerCase();
    
    // Check for research document creation intent
    if (lowerResponse.includes('research') || lowerResponse.includes('document') || lowerResponse.includes('save this')) {
      const researchMatch = userMessage.match(/research about (.+)|document about (.+)|save (.+)/i);
      if (researchMatch) {
        const topic = researchMatch[1] || researchMatch[2] || researchMatch[3];
        if (topic && topic.length > 5) {
          try {
            await projectContextManager.createResearchFromConversation(
              sessionId,
              `Research: ${topic}`,
              userMessage,
              `Research discussion about ${topic}`,
              []
            );
            researchDocsCreated++;
            response += `\n\n📚 *I've saved this research about "${topic}" to your ${currentContext?.projectTitle ? 'current project' : 'research collection'}.*`;
          } catch (error) {
            console.error('Failed to create research doc:', error);
          }
        }
      }
    }

    // Check for calendar event scheduling
    const dateMatches = userMessage.match(/(tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})/gi);
    if (dateMatches && (lowerResponse.includes('schedule') || lowerResponse.includes('meet') || lowerResponse.includes('deadline'))) {
      try {
        const eventTitle = `Event: ${userMessage.slice(0, 50)}...`;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const endTime = new Date(tomorrow);
        endTime.setHours(11, 0, 0, 0);

        await projectContextManager.scheduleEventFromConversation(
          sessionId,
          eventTitle,
          userMessage,
          tomorrow,
          endTime
        );
        eventsScheduled++;
        response += `\n\n📅 *I've added this to your calendar for follow-up.*`;
      } catch (error) {
        console.error('Failed to create calendar event:', error);
      }
    }

    // Check for task creation
    if (lowerResponse.includes('need to') || lowerResponse.includes('should') || lowerResponse.includes('todo') || lowerResponse.includes('task')) {
      const taskMatches = userMessage.match(/(need to|should|todo:?|task:?) (.+)/gi);
      if (taskMatches) {
        try {
          const taskTitle = taskMatches[0].replace(/(need to|should|todo:?|task:?)/i, '').trim();
          if (taskTitle.length > 3) {
            await storage.createTask({
              sessionId,
              title: taskTitle,
              status: 'today',
              context: 'computer', // Smart context detection could be added
              timeWindow: 'any'
            });
            tasksCreated++;
            response += `\n\n✅ *I've created a task: "${taskTitle}"*`;
          }
        } catch (error) {
          console.error('Failed to create task:', error);
        }
      }
    }

    return {
      response,
      contextSwitched,
      researchDocsCreated,
      eventsScheduled,
      tasksCreated
    };

  } catch (error) {
    console.error('GPT-5 conversation failed:', error);
    return {
      response: "I understand. Let me help you organize this information. Would you like me to create a research document, schedule an event, or add this as a task?",
      contextSwitched,
      researchDocsCreated: 0,
      eventsScheduled: 0,
      tasksCreated: 0
    };
  }
}