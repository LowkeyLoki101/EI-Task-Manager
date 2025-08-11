Below are clean, drop‑in patches to enable **GPT conversational voice** (OpenAI Realtime WebRTC) in your app *without removing* your existing ElevenLabs Actions. Paste these files, then run the smoke test.

---

# 0) Env & deps

- Add to **Replit Secrets** (or .env):
  - `OPENAI_API_KEY=sk-...`
- Dependencies (server): `npm i node-fetch ws`
- (Optional) Types: `npm i -D @types/node-fetch @types/ws`

---

# 1) Server — Realtime session endpoint

Create: ``

```ts
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
      return res.status(500).json({ error: "session_create_failed", detail: text });
    }

    const data = await r.json(); // contains client_secret for browser
    res.json(data);
  } catch (err: any) {
    console.error("/api/realtime/session error", err?.message);
    res.status(500).json({ error: "internal_error", detail: err?.message });
  }
});

export default router;
```

Mount it in `` (after app init):

```ts
import realtimeRouter from "./realtime";
// ... your existing middleware
app.use((_, res, next) => { res.setHeader("Permissions-Policy", "microphone=*"); next(); });
app.use(realtimeRouter);
```

---

# 2) Frontend — tiny WebRTC helper

Create: ``

```ts
export type RealtimeSession = {
  client_secret?: { value: string };
  id?: string;
};

export async function createRealtimeSession(): Promise<RealtimeSession> {
  const r = await fetch("/api/realtime/session", { method: "POST" });
  if (!r.ok) throw new Error(`session http ${r.status}`);
  return r.json();
}

export async function connectRealtime(token: string) {
  // Create RTCPeerConnection
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

  // Play remote audio
  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;
  pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

  // Mic capture
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));

  // Create SDP offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Send offer to OpenAI Realtime REST endpoint using the client token
  const baseUrl = "https://api.openai.com/v1/realtime";
  const model = "gpt-4o-realtime-preview"; // keep in sync with server

  const sdpResp = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp as any,
  });

  const answer = { type: "answer", sdp: await sdpResp.text() } as RTCSessionDescriptionInit;
  await pc.setRemoteDescription(answer);

  return { pc, stream, audioEl };
}
```

---

# 3) Frontend — upgrade DirectChatInterface to voice

Patch `` (add voice controls; keep your existing text chat + Whisper path). Below is a self-contained component you can merge into yours.

```tsx
import React, { useEffect, useRef, useState } from "react";
import { createRealtimeSession, connectRealtime } from "../lib/realtime";

export default function DirectChatInterface() {
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [messages, setMessages] = useState<{ role: "user"|"assistant"; text: string }[]>([]);

  // Optional: handle text chat path you already had
  async function sendText(text: string) {
    setMessages((m) => [...m, { role: "user", text }]);
    // POST to /api/chat/process with { text } as you had before
    const r = await fetch("/api/chat/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const data = await r.json();
    setMessages((m) => [...m, { role: "assistant", text: data?.reply ?? "(no reply)" }]);
  }

  async function startVoice() {
    try {
      setConnecting(true);
      const session = await createRealtimeSession();
      const token = session?.client_secret?.value;
      if (!token) throw new Error("No client token returned");
      const { pc } = await connectRealtime(token);
      pcRef.current = pc;
      setReady(true);
    } catch (e) {
      console.error("voice connect error", e);
      alert("Mic/voice connect failed. Check site mic permission & console.");
    } finally {
      setConnecting(false);
    }
  }

  function stopVoice() {
    pcRef.current?.close();
    pcRef.current = null;
    setReady(false);
  }

  useEffect(() => {
    return () => { pcRef.current?.close(); };
  }, []);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        {!ready ? (
          <button disabled={connecting} onClick={startVoice} className="rounded-xl border px-3 py-2">{connecting ? "Connecting…" : "Start Voice"}</button>
        ) : (
          <button onClick={stopVoice} className="rounded-xl border px-3 py-2">Stop Voice</button>
        )}
      </div>

      {/* Simple text chat box (kept minimal) */}
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget as HTMLFormElement); const t = String(f.get("t")||"").trim(); if (t) { sendText(t); (e.currentTarget as HTMLFormElement).reset(); } }}>
        <input name="t" placeholder="Type a message" className="w-full rounded-xl border px-3 py-2" />
      </form>

      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`rounded-xl p-2 ${m.role === "user" ? "bg-slate-100" : "bg-emerald-50"}`}>{m.text}</div>
        ))}
      </div>
    </div>
  );
}
```

> This connects mic ↔ GPT Realtime and plays back the voice. Your existing Whisper-upload flow still works in parallel for typed/recorded clips.

---

# 4) Vite dev proxy (fix CORS locally)

Patch ``:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
```

---

# 5) Minimal smoke test

-

If voice fails: check **browser console** → look for `voice connect error`. Common causes are mic not allowed or a bad session token (server logs will show `/api/realtime/session` 4xx/5xx).

---

# 6) Optional: tie into your task engine

Once the voice loop is stable, expose tool calls (function calling) from Realtime so the agent can create/merge/update tasks live. For now, keep your existing `/api/actions/*` endpoints; next pass we’ll register them as tools with the model so it calls them directly.

---

# 7) Notes

- We purposely **did not remove ElevenLabs**. Your Actions + KB integration stays.
- This patch gives you **GPT voice now**; you can A/B between EL and GPT easily by showing one start button or both.

---

Ping me when these are pasted and running. I’ll then wire **tool calling** (tasks CRUD, QR, KB attach) into the Realtime session so speaking can immediately mutate the rolling list.

