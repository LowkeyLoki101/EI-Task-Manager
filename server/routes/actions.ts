import { Router, Request, Response } from "express";
import { sessionGate } from "../session";
import { storage } from "../storage";

const actionsRouter = Router();

// Apply session gate to most action routes, but exclude ElevenLabs webhook endpoints
// ElevenLabs webhooks should bypass authentication
const bypassSessionPaths = [
  '/create_knowledge_entry',
  '/convert_task_to_knowledge',
  '/add_task',
  '/update_step_status', 
  '/get_todo_list',
  '/test',
  '/conversation'
];

actionsRouter.use((req, res, next) => {
  // Skip session validation for ElevenLabs webhook endpoints
  if (bypassSessionPaths.includes(req.path)) {
    console.log(`[Actions] Bypassing session gate for ElevenLabs webhook: ${req.path}`);
    return next();
  }
  
  // Apply session gate to all other routes
  return sessionGate(req, res, next);
});

// Unified actions endpoint - fan out by action type
actionsRouter.post("/run", async (req: Request, res: Response) => {
  try {
    const { action, payload } = req.body;
    const sessionId = (req as any).sessionId;

    console.log(`[Actions] Running action: ${action} for session: ${sessionId}`);

    switch (action) {
      case "add_task":
        const task = await storage.createTask({
          ...payload,
          sessionId
        });
        res.json({ success: true, result: task });
        break;

      case "update_task":
        if (!payload.id) {
          return res.status(400).json({ error: "Task ID required" });
        }
        const updatedTask = await storage.updateTask(payload.id, payload.updates);
        res.json({ success: true, result: updatedTask });
        break;

      case "kb_upload":
        // Placeholder for knowledge base upload
        res.json({ 
          success: true, 
          result: { message: "KB upload not implemented yet" } 
        });
        break;

      case "get_tasks":
        const tasks = await storage.listTasks(sessionId, payload?.filters);
        res.json({ success: true, result: tasks });
        break;

      case "create_step":
        const step = await storage.createStep({
          ...payload,
          sessionId
        });
        res.json({ success: true, result: step });
        break;

      case "update_step_status":
        if (!payload.id || !payload.status) {
          return res.status(400).json({ error: "Step ID and status required" });
        }
        const updatedStep = await storage.updateStep(payload.id, { 
          status: payload.status 
        });
        res.json({ success: true, result: updatedStep });
        break;

      default:
        res.status(400).json({ 
          error: `Unknown action: ${action}`,
          supportedActions: [
            "add_task", "update_task", "get_tasks", 
            "create_step", "update_step_status", "kb_upload"
          ]
        });
    }
  } catch (error) {
    console.error("[Actions] Error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export const telemetryRouter = Router();

// Telemetry endpoint for widget failures (no auth required)
telemetryRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { kind, detail, timestamp, userAgent, sessionId } = req.body;

    // Log to file for analysis
    const logData = {
      sessionId,
      kind,
      detail,
      timestamp,
      userAgent,
      loggedAt: new Date().toISOString()
    };

    // For now, just console log - in production you'd write to a log file
    console.log(`[Telemetry] ${kind}:`, logData);
    
    res.json({ success: true, logged: true });
  } catch (error) {
    console.error("[Telemetry] Error:", error);
    res.status(500).json({ error: "Failed to log telemetry" });
  }
});

export default actionsRouter;