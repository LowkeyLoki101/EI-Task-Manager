// server/transcripts-helper.ts
import fs from "fs";
import path from "path";

export function appendTranscript(sessionId: string, line: any) {
  try {
    const dir = path.join(process.cwd(), "data", "sessions", sessionId);
    fs.mkdirSync(dir, { recursive: true });
    
    const logPath = path.join(dir, "transcripts.jsonl");
    const entry = {
      ...line,
      timestamp: line.timestamp || Date.now(),
      sessionId
    };
    
    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    console.log(`[Transcripts] Appended to ${sessionId}: ${line.type || 'unknown'}`);
  } catch (error) {
    console.error(`[Transcripts] Failed to append for ${sessionId}:`, error);
  }
}

export function readTranscripts(sessionId: string): any[] {
  try {
    const logPath = path.join(process.cwd(), "data", "sessions", sessionId, "transcripts.jsonl");
    
    if (!fs.existsSync(logPath)) {
      return [];
    }
    
    const content = fs.readFileSync(logPath, 'utf8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.warn(`[Transcripts] Invalid JSON line: ${line}`);
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    console.error(`[Transcripts] Failed to read for ${sessionId}:`, error);
    return [];
  }
}