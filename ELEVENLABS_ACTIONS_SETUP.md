# ElevenLabs Actions Setup Guide

## Quick Setup for Agent: agent_7401k28d3x9kfdntv7cjrj6t43be

### 1. Access ElevenLabs Dashboard
- Go to ElevenLabs.io dashboard
- Navigate to your agent: `agent_7401k28d3x9kfdntv7cjrj6t43be`
- Go to Settings > Actions

### 2. Add Actions (Copy these exactly)

**tasks.create**
```json
{
  "name": "tasks.create",
  "description": "Create a task with optional steps, context, and time window",
  "url": "POST https://your-replit-url.repl.co/api/tasks",
  "parameters": {
    "type": "object",
    "properties": {
      "sessionId": {"type": "string"},
      "title": {"type": "string"},
      "context": {"type": "string", "enum": ["computer","phone","physical","any"], "default": "computer"},
      "time_window": {"type": "string", "enum": ["morning","midday","evening","any"], "default": "any"},
      "priority": {"type": "string", "enum": ["low","normal","high"], "default": "normal"},
      "steps": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["sessionId","title"]
  }
}
```

**todo.get**
```json
{
  "name": "todo.get", 
  "description": "Get current tasks and steps filtered by context and time",
  "url": "POST https://your-replit-url.repl.co/api/todo/get",
  "parameters": {
    "type": "object",
    "properties": {
      "sessionId": {"type": "string"},
      "context": {"type": "string", "enum": ["computer","phone","physical","any"]},
      "time_window": {"type": "string", "enum": ["morning","midday","evening","any"]},
      "view": {"type": "string", "enum": ["items","steps","substeps"], "default": "items"}
    },
    "required": ["sessionId"]
  }
}
```

**web.search**
```json
{
  "name": "web.search",
  "description": "Search the web for information to help with tasks",
  "url": "POST https://your-replit-url.repl.co/api/actions/web_search",
  "parameters": {
    "type": "object", 
    "properties": {
      "sessionId": {"type": "string"},
      "query": {"type": "string"},
      "k": {"type": "integer", "default": 5}
    },
    "required": ["sessionId","query"]
  }
}
```

**qr.generate**
```json
{
  "name": "qr.generate",
  "description": "Generate QR codes for URLs or text",
  "url": "POST https://your-replit-url.repl.co/api/actions/qr", 
  "parameters": {
    "type": "object",
    "properties": {
      "sessionId": {"type": "string"},
      "url": {"type": "string"},
      "label": {"type": "string"}
    },
    "required": ["sessionId","url"]
  }
}
```

### 3. Widget Configuration

**Enable Web Widget:**
- Web Widget: ON
- Public/Unauthenticated: ON (for testing)
- Allowed Origins: Add your Replit URL exactly:
  - `https://your-project.your-username.repl.co`

### 4. System Prompt for Colby

Update your agent's system prompt to:

```
You are "Colby," the digital operations manager. You work alongside me to create, update, and complete tasks. You are proactive, organized, and you keep track of everything across time.

Core Responsibilities:
1. Listen & Capture - Create tasks immediately when I mention new work
2. Organize & Tag - Label everything with context (Computer/Phone/Physical) and time windows 
3. Automate What You Can - Use your tools to research, generate QR codes, search the web
4. Update & Remind - Keep tasks current and remind me based on context and time
5. Report Status - Provide clear progress updates

Tools You Have:
- tasks.create(title, context, time_window, steps[])
- todo.get(context, time_window, view) 
- web.search(query, k)
- qr.generate(url, label)
- memory.save/get for remembering successful processes

Behavior Rules:
- Always try to do it yourself first with available tools
- Create clear, actionable steps for me to complete
- Keep everything rolling until marked "Done"
- Save successful processes to memory for next time

Example: If I say "Create breaker-box help page", you should:
1. Create task with steps (scaffold page, embed widget, generate QR)
2. Use web.search to find relevant information
3. Use qr.generate to create QR code
4. Report progress and what's left for me to do
```

### 5. Test the Setup

1. Open `/voice-sanity.html` in a new tab (not in Replit preview)
2. Check console for `[EL] ready` message
3. Try speaking: "Create a task to write a blog post"
4. Verify the task appears in your main app

### 6. Troubleshooting

**Widget not working:**
- Check CORS settings on your server
- Verify domain allowlist in ElevenLabs
- Use external tab, not Replit preview
- Grant microphone permissions

**Actions not triggering:**
- Verify exact URLs in action configurations
- Check server logs for incoming requests
- Ensure sessionId is being passed correctly

**Common Issues:**
- 403 errors = domain not allowlisted
- Widget not upgraded = CSP or SDK loading issue
- No tasks created = sessionId mismatch or endpoint errors

### Current Status
✅ Backend APIs ready (all 18 Colby actions implemented)
✅ Direct GPT-5 chat interface added below task manager  
🔧 ElevenLabs actions need to be configured in dashboard
🔧 Voice widget needs proper domain setup

**Next Steps:**
1. Configure actions in ElevenLabs dashboard using the JSON above
2. Test voice commands create tasks
3. Verify session ID consistency between voice and UI