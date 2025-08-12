# ElevenLabs Integration Setup Guide

## Overview
This guide covers the complete setup of ElevenLabs voice AI integration for the Emergent Intelligence platform, including the ConvAI widget, agent configuration, and dynamic variable injection.

## Agent Configuration

### Primary Agent Details
- **Agent ID**: `agent_7401k28d3x9kfdntv7cjrj6t43be`
- **Agent Name**: Colby Black - Task Manager
- **Purpose**: Autonomous AI assistant for task management and workflow automation
- **Voice**: Professional, supportive tone for task management

### Agent Capabilities
- Task creation and management
- Research assistance
- Workflow automation suggestions
- File analysis and processing
- Calendar integration
- Project management

## Widget Integration

### HTML Integration
The ElevenLabs ConvAI widget is integrated into the React application using a custom component that handles mounting, session management, and cleanup.

**Key Files**:
- `client/src/components/CompactTaskManager.tsx` - Widget mounting logic
- Widget script URL: `https://elevenlabs.io/convai-widget/index.js`

### Dynamic Variables Setup
The system injects session-specific variables into the ElevenLabs widget to maintain context across conversations.

**Variables Configured**:
```javascript
{
  sessionId: "s_[unique_session_id]"  // Links voice conversations to task sessions
}
```

### Widget Mounting Process
```javascript
// 1. Remove any existing widgets to prevent duplicates
const existingWidgets = document.querySelectorAll('elevenlabs-convai');
existingWidgets.forEach(widget => widget.remove());

// 2. Create new widget element
const widget = document.createElement('elevenlabs-convai');
widget.setAttribute('agent-id', 'agent_7401k28d3x9kfdntv7cjrj6t43be');

// 3. Set dynamic variables
widget.addEventListener('loaded', () => {
  widget.setVariables({ sessionId: currentSessionId });
});

// 4. Mount to DOM
document.body.appendChild(widget);
```

## Actions Configuration

### Available Actions
The agent can perform the following actions based on voice conversations:

1. **add_task**
   - Description: Create a new task with title, context, and optional steps
   - Parameters: name, description, context
   - Implementation: Creates task via API endpoint

2. **research_topic**
   - Description: Research a topic and provide comprehensive information
   - Parameters: topic, depth
   - Implementation: Web search and analysis

3. **suggest_automation**
   - Description: Suggest workflow automation based on user patterns
   - Parameters: workflow_type, triggers
   - Implementation: N8N integration for automation creation

### Action Implementation
Actions are configured in the ElevenLabs dashboard and handled by webhook endpoints in the application.

**Webhook Endpoint**: `/api/elevenlabs/actions`
**Handler File**: `server/routes.ts`

## API Integration

### ElevenLabs SDK Usage
The application uses the ElevenLabs JavaScript SDK for programmatic access to voice synthesis and agent management.

**Installation**:
```bash
npm install @elevenlabs/elevenlabs-js @elevenlabs/react
```

**Configuration**:
```typescript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});
```

### Voice Synthesis
The system can generate voice responses for task confirmations and feedback.

```typescript
// Generate speech for task completion
const audio = await elevenlabs.generate({
  voice: "rachel",
  text: "Task completed successfully!",
  model_id: "eleven_monolingual_v1"
});
```

## Environment Variables

### Required Configuration
```env
ELEVENLABS_API_KEY=your_api_key_here
```

### Widget Configuration Variables
These are set dynamically in the frontend:
- `sessionId`: Links voice conversations to task management sessions
- `userName`: User identification for personalized responses
- `currentProject`: Context for project-specific task creation

## Session Management

### Session Linking
The system maintains consistency between voice interactions and task management through session IDs:

1. **Session Creation**: Each user interaction creates a unique session
2. **Variable Injection**: Session ID is injected into the ElevenLabs widget
3. **Action Routing**: Voice-triggered actions use the session ID to create tasks in the correct context
4. **Memory Persistence**: Session data is stored for future reference

### Session Flow
```
User Voice Input → ElevenLabs Agent → Action Trigger → 
Webhook with Session ID → Task Creation → UI Update
```

## Troubleshooting

### Common Issues

1. **Widget Not Loading**
   - Check if script is properly loaded
   - Verify agent ID is correct
   - Ensure API key is valid

2. **Variables Not Updating**
   - Confirm `loaded` event listener is attached
   - Check variable names match agent configuration
   - Verify session ID format

3. **Actions Not Triggering**
   - Validate webhook URL is accessible
   - Check action configuration in ElevenLabs dashboard
   - Verify agent has proper action permissions

### Debug Tools

**Widget Status Logging**:
```javascript
widget.addEventListener('loaded', () => {
  console.log('[EL] Widget loaded successfully');
});

widget.addEventListener('error', (error) => {
  console.error('[EL] Widget error:', error);
});
```

**Variable Verification**:
```javascript
// Check if variables are properly set
console.log('[EL] Setting variables:', { sessionId });
widget.setVariables({ sessionId });
```

## Agent Instructions

### System Prompt
The agent is configured with specific instructions to maintain consistency with the task management system:

```
You are Colby, an autonomous AI assistant specialized in task management and productivity. You help users:

1. Create and organize tasks efficiently
2. Research topics thoroughly
3. Suggest workflow automations
4. Provide project management guidance

Always be:
- Professional but approachable
- Proactive in suggesting improvements
- Clear in your communication
- Focused on actionable outcomes

When creating tasks, always include:
- Clear, specific titles
- Appropriate context (computer/phone/physical)
- Realistic time estimates
- Actionable next steps
```

### Voice Personality Guidelines
- Professional tone with warmth
- Clear articulation for task details
- Confirmatory responses for actions taken
- Proactive suggestions for improvements

## Security Considerations

### API Key Management
- Store ElevenLabs API key in environment variables only
- Never expose API keys in frontend code
- Use secure webhook endpoints for action handling

### Session Security
- Generate cryptographically secure session IDs
- Validate session ownership before action execution
- Implement rate limiting for voice-triggered actions

### Data Privacy
- Voice conversations are processed by ElevenLabs
- Task data remains in your application
- No sensitive information should be included in voice interactions

## Performance Optimization

### Widget Loading
- Load widget asynchronously to prevent blocking
- Implement proper cleanup on component unmount
- Cache widget instance when possible

### Action Processing
- Implement async action handlers
- Add proper error handling for failed actions
- Use queuing for multiple simultaneous actions

## Integration Testing

### Test Scenarios
1. **Basic Widget Mounting**: Verify widget loads and displays correctly
2. **Variable Injection**: Confirm session variables are properly set
3. **Action Execution**: Test each action type through voice input
4. **Error Handling**: Verify graceful degradation when services unavailable

### Testing Tools
- Browser developer tools for widget debugging
- ElevenLabs dashboard for agent testing
- Application logs for action processing verification

This setup guide should provide everything needed to configure and maintain the ElevenLabs integration for the Emergent Intelligence platform.