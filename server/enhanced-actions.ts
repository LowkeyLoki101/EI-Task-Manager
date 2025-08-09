// Enhanced ElevenLabs Actions with SDK integration and file operations
import type { Express } from "express";
import { storage } from "./storage";
import type { SelectTask, SelectStep } from "@shared/schema";
import { voiceService } from "./elevenlabs-sdk";
import { fileOperationsService } from "./file-operations";
import { z } from "zod";
import { randomUUID } from "crypto";
import path from "path";

// Enhanced action schemas for file operations
export const createFileReportActionSchema = z.object({
  sessionId: z.string(),
  type: z.enum(['tasks', 'steps']),
  format: z.enum(['excel', 'csv']),
  filters: z.object({
    status: z.string().optional(),
    context: z.string().optional(),
    timeWindow: z.string().optional()
  }).optional()
});

export const importTasksActionSchema = z.object({
  sessionId: z.string(),
  filePath: z.string()
});

export const voiceSynthesisActionSchema = z.object({
  text: z.string(),
  voiceId: z.string().optional()
});

export const taskSummaryActionSchema = z.object({
  sessionId: z.string(),
  includeAudio: z.boolean().default(true)
});

export function registerEnhancedActions(app: Express) {
  
  // Voice synthesis endpoint - Generate TTS for system responses
  app.post("/api/actions/synthesize_voice", async (req, res) => {
    try {
      const { text, voiceId } = voiceSynthesisActionSchema.parse(req.body);
      
      const audioBuffer = await voiceService.synthesizeVoice(text, voiceId);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString()
      });
      
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error('Voice synthesis error:', error);
      res.status(400).json({ 
        error: "Voice synthesis failed",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get voice capabilities and settings
  app.get("/api/actions/voice_capabilities", async (req, res) => {
    try {
      const capabilities = await voiceService.getVoiceCapabilities();
      res.json({
        success: true,
        ...capabilities
      });
    } catch (error) {
      console.error('Voice capabilities error:', error);
      res.status(500).json({
        error: "Failed to get voice capabilities",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create file report (Excel/CSV export of tasks or steps)
  app.post("/api/actions/create_file_report", async (req, res) => {
    try {
      const { sessionId, type, format, filters } = createFileReportActionSchema.parse(req.body);
      
      let result;
      
      if (type === 'tasks') {
        const tasks = await storage.listTasks(sessionId, {
          context: filters?.context as any,
          view: 'items'
        });
        result = await fileOperationsService.createTaskReport(tasks, format);
      } else {
        // Get all tasks first, then all their steps
        const tasks = await storage.listTasks(sessionId, {
          context: filters?.context as any,
          view: 'items'
        });
        const allSteps = [];
        for (const task of tasks) {
          const steps = await storage.listSteps(task.id);
          allSteps.push(...steps);
        }
        result = await fileOperationsService.createStepsReport(allSteps, format);
      }

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          filePath: result.filePath,
          downloadUrl: `/api/files/download/${path.basename(result.filePath!)}`
        });

        // Send audio response if available
        if (result.audioResponse) {
          // Could stream audio response here if needed
        }
      } else {
        res.status(500).json({
          error: result.message,
          success: false
        });
      }
    } catch (error) {
      console.error('Create file report error:', error);
      res.status(400).json({
        error: "Failed to create file report",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Import tasks from Excel/CSV file
  app.post("/api/actions/import_tasks", async (req, res) => {
    try {
      const { sessionId, filePath } = importTasksActionSchema.parse(req.body);
      
      const result = await fileOperationsService.importTasksFromFile(filePath);
      
      if (result.success && result.data) {
        // Save imported tasks to storage
        const savedTasks = [];
        for (const taskData of result.data) {
          const task = await storage.createTask({
            ...taskData,
            sessionId
          });
          savedTasks.push(task);
        }

        res.json({
          success: true,
          message: result.message,
          tasks: savedTasks,
          importedCount: savedTasks.length
        });

        // Send audio response if available
        if (result.audioResponse) {
          // Could stream audio response here if needed
        }
      } else {
        res.status(500).json({
          error: result.message,
          success: false
        });
      }
    } catch (error) {
      console.error('Import tasks error:', error);
      res.status(400).json({
        error: "Failed to import tasks",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generate voice task summary
  app.post("/api/actions/task_summary", async (req, res) => {
    try {
      const { sessionId, includeAudio } = taskSummaryActionSchema.parse(req.body);
      
      const tasks = await storage.listTasks(sessionId, { view: 'items' });
      const completedTasks = tasks.filter(t => t.status === 'done');
      const pendingTasks = tasks.filter(t => t.status !== 'done');

      const summary = {
        total: tasks.length,
        completed: completedTasks.length,
        pending: pendingTasks.length,
        byContext: {
          computer: tasks.filter(t => t.context === 'computer').length,
          phone: tasks.filter(t => t.context === 'phone').length,
          physical: tasks.filter(t => t.context === 'physical').length
        },
        byStatus: {
          backlog: tasks.filter(t => t.status === 'backlog').length,
          today: tasks.filter(t => t.status === 'today').length,
          doing: tasks.filter(t => t.status === 'doing').length,
          done: tasks.filter(t => t.status === 'done').length
        }
      };

      let audioResponse;
      if (includeAudio) {
        audioResponse = await voiceService.generateTaskSummary(tasks);
      }

      res.json({
        success: true,
        summary,
        hasAudio: !!audioResponse
      });

      // Send audio response if generated
      if (audioResponse) {
        // Could stream audio response here if needed
      }
    } catch (error) {
      console.error('Task summary error:', error);
      res.status(400).json({
        error: "Failed to generate task summary",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced task update with voice feedback
  app.post("/api/actions/update_task_with_voice", async (req, res) => {
    try {
      const { taskId, updates } = req.body;
      
      const task = await storage.updateTask(taskId, updates);
      
      // Generate voice notification
      const action = updates.status ? `marked as ${updates.status}` : 'updated';
      const audioResponse = await voiceService.generateTaskNotification(task.title, action);
      
      res.json({
        success: true,
        task,
        message: `Task "${task.title}" ${action}`,
        hasAudio: true
      });

      // Send audio response if generated
      if (audioResponse) {
        // Could stream audio response here if needed
      }
    } catch (error) {
      console.error('Update task with voice error:', error);
      res.status(400).json({
        error: "Failed to update task",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // File download endpoint for generated reports
  app.get("/api/files/download/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join('uploads', filename);
      
      if (!filename.match(/^[a-zA-Z0-9\-_.]+$/)) {
        return res.status(400).json({ error: "Invalid filename" });
      }

      res.download(filePath, (err) => {
        if (err) {
          console.error('File download error:', err);
          res.status(404).json({ error: "File not found" });
        }
      });
    } catch (error) {
      console.error('Download endpoint error:', error);
      res.status(500).json({ error: "Download failed" });
    }
  });
}