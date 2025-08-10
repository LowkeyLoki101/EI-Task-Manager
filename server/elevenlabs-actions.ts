// ElevenLabs Actions API implementation based on memory anchors
import type { Express } from "express";
import { storage } from "./storage";
import { 
  addTaskActionSchema, updateStepStatusActionSchema, getTodoListActionSchema,
  kbAttachDocActionSchema, postOpsUpdateActionSchema 
} from "@shared/schema";
import { randomUUID } from "crypto";
import OpenAI from "openai";

// GPT-5 is now available and is the latest OpenAI model
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

export function registerElevenLabsActions(app: Express) {
  
  // Actions (Agent → Replit)
  
  // add_task{ title, context?, time_window?, steps? }
  app.post("/api/actions/add_task", async (req, res) => {
    try {
      const { sessionId, ...actionData } = req.body;
      const parsedAction = addTaskActionSchema.parse(actionData);
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      // Create the task
      const task = await storage.createTask({
        id: randomUUID(),
        sessionId,
        title: parsedAction.title,
        context: parsedAction.context || 'computer',
        timeWindow: parsedAction.timeWindow || 'any',
        status: 'today', // New tasks from voice should be priority
        description: null,
      });

      // Create steps if provided
      const steps = [];
      if (parsedAction.steps) {
        for (const stepTitle of parsedAction.steps) {
          const step = await storage.createStep({
            id: randomUUID(),
            taskId: task.id,
            title: stepTitle,
            description: null,
            context: task.context,
            timeWindow: task.timeWindow,
          });
          steps.push(step);
        }
      }

      res.json({ 
        success: true, 
        task,
        steps,
        message: `Created task "${task.title}" with ${steps.length} steps`
      });
    } catch (error) {
      console.error('Add task action error:', error);
      res.status(400).json({ 
        error: "Invalid add_task payload",
        hint: "Expected: { title: string, context?: 'computer'|'phone'|'physical', timeWindow?: 'morning'|'midday'|'evening'|'any', steps?: string[] }"
      });
    }
  });

  // update_step_status{ step_id, status }
  app.post("/api/actions/update_step_status", async (req, res) => {
    try {
      const parsedAction = updateStepStatusActionSchema.parse(req.body);
      
      const step = await storage.updateStep(parsedAction.stepId, {
        status: parsedAction.status
      });

      res.json({ 
        success: true, 
        step,
        message: `Updated step status to "${parsedAction.status}"`
      });
    } catch (error) {
      console.error('Update step status action error:', error);
      res.status(400).json({ 
        error: "Invalid update_step_status payload or step not found",
        hint: "Expected: { stepId: string, status: 'pending'|'running'|'blocked'|'done' }"
      });
    }
  });

  // get_todo_list{ context?, view? }
  app.post("/api/actions/get_todo_list", async (req, res) => {
    try {
      const { sessionId, ...actionData } = req.body;
      const parsedAction = getTodoListActionSchema.parse(actionData);
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId required" });
      }

      // Get tasks with filtering
      const tasks = await storage.listTasks(sessionId, parsedAction);
      
      let result: any = { tasks };

      // If view is steps, substeps, or tasks, include step details
      if (parsedAction.view === 'steps' || parsedAction.view === 'substeps' || parsedAction.view === 'tasks') {
        const tasksWithSteps = await Promise.all(tasks.map(async (task) => {
          const steps = await storage.listSteps(task.id);
          return { ...task, steps };
        }));
        result = { tasks: tasksWithSteps };
      }

      res.json({
        success: true,
        ...result,
        context: parsedAction.context || 'all',
        view: parsedAction.view || 'items'
      });
    } catch (error) {
      console.error('Get todo list action error:', error);
      res.status(400).json({ 
        error: "Invalid get_todo_list payload",
        hint: "Expected: { context?: 'computer'|'phone'|'physical', view?: 'items'|'steps'|'substeps' }"
      });
    }
  });

  // kb_attach_doc{ agent_id, url|file }
  app.post("/api/actions/kb_attach_doc", async (req, res) => {
    try {
      const parsedAction = kbAttachDocActionSchema.parse(req.body);
      
      // For now, simulate KB attachment - would integrate with ElevenLabs KB API
      const attachment = {
        id: randomUUID(),
        agentId: parsedAction.agentId,
        type: parsedAction.url ? 'url' : 'file',
        content: parsedAction.url || parsedAction.file,
        timestamp: new Date()
      };

      res.json({ 
        success: true, 
        attachment,
        message: `Attached ${attachment.type} to agent KB: ${attachment.content}`
      });
    } catch (error) {
      console.error('KB attach doc action error:', error);
      res.status(400).json({ 
        error: "Invalid kb_attach_doc payload",
        hint: "Expected: { agentId: string, url?: string, file?: string }"
      });
    }
  });

  // post_ops_update{ message, deltas[] }
  app.post("/api/actions/post_ops_update", async (req, res) => {
    try {
      const parsedAction = postOpsUpdateActionSchema.parse(req.body);
      
      // Log the ops update
      console.log('Ops Update:', parsedAction.message);
      console.log('Deltas:', parsedAction.deltas);

      res.json({ 
        success: true, 
        message: "Ops update received",
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Post ops update action error:', error);
      res.status(400).json({ 
        error: "Invalid post_ops_update payload",
        hint: "Expected: { message: string, deltas: Array<{type: string, id: string, change: object}> }"
      });
    }
  });
}

// GPT-5 Ops Manager with Toolbelt
export class OpsManager {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  // Toolbelt implementation
  async webSearch(query: string) {
    // Would integrate with web search API
    return { query, results: [], message: "Web search functionality to be implemented" };
  }

  async webFetch(url: string) {
    // Would integrate with web fetch functionality
    return { url, content: "", message: "Web fetch functionality to be implemented" };
  }

  async generateQR(content: string) {
    // Would integrate with QR generation
    return { 
      content, 
      qrUrl: `/qr/${randomUUID()}.png`,
      message: "QR generation functionality to be implemented" 
    };
  }

  async scaffoldPage(title: string, embedSlot?: string) {
    // Would create landing pages with embed slots
    return { 
      title, 
      pageUrl: `/pages/${randomUUID()}`,
      embedSlot,
      message: "Page scaffolding functionality to be implemented" 
    };
  }

  async saveMemory(domain: string, key: string, value: any) {
    return await storage.setMemory({
      sessionId: this.sessionId,
      domain,
      key,
      value
    });
  }

  async getMemory(domain: string, key: string) {
    return await storage.getMemory(this.sessionId, domain, key);
  }

  async processIntent(intent: string, context?: { isVoiceMessage?: boolean }) {
    try {
      // First, determine if this message actually needs task creation
      const shouldCreateTask = await openai.chat.completions.create({
        model: "gpt-5-2025-08-07",
        messages: [
          {
            role: "system", 
            content: `Analyze if this message requires creating NEW tasks. Be very strict.

ONLY return true for:
- Clear work requests: "Create a website", "Research X", "Call Y", "Set up Z"
- Project requests: "Build an app", "Organize my office", "Plan vacation"
- Multi-step goals: "Start a business", "Learn programming"

NEVER return true for:
- Greetings: "Hello", "Hi", "Hey"
- Questions: "What's up?", "How are you?", "What can you do?"
- Thanks/acknowledgments: "Thanks", "OK", "Got it"
- Task management: "Delete that task", "Mark as done", "Edit my task"
- Casual chat: Any conversational message without specific work

Respond ONLY with JSON: {"shouldCreateTask": boolean}`
          },
          {
            role: "user",
            content: intent
          }
        ],
        response_format: { type: "json_object" }
      });

      const taskDecision = JSON.parse(shouldCreateTask.choices[0].message.content || '{"shouldCreateTask": false}');
      
      if (!taskDecision.shouldCreateTask) {
        console.log(`[GPT-5] No task creation needed for: "${intent.slice(0, 50)}..."`);
        return { tasks: [], processed: false, conversational: true };
      }

      // Now use GPT-5 to parse intent and create tasks/steps
      const response = await openai.chat.completions.create({
        model: "gpt-5-2025-08-07",
        messages: [
          {
            role: "system",
            content: `You are Colby, the digital operations manager. Convert this actionable user request into well-structured tasks and steps.

Context: ${JSON.stringify(context || {})}

Create tasks with clear, actionable titles. Each step should be:
- Specific and measurable
- Labeled with context: computer/phone/physical
- Labeled with timeWindow: morning/midday/evening/any
- Marked canAuto: true if it can be automated with tools

Focus on breaking down complex requests into manageable steps. Use your knowledge to suggest logical workflows.

Respond in JSON format: { "tasks": [{ "title": string, "context": string, "timeWindow": string, "steps": [{ "title": string, "canAuto": boolean, "toolHint": string }] }] }`
          },
          {
            role: "user",
            content: intent
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"tasks": []}');
      
      // Create tasks and steps in storage
      const createdTasks = [];
      for (const taskData of result.tasks) {
        const task = await storage.createTask({
          id: randomUUID(),
          sessionId: this.sessionId,
          title: taskData.title,
          context: taskData.context || 'computer',
          timeWindow: taskData.timeWindow || 'any',
          status: 'today',
          description: null,
        });

        const steps = [];
        for (const stepData of taskData.steps || []) {
          const step = await storage.createStep({
            id: randomUUID(),
            taskId: task.id,
            title: stepData.title,
            canAuto: stepData.canAuto || false,
            toolHint: stepData.toolHint || null,
            context: stepData.context || task.context,
            timeWindow: stepData.timeWindow || task.timeWindow,
            description: null,
          });
          steps.push(step);
        }

        createdTasks.push({ ...task, steps });
      }

      return { tasks: createdTasks, processed: true };
    } catch (error) {
      console.error('Intent processing error:', error);
      return { tasks: [], processed: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
}