# ElevenLabs Agent Setup Guide

## Your Agent Configuration

**Agent ID:** `agent_7401k28d3x9kfdntv7cjrj6t43be`  
**Webhook URL:** `https://Emergent-Assistant.replit.app/api/actions/`

## Step 1: Add Test Webhook

Go to ElevenLabs Dashboard → Your Agent → Tools → Add Tool

**Tool Configuration:**
```json
{
  "name": "test",
  "description": "Test webhook connectivity to verify integration is working",
  "type": "webhook",
  "api_schema": {
    "url": "https://Emergent-Assistant.replit.app/api/actions/test",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "properties": [
        {
          "id": "message",
          "type": "string",
          "value_type": "llm_prompt",
          "description": "Test message to send",
          "required": true
        }
      ]
    },
    "request_headers": [
      {
        "type": "value",
        "name": "Content-Type", 
        "value": "application/json"
      }
    ]
  }
}
```

## Step 2: Update Agent Instructions

Replace your agent's system prompt with:

```
You are a task management assistant for the Emergent Intelligence platform. Your job is to help users create and manage tasks through voice commands.

IMPORTANT: You have access to tools that let you create tasks and test connectivity. ALWAYS use these tools when appropriate.

Available Tools:
- test: Use this to verify the connection is working
- add_task: Use this to create new tasks with steps

When a user asks you to:
- "Test the connection" or "Test webhook" → Use the test tool
- "Create a task" or mentions wanting to do something → Use the add_task tool
- "Make a task for..." → Use the add_task tool

ALWAYS call the appropriate tool. Don't just talk about what you would do - actually do it using the tools.

Example conversation:
User: "Test the connection"
You: "I'll test the connection now..." [calls test tool] "✅ Connection is working perfectly!"

User: "Create a task to write a blog post"
You: "I'll create that task for you..." [calls add_task tool] "✅ Task created with steps for research, outline, and writing!"

Remember: Use tools for every relevant request. Confirm actions were completed.
```

## Step 3: Test

1. **Test webhook first:** Say "Test the connection"
2. **Check server logs** for: `[ElevenLabs] TEST webhook called:`
3. **If working, add the full add_task tool** (configuration provided separately)

## Step 4: Add Task Creation Tool

Once test works, add this tool:

```json
{
  "name": "add_task", 
  "description": "Create a new task with title, context, and optional steps",
  "type": "webhook",
  "api_schema": {
    "url": "https://Emergent-Assistant.replit.app/api/actions/add_task",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "properties": [
        {
          "id": "title",
          "type": "string", 
          "value_type": "llm_prompt",
          "description": "Task title or main objective",
          "required": true
        },
        {
          "id": "context",
          "type": "string",
          "value_type": "llm_prompt", 
          "description": "Context: computer, phone, or physical",
          "required": false
        },
        {
          "id": "steps",
          "type": "array",
          "value_type": "llm_prompt",
          "description": "Array of step titles for the task",
          "required": false
        }
      ]
    },
    "request_headers": [
      {
        "type": "value",
        "name": "Content-Type",
        "value": "application/json" 
      }
    ]
  }
}
```

## Expected Behavior

After setup, you should be able to say:
- **"Test the connection"** → Agent calls test webhook
- **"Create a task to write a blog post"** → Agent calls add_task webhook
- **Tasks appear in your UI automatically**

The server logs will show webhook calls, and tasks will appear in your task list on the homepage.