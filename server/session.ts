import crypto from "crypto";
import fs from "fs";
import path from "path";

const SESS_DIR = path.join(process.cwd(), "data", "sessions");
fs.mkdirSync(SESS_DIR, { recursive: true });

export function newSessionId() {
  return "ei_" + crypto.randomBytes(12).toString("hex");
}

export function sign(id: string) {
  const secret = process.env.SESSION_HMAC_SECRET || "dev-secret";
  return crypto.createHmac("sha256", secret).update(id).digest("base64url");
}

export function saveSession(id: string) {
  const p = path.join(SESS_DIR, id + ".json");
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify({ 
      id, 
      createdAt: Date.now(),
      lastActivity: Date.now()
    }));
  }
}

export function validate(id?: string, sig?: string) {
  if (!id || !sig) return false;
  return sign(id) === sig;
}

export function touchSession(id: string) {
  const p = path.join(SESS_DIR, id + ".json");
  if (fs.existsSync(p)) {
    try {
      const session = JSON.parse(fs.readFileSync(p, 'utf8'));
      session.lastActivity = Date.now();
      fs.writeFileSync(p, JSON.stringify(session));
    } catch (error) {
      console.warn(`[Session] Failed to touch session ${id}:`, error);
    }
  }
}

// Session gate middleware
export function sessionGate(req: any, res: any, next: any) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || "").split(";")
      .map(s => s.trim().split("="))
      .filter(x => x.length === 2)
  );
  
  const id = cookies["ei_session"];
  const sig = cookies["ei_sig"];
  
  if (!validate(id, sig)) {
    return res.status(401).json({ error: "Invalid or missing session" });
  }
  
  req.sessionId = id;
  touchSession(id);
  next();
}