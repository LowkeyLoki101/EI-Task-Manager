import { Router, Request, Response } from "express";
import { getCircuitStatus } from "../ai-guard";
import { getN8NStatus } from "../n8n-health";

const statusRouter = Router();

// System status endpoint - returns health of all services
statusRouter.get("/", async (req: Request, res: Response) => {
  try {
    const aiStatus = getCircuitStatus();
    const n8nConnected = await getN8NStatus();
    
    // Determine AI status
    let ai: "ok" | "cooldown" | "blocked" = "ok";
    if (aiStatus.inCooldown) ai = "cooldown";
    else if (!aiStatus.open) ai = "blocked";
    
    // Basic KB health check
    let kb: "ok" | "error" = "ok";
    try {
      // Simple file system check
      const fs = await import("fs");
      const kbPath = "./data/knowledge-base";
      if (!fs.existsSync(kbPath)) {
        fs.mkdirSync(kbPath, { recursive: true });
      }
    } catch (e) {
      kb = "error";
    }
    
    res.json({
      ai,
      n8n: n8nConnected,
      kb,
      details: {
        ai: aiStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("[Status] Error:", error);
    res.status(500).json({
      error: "status_check_failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default statusRouter;