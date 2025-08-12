# ElevenLabs Agent Setup Guide

## Your Agent Configuration

**Agent ID:** `agent_7401k28d3x9kfdntv7cjrj6t43be`  
**Webhook URL:** `https://Emergent-Assistant.replit.app/api/actions/`

## Step 1: Add Test Webhook

Go to ElevenLabs Dashboard → Your Agent → Tools → **Add webhook tool**

Fill out the form exactly as follows:

### Configuration
- **Name:** `test`
- **Description:** `Test webhook connectivity to verify integration is working`

### Method & URL
- **Method:** `POST` (select from dropdown)
- **URL:** `https://Emergent-Assistant.replit.app/api/actions/test`

### Settings
- **Response timeout (seconds):** `20`
- **Disable interruptions:** Leave unchecked
- **Pre-tool speech:** Select `Automatic` (or leave default)

### Authentication
- **Authentication:** Leave as "Workspace has no auth connections"

### Headers
- Leave empty (don't add any headers)

### Path parameters
- Leave empty (don't add any path parameters)

### Query parameters  
- Leave empty (don't add any query parameters)

### Body parameters
- **Description:** `Parameters for testing webhook connectivity`
- **Properties:** Leave empty for now (don't add any properties)

### Dynamic Variables
- Leave empty (don't add any dynamic variables)

### Dynamic Variable Assignments
- Leave empty (don't add any assignments)

**Save the webhook tool**

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

Once test works, add this tool using the ElevenLabs form interface:

Go to ElevenLabs Dashboard → Your Agent → Tools → **Add webhook tool**

### Configuration
- **Name:** `add_task`
- **Description:** `Create a new task with title, context, and optional steps`

### Method & URL
- **Method:** `POST`
- **URL:** `https://Emergent-Assistant.replit.app/api/actions/add_task`

### Settings
- **Response timeout (seconds):** `20`
- **Disable interruptions:** Leave unchecked
- **Pre-tool speech:** Select `Automatic`

### Authentication
- **Authentication:** Leave as "Workspace has no auth connections"

### Headers
- Leave empty

### Path parameters
- Leave empty

### Query parameters  
- Leave empty

### Body parameters
- **Description:** `Task creation parameters extracted from user's request`

**Properties (click "Add property" for each):**

**Property 1:**
- **Data type:** String
- **Identifier:** `title`
- **Required:** ✓ (check this box)
- **Value Type:** LLM Prompt
- **Description:** `Task title or main objective extracted from user's request`

**Property 2:**
- **Data type:** String
- **Identifier:** `context`
- **Required:** Leave unchecked
- **Value Type:** LLM Prompt
- **Description:** `Context where task should be done: computer, phone, or physical`

**Property 3:**
- **Data type:** String
- **Identifier:** `steps`
- **Required:** Leave unchecked
- **Value Type:** LLM Prompt
- **Description:** `Optional comma-separated list of steps to complete the task`

### Dynamic Variables
- Leave empty

### Dynamic Variable Assignments
- Leave empty

**Save the webhook tool**

## Expected Behavior

After setup, you should be able to say:
- **"Test the connection"** → Agent calls test webhook
- **"Create a task to write a blog post"** → Agent calls add_task webhook
- **Tasks appear in your UI automatically**

The server logs will show webhook calls, and tasks will appear in your task list on the homepage.