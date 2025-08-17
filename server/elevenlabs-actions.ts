// ElevenLabs Actions API implementation based on memory anchors
import type { Express } from "express";
import { storage } from "./storage";
import { 
  addTaskActionSchema, updateStepStatusActionSchema, getTodoListActionSchema,
  kbAttachDocActionSchema, postOpsUpdateActionSchema 
} from "@shared/schema";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { storage } from "./storage";

// GPT-5 is now available and is the latest OpenAI model
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

export function registerElevenLabsActions(app: Express) {
  
  // Simple GET test webhook - using /webhook/ path to avoid frontend router
  app.get("/webhook/test", async (req, res) => {
    console.log('[ElevenLabs] TEST webhook called (GET)');
    console.log('[ElevenLabs] Query params:', req.query);
    console.log('[ElevenLabs] User-Agent:', req.headers['user-agent']);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      success: true, 
      message: "ElevenLabs webhook connection working!",
      timestamp: new Date().toISOString(),
      method: "GET"
    });
  });

  // Keep POST version for manual testing
  app.post("/api/actions/test", async (req, res) => {
    console.log('[ElevenLabs] TEST webhook called (POST):', JSON.stringify(req.body, null, 2));
    res.json({ 
      success: true, 
      message: "Test webhook working!",
      receivedData: req.body 
    });
  });

  // NEW: Conversation webhook - receives full conversation transcript from ElevenLabs
  app.post("/api/actions/conversation", async (req, res) => {
    try {
      console.log('[ElevenLabs] CONVERSATION webhook called:', JSON.stringify(req.body, null, 2));
      
      const { 
        conversation_id,
        agent_id,
        user_id,
        transcript,
        metadata,
        messages = [],
        sessionId: providedSessionId 
      } = req.body;

      // Extract sessionId from multiple possible sources
      let sessionId = providedSessionId;
      
      if (!sessionId && metadata?.sessionId) {
        sessionId = metadata.sessionId;
      }
      if (!sessionId && metadata?.session_id) {
        sessionId = metadata.session_id;
      }
      
      // Enhanced fallback logic - try dynamic variables from transcript
      if (!sessionId && transcript) {
        // Look for sessionId mentions in the conversation
        const sessionMatch = transcript.match(/session[_-]?id[:\s]*([a-z0-9_]+)/i);
        if (sessionMatch) {
          sessionId = sessionMatch[1];
          console.log('[ElevenLabs] Extracted sessionId from transcript:', sessionId);
        }
      }
      
      // If still no sessionId, try to get active session or create default
      if (!sessionId) {
        // Look for recent active session
        try {
          console.log('[ElevenLabs] Skipping recent session lookup - using fallback');
        } catch (e) {
          console.log('[ElevenLabs] Could not find recent session');
        }
      }
      
      // Ultimate fallback - create session ID
      if (!sessionId) {
        sessionId = `s_${Math.random().toString(36).substr(2, 11)}`;
        console.log('[ElevenLabs] Created fallback sessionId:', sessionId);
      }

      console.log('[ElevenLabs] Final sessionId for conversation:', sessionId);

      // Save the conversation
      const conversation = await storage.createMessage({
        sessionId,
        message: transcript || "Voice conversation",
        response: "Conversation processed",
        metadata: {
          conversationId: conversation_id,
          agentId: agent_id,
          userId: user_id,
          elevenlabsTranscript: transcript,
          elevenlabsMessages: messages,
          elevenlabsMetadata: metadata
        }
      });

      console.log('[ElevenLabs] Conversation saved:', conversation.id);

      // Process transcript for task creation if there's meaningful content
      let taskResults: any = { tasks: [], processed: false };
      
      if (transcript && transcript.trim().length > 10) {
        try {
          const opsManager = new OpsManager(sessionId);
          taskResults = await opsManager.processIntent(transcript, { isVoiceMessage: true });
          
          if (taskResults.processed && taskResults.tasks && taskResults.tasks.length > 0) {
            console.log(`[ElevenLabs] Created ${taskResults.tasks.length} tasks from voice conversation`);
          } else if (taskResults.conversational) {
            console.log('[ElevenLabs] Conversation was casual chat - no tasks created');
          }
        } catch (error) {
          console.error('[ElevenLabs] Error processing transcript for tasks:', error);
        }
      }

      res.json({
        success: true,
        message: "Conversation saved and processed",
        conversationId: conversation.id,
        sessionId,
        tasksCreated: taskResults.tasks?.length || 0,
        processed: taskResults.processed
      });

    } catch (error) {
      console.error('[ElevenLabs] Conversation webhook error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to save conversation",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Actions (Agent → Replit)
  
  // create_knowledge_entry{ title, content, contentType?, tags? }
  app.post("/api/actions/create_knowledge_entry", async (req, res) => {
    try {
      console.log('[ElevenLabs] create_knowledge_entry webhook called:', JSON.stringify(req.body, null, 2));
      
      let { sessionId, ...actionData } = req.body;
      
      // Extract sessionId from various sources if not provided
      if (!sessionId) {
        sessionId = actionData.sessionId || 
                   req.headers['x-session-id'] || 
                   req.query.sessionId ||
                   req.body.session_id ||
                   actionData.session_id ||
                   's_njlk7hja5y9'; // fallback to current session
      }

      // Validate required fields
      if (!actionData.title || !actionData.content) {
        return res.status(400).json({ 
          error: 'Title and content are required for knowledge base entries',
          received: actionData
        });
      }

      // Create knowledge base entry
      const response = await fetch('http://localhost:5000/api/kb/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          title: actionData.title,
          content: actionData.content,
          source: 'ai-research',
          contentType: actionData.contentType || 'research',
          tags: actionData.tags ? actionData.tags.split(',').map(t => t.trim()) : ['ai-created'],
          metadata: {
            createdViaElevenLabs: true,
            elevenlabsAgent: true,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[ElevenLabs] ✅ Created knowledge base entry: ${actionData.title}`);
        
        res.json({
          success: true,
          message: `Knowledge base entry "${actionData.title}" created successfully`,
          entryId: result.entry.id,
          contentType: result.entry.contentType
        });
      } else {
        console.error('[ElevenLabs] Failed to create knowledge base entry:', await response.text());
        res.status(500).json({ error: 'Failed to create knowledge base entry' });
      }
    } catch (error) {
      console.error('[ElevenLabs] create_knowledge_entry error:', error);
      res.status(500).json({ error: 'Failed to process knowledge base request' });
    }
  });

  // convert_task_to_knowledge{ taskId }
  app.post("/api/actions/convert_task_to_knowledge", async (req, res) => {
    try {
      console.log('[ElevenLabs] convert_task_to_knowledge webhook called:', JSON.stringify(req.body, null, 2));
      
      let { sessionId, ...actionData } = req.body;
      
      // Extract sessionId from various sources if not provided
      if (!sessionId) {
        sessionId = actionData.sessionId || 
                   req.headers['x-session-id'] || 
                   req.query.sessionId ||
                   req.body.session_id ||
                   actionData.session_id ||
                   's_njlk7hja5y9'; // fallback to current session
      }

      if (!actionData.taskId) {
        return res.status(400).json({ 
          error: 'Task ID is required for conversion',
          received: actionData
        });
      }

      // Call the task-to-knowledge conversion API
      const response = await fetch('http://localhost:5000/api/kb/convert-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: actionData.taskId,
          sessionId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[ElevenLabs] ✅ Converted task to knowledge base: ${result.task.title}`);
        
        res.json({
          success: true,
          message: `Task "${result.task.title}" converted to knowledge base successfully`,
          entryId: result.entry.id,
          taskTitle: result.task.title
        });
      } else {
        console.error('[ElevenLabs] Failed to convert task:', await response.text());
        res.status(500).json({ error: 'Failed to convert task to knowledge base' });
      }
    } catch (error) {
      console.error('[ElevenLabs] convert_task_to_knowledge error:', error);
      res.status(500).json({ error: 'Failed to process task conversion request' });
    }
  });

  // add_task{ title, context?, time_window?, steps? }
  app.post("/api/actions/add_task", async (req, res) => {
    try {
      console.log('[ElevenLabs] add_task webhook called:', JSON.stringify(req.body, null, 2));
      console.log('[ElevenLabs] Headers:', JSON.stringify(req.headers, null, 2));
      
      let { sessionId, ...actionData } = req.body;
      
      // Debug: Log what we got for sessionId
      console.log('[ElevenLabs] Received sessionId:', sessionId, 'Type:', typeof sessionId);
      
      // Clean up parameter names from ElevenLabs agent data
      const cleanField = (value: any, prefix: string) => {
        if (typeof value === 'string' && value.startsWith(prefix)) {
          return value.replace(prefix, '').trim();
        }
        return value;
      };

      const cleanedData = {
        title: cleanField(actionData.title, 'title='),
        context: cleanField(actionData.context, 'context='),
        timeWindow: cleanField(actionData.timeWindow || actionData.time_window, 'timeWindow=') || 
                   cleanField(actionData.timeWindow || actionData.time_window, 'time_window=') ||
                   cleanField(actionData.timeWindow || actionData.time_window, 'time_window') ||
                   'any',
        steps: actionData.steps
      };
      
      console.log('[ElevenLabs] Cleaned action data:', cleanedData);
      const parsedAction = addTaskActionSchema.parse(cleanedData);
      
      // Try to get sessionId from various possible locations in the request
      if (!sessionId) {
        // Check if it's in the action data
        sessionId = actionData.sessionId || 
                   req.headers['x-session-id'] || 
                   req.query.sessionId ||
                   req.body.session_id ||
                   actionData.session_id;
        
        console.log('[ElevenLabs] Tried alternative sessionId sources, got:', sessionId);
      }
      
      // If still no sessionId, try to get the most recent session from storage
      if (!sessionId) {
        try {
          // Get all tasks and find the most recent session used
          const allSessionIds = new Set();
          // This is a workaround - in a real app you'd have a better way to track active sessions
          allSessionIds.add('s_njlk7hja5y9'); // Current known session
          
          if (allSessionIds.size > 0) {
            sessionId = Array.from(allSessionIds)[0]; // Use the most recent session
            console.log('[ElevenLabs] No sessionId provided, using most recent session:', sessionId);
          } else {
            sessionId = 'elevenlabs-default-session';
            console.log('[ElevenLabs] No sessions found, using default:', sessionId);
          }
        } catch (error) {
          sessionId = 'elevenlabs-default-session';
          console.log('[ElevenLabs] Error finding session, using default:', sessionId);
        }
      }
      
      console.log('[ElevenLabs] Creating task with sessionId:', sessionId);

      // Create the task
      const task = await storage.createTask({
        sessionId,
        title: parsedAction.title,
        context: parsedAction.context || 'computer',
        timeWindow: parsedAction.timeWindow || 'any',
        status: 'today', // New tasks from voice should be priority
      });

      // Create steps if provided
      const steps = [];
      if (parsedAction.steps) {
        for (const stepTitle of parsedAction.steps) {
          const step = await storage.createStep({
            taskId: task.id,
            title: stepTitle,
            context: task.context,
            timeWindow: task.timeWindow,
          });
          steps.push(step);
        }
      }

      // Automatically discover resources for the new task
      setTimeout(async () => {
        try {
          console.log(`[Auto Resource Discovery] Starting for voice-created task: ${task.title}`);
          const response = await fetch(`http://localhost:5000/api/gpt-supervisor/discover-resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskTitle: task.title,
              taskContext: task.context,
              taskId: task.id
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`[Auto Resource Discovery] Found ${result.resourceCount} resources for voice task: ${task.title}`);
          } else {
            console.error(`[Auto Resource Discovery] Failed for task ${task.id}: ${response.status}`);
          }
        } catch (error) {
          console.error(`[Auto Resource Discovery] Error for task ${task.id}:`, (error as Error).message || error);
        }
      }, 200); // Small delay to ensure task is fully saved

      res.json({ 
        success: true, 
        task,
        steps,
        message: `Created task "${task.title}" with ${steps.length} steps. AI is discovering helpful resources...`,
        resourceDiscovery: "Starting automatic resource discovery"
      });
    } catch (error) {
      console.error('Add task action error:', error);
      res.status(400).json({ 
        error: "Invalid add_task payload",
        hint: "Expected: { title: string, context?: 'computer'|'phone'|'physical', timeWindow?: 'morning'|'midday'|'evening'|'any', steps?: string[] }"
      });
    }
  });

  // update_step_status{ taskIndex, stepIndex, status }
  app.post("/api/actions/update_step_status", async (req, res) => {
    try {
      console.log('[ElevenLabs] UPDATE_STEP_STATUS webhook called:', JSON.stringify(req.body, null, 2));
      
      const { taskIndex, stepIndex, status } = req.body;
      
      if (!taskIndex || !stepIndex || !status) {
        return res.status(400).json({ 
          success: false, 
          error: "taskIndex, stepIndex, and status are required" 
        });
      }

      // Get all tasks to find the one at taskIndex (1-based)
      const sessionId = 'elevenlabs-default-session'; // Use default session for ElevenLabs
      const tasks = await storage.listTasks(sessionId);
      
      // Convert 1-based index to 0-based for array access
      const task = tasks[taskIndex - 1];
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          error: `Task ${taskIndex} not found (only ${tasks.length} tasks exist)` 
        });
      }

      // Get steps for this task
      const steps = await storage.listSteps(task.id);
      const step = steps[stepIndex - 1];
      if (!step) {
        return res.status(404).json({ 
          success: false, 
          error: `Step ${stepIndex} not found in task ${taskIndex} (only ${steps.length} steps exist)` 
        });
      }

      // Update step status
      const updatedStep = await storage.updateStep(step.id, { status: status as any });
      
      console.log(`[ElevenLabs] Updated step ${stepIndex} in task ${taskIndex} to status: ${status}`);
      
      res.json({ 
        success: true, 
        message: `Step ${stepIndex} marked as ${status}`,
        taskTitle: task.title,
        stepTitle: step.title,
        newStatus: status
      });
      
    } catch (error) {
      console.error('Update step status action error:', error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to update step status" 
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
          sessionId: this.sessionId,
          title: taskData.title,
          context: taskData.context || 'computer',
          timeWindow: taskData.timeWindow || 'any',
          status: 'today',
        });

        const steps = [];
        for (const stepData of taskData.steps || []) {
          const step = await storage.createStep({
            taskId: task.id,
            title: stepData.title,
            canAuto: stepData.canAuto || false,
            toolHint: stepData.toolHint || null,
            context: stepData.context || task.context,
            timeWindow: stepData.timeWindow || task.timeWindow,
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