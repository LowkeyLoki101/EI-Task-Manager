import { Router } from "express";
import { aiWorker } from "../workers/aiWorker";

export function aiQueueRoutes() {
  const router = Router();

  // Enqueue AI job
  router.post("/enqueue", async (req, res) => {
    try {
      const { type, payload, priority } = req.body;
      
      if (!type || !payload) {
        return res.status(400).json({ error: "type and payload required" });
      }

      const jobId = await aiWorker.enqueueJob(type, payload, priority);
      
      res.json({ 
        success: true, 
        jobId,
        message: "Job queued for AI processing" 
      });
    } catch (error: any) {
      console.error('[AI Queue] Enqueue error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get queue status
  router.get("/status", async (req, res) => {
    try {
      const workerStatus = aiWorker.getStatus();
      const queueStats = await aiWorker.getQueueStats();
      
      res.json({
        worker: workerStatus,
        queue: queueStats,
        healthy: workerStatus.isRunning && workerStatus.breaker.state !== 'open'
      });
    } catch (error: any) {
      console.error('[AI Queue] Status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check endpoint
  router.get("/health", async (req, res) => {
    try {
      const status = aiWorker.getStatus();
      const stats = await aiWorker.getQueueStats();
      
      res.json({
        healthy: status.isRunning,
        worker: status,
        queue: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        healthy: false, 
        error: error.message 
      });
    }
  });

  return router;
}