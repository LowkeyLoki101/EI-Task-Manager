# ElevenLabs Agent Setup Guide

## Your Agent Configuration

**Agent ID:** `agent_7401k28d3x9kfdntv7cjrj6t43be`  
**Webhook URL:** `https://Emergent-Assistant.replit.app/api/actions/`

## Step 1: Add Test Webhook

Go to ElevenLabs Dashboard → Your Agent → Tools → Add Tool

**COPY THIS EXACT JSON:**

```json
{
  "type": "webhook",
  "name": "test", 
  "description": "Test webhook connectivity to verify integration is working",
  "api_schema": {
    "url": "https://Emergent-Assistant.replit.app/api/actions/test",
    "method": "POST",
    "path_params_schema": [],
    "query_params_schema": [],
    "request_body_schema": null,
    "request_headers": [],
    "auth_connection": null
  },
  "response_timeout_secs": 20,
  "dynamic_variables": {
    "dynamic_variable_placeholders": {}
  },
  "assignments": [],
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto"
}
```

## Step 2: Update Agent Instructions

Replace your agent's system prompt with:

```
You are a task management assistant. CRITICAL: You MUST use the available tools for every request - never just describe what you would do.

AVAILABLE TOOLS:
- test: Always use this when user mentions "test" or "check connection"  
- add_task: Always use this when user mentions creating, making, or adding any task

TOOL USAGE RULES:
1. When user says "test" anything → IMMEDIATELY call test tool
2. When user mentions any task/todo/work → IMMEDIATELY call add_task tool  
3. NEVER respond with just words - ALWAYS call the appropriate tool
4. ALWAYS confirm the tool was called successfully

EXAMPLES:
User: "test the connection" 
You: [calls test tool] "Connection tested successfully!"

User: "create a task to plan vacation"
You: [calls add_task tool] "Task created: plan vacation with planning steps!"

User: "I need to write a blog post"  
You: [calls add_task tool] "Task created: write blog post with research and writing steps!"

User: "make a todo for grocery shopping"
You: [calls add_task tool] "Task created: grocery shopping!"

CRITICAL: If you don't use tools, the system won't work. The user expects actions, not just conversation.
```

## Step 3: Test

1. **Test webhook first:** Say "Test the connection"
2. **Check server logs** for: `[ElevenLabs] TEST webhook called:`
3. **If working, add the full add_task tool** (configuration provided separately)

## Step 4: Add Task Creation Tool

Once test works, add this tool:

```json
{
  "type": "webhook",
  "name": "add_task", 
  "description": "Create a new task with title, context, and optional steps",
  "api_schema": {
    "url": "https://Emergent-Assistant.replit.app/api/actions/add_task",
    "method": "POST",
    "path_params_schema": [],
    "query_params_schema": [],
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
    ],
    "auth_connection": null
  },
  "response_timeout_secs": 20,
  "dynamic_variables": {
    "dynamic_variable_placeholders": {}
  },
  "assignments": [],
  "disable_interruptions": false,
  "force_pre_tool_speech": "auto"
}
```

## Expected Behavior

After setup, you should be able to say:
- **"Test the connection"** → Agent calls test webhook
- **"Create a task to write a blog post"** → Agent calls add_task webhook
- **Tasks appear in your UI automatically**

The server logs will show webhook calls, and tasks will appear in your task list on the homepage.