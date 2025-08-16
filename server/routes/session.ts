import { Router, Request, Response } from "express";
import { newSessionId, sign, saveSession, validate } from "../session";

const sessionRouter = Router();

// POST /api/session/init
// Returns {sessionId, sig}; sets HttpOnly cookies
sessionRouter.post("/init", (req: Request, res: Response) => {
  try {
    const id = newSessionId();
    const sig = sign(id);
    saveSession(id);

    // Set HttpOnly cookies for security
    res.setHeader("Set-Cookie", [
      `ei_session=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`, // 7 days
      `ei_sig=${sig}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}` // 7 days
    ]);

    res.status(200).json({ sessionId: id, sig });
  } catch (error) {
    console.error("[Session] Failed to create session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// GET /api/session/validate
// Validates current session from cookies
sessionRouter.get("/validate", (req: Request, res: Response) => {
  const cookies = Object.fromEntries(
    (req.headers.cookie || "").split(";")
      .map(s => s.trim().split("="))
      .filter(x => x.length === 2)
  );
  
  const id = cookies["ei_session"];
  const sig = cookies["ei_sig"];
  
  if (!id || !sig) {
    return res.status(401).json({ valid: false, error: "No session cookies found" });
  }

  // validate function imported at top
  if (validate(id, sig)) {
    res.json({ valid: true, sessionId: id });
  } else {
    res.status(401).json({ valid: false, error: "Invalid session signature" });
  }
});

export default sessionRouter;