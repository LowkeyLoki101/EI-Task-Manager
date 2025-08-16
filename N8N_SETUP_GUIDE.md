# N8N Workflow Automation Setup Guide

## Overview
Your Emergent Intelligence platform has **comprehensive n8n integration** built-in, ready for powerful workflow automation. The integration includes:

- **Smart Task Workflows**: Automatically convert tasks into n8n workflows
- **LLM Automation**: Create AI-powered workflows with OpenAI integration
- **Workflow Suggestions**: AI analyzes your tasks and suggests relevant automation patterns
- **Real-time Execution**: Monitor and execute workflows directly from the platform

## Current Integration Features

### ✅ Already Built-In
- **API Routes**: Complete n8n REST API integration (`/api/n8n/*`)
- **Task Integration**: Convert any task to automated workflow
- **Smart Suggestions**: AI-powered workflow recommendations
- **Execution Monitoring**: Track workflow runs and results
- **LLM Workflows**: OpenAI + n8n automation chains

### 🔄 Workflow Types Supported
1. **Email Automation** - Send notifications on task changes
2. **Data Processing** - AI-powered data analysis pipelines  
3. **Research Automation** - Web scraping + AI summarization
4. **Social Media** - Cross-platform content publishing
5. **File Management** - Document processing workflows
6. **AI Assistant** - General task automation with GPT

## Setup Options

### Option 1: External n8n Instance (Recommended)
Run n8n separately and connect it to your platform:

```bash
# Install n8n globally
npm install -g n8n

# Start n8n on port 5678
N8N_HOST=localhost N8N_PORT=5678 n8n start
```

Access n8n UI at: `http://localhost:5678`

### Option 2: Docker Setup
Use the included docker-compose.yml:

```bash
docker-compose up -d n8n
```

### Option 3: Replit Deployment
Deploy n8n as a separate Replit project and update the base URL in the integration.

## Configuration

### Environment Variables
Set these in your environment or Replit secrets:

```env
N8N_BASE_URL=http://localhost:5678
N8N_ENCRYPTION_KEY=your_encryption_key
OPENAI_API_KEY=your_openai_key  # For LLM workflows
```

### Update Integration URL
If running n8n on a different host/port, update the base URL in `server/n8n-integration.ts`:

```typescript
constructor(baseUrl: string = 'https://your-n8n-instance.com') {
  this.n8nBaseUrl = baseUrl;
}
```

## Using Workflow Automation

### 1. Create Task Workflows
- Select any task in your task manager
- Use the "Create Workflow" action
- The system automatically generates n8n workflow JSON
- Workflow includes task updates, notifications, and AI processing

### 2. Smart Workflow Suggestions
The platform analyzes your task content and suggests relevant workflows:
- **"email client"** → Email automation workflow
- **"analyze data"** → Data processing with AI
- **"research topic"** → Web scraping + summarization
- **"social post"** → Multi-platform publishing

### 3. LLM Automation
Create AI-powered workflows that:
- Process natural language prompts
- Generate responses using OpenAI
- Save results back to your platform
- Trigger follow-up actions

### 4. Monitor Executions
- View workflow status in real-time
- Track execution history
- Debug failed workflows
- Analyze performance metrics

## API Endpoints Available

```
GET    /api/n8n/status              # Check n8n connection
GET    /api/n8n/workflows           # List all workflows
POST   /api/n8n/workflows/from-task/:taskId  # Create from task
POST   /api/n8n/workflows/llm-automation     # Create LLM workflow
POST   /api/n8n/workflows/:id/execute        # Execute workflow
GET    /api/n8n/executions          # Get execution history
POST   /api/n8n/suggest-workflows   # Get smart suggestions
```

## Troubleshooting

### Connection Issues
If you see `[N8N] ❌ Failed to connect to n8n`:
1. Ensure n8n is running on the correct port (5678)
2. Check firewall/network settings
3. Verify the base URL configuration
4. Test direct access: `curl http://localhost:5678/rest/healthy`

### Workflow Creation Fails
1. Check OpenAI API key for LLM workflows
2. Verify task exists before creating workflow
3. Review n8n logs for detailed errors
4. Ensure proper permissions in n8n

## Next Steps

1. **Start n8n** using one of the setup options above
2. **Check connection** by visiting `/api/n8n/status` in your platform
3. **Create your first workflow** from an existing task
4. **Explore smart suggestions** based on your task content
5. **Monitor executions** and optimize workflows

## Advanced Features

### Custom Workflow Templates
The integration supports custom workflow templates for:
- Company-specific processes
- Industry automation patterns
- Integration with other tools (Slack, GitHub, etc.)

### Webhook Integration
n8n can trigger platform actions via webhooks:
- Update task status
- Create new tasks
- Send notifications
- Store automation results

Your platform is ready for enterprise-grade workflow automation - just connect n8n and start automating!