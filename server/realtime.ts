import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Creates a short-lived client token for the browser to start a Realtime session
router.post("/api/realtime/session", async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview", // swap to latest realtime model as needed
        voice: "verse",                    // pick a preset voice
        modalities: ["audio", "text"],
        // Optionally pass system prompt or tool config here later
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("OpenAI Realtime session creation failed:", text);
      return res.status(500).json({ error: "session_create_failed", detail: text });
    }

    const data = await r.json(); // contains client_secret for browser
    console.log("[Realtime] Session created successfully");
    res.json(data);
  } catch (err: any) {
    console.error("/api/realtime/session error", err?.message);
    res.status(500).json({ error: "internal_error", detail: err?.message });
  }
});

export default router;