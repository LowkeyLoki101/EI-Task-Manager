# ElevenLabs API Integration Documentation

## SDK Integration

### Package Installation
```bash
npm install @elevenlabs/elevenlabs-js @elevenlabs/react
```

### Client Configuration
```typescript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});
```

## Voice Synthesis API

### Text-to-Speech Generation
```typescript
async function generateSpeech(text: string, voice: string = "rachel") {
  try {
    const audio = await client.generate({
      voice: voice,
      text: text,
      model_id: "eleven_monolingual_v1"
    });
    
    return audio;
  } catch (error) {
    console.error('Speech generation failed:', error);
    throw error;
  }
}
```

### Voice Options
- **Rachel**: Clear, professional female voice
- **Josh**: Natural male voice
- **Arnold**: Deep, authoritative male voice
- **Bella**: Warm, friendly female voice

## ConvAI Widget API

### Widget Creation and Management
```typescript
interface WidgetConfig {
  agentId: string;
  variables?: Record<string, any>;
  onLoaded?: () => void;
  onError?: (error: any) => void;
}

class ElevenLabsWidget {
  private widget: HTMLElement | null = null;
  
  mount(config: WidgetConfig): void {
    // Remove existing widgets
    this.cleanup();
    
    // Create new widget
    this.widget = document.createElement('elevenlabs-convai');
    this.widget.setAttribute('agent-id', config.agentId);
    
    // Set up event listeners
    this.widget.addEventListener('loaded', () => {
      if (config.variables) {
        this.setVariables(config.variables);
      }
      config.onLoaded?.();
    });
    
    this.widget.addEventListener('error', config.onError || console.error);
    
    // Mount to DOM
    document.body.appendChild(this.widget);
  }
  
  setVariables(variables: Record<string, any>): void {
    if (this.widget && 'setVariables' in this.widget) {
      (this.widget as any).setVariables(variables);
    }
  }
  
  cleanup(): void {
    const existingWidgets = document.querySelectorAll('elevenlabs-convai');
    existingWidgets.forEach(widget => widget.remove());
    this.widget = null;
  }
}
```

## Agent Management API

### Agent Configuration
```typescript
interface AgentConfig {
  name: string;
  description: string;
  instructions: string;
  voice: string;
  actions: ActionConfig[];
}

interface ActionConfig {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
  webhook_url: string;
}
```

### Creating an Agent
```typescript
async function createAgent(config: AgentConfig) {
  try {
    const agent = await client.agents.create({
      name: config.name,
      description: config.description,
      instructions: config.instructions,
      voice: config.voice,
      actions: config.actions
    });
    
    return agent;
  } catch (error) {
    console.error('Agent creation failed:', error);
    throw error;
  }
}
```

## Webhook Integration

### Action Webhook Handler
```typescript
import express from 'express';

interface ActionRequest {
  agentId: string;
  sessionId: string;
  action: string;
  parameters: Record<string, any>;
  conversation_history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

app.post('/api/elevenlabs/actions', async (req: express.Request, res: express.Response) => {
  try {
    const actionData: ActionRequest = req.body;
    
    console.log('[ElevenLabs] Action received:', actionData.action);
    
    // Route to appropriate handler
    switch (actionData.action) {
      case 'add_task':
        await handleAddTask(actionData);
        break;
      case 'research_topic':
        await handleResearch(actionData);
        break;
      case 'suggest_automation':
        await handleAutomation(actionData);
        break;
      default:
        console.warn('[ElevenLabs] Unknown action:', actionData.action);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ElevenLabs] Action handler error:', error);
    res.status(500).json({ error: 'Action processing failed' });
  }
});
```

### Action Handlers
```typescript
async function handleAddTask(actionData: ActionRequest) {
  const { name, description, context } = actionData.parameters;
  
  // Extract session ID from variables or parameters
  const sessionId = actionData.sessionId || actionData.parameters.sessionId;
  
  if (!sessionId) {
    throw new Error('Session ID required for task creation');
  }
  
  // Create task using existing storage system
  await storage.createTask({
    title: name,
    description: description,
    context: context || 'computer',
    timeWindow: 'any',
    status: 'today',
    sessionId: sessionId
  });
  
  console.log('[ElevenLabs] Task created:', name);
}

async function handleResearch(actionData: ActionRequest) {
  const { topic, depth } = actionData.parameters;
  
  // Perform research using existing research tools
  const research = await performWebSearch(topic);
  
  // Store research results
  await storage.createArtifact({
    type: 'research',
    title: `Research: ${topic}`,
    content: research,
    sessionId: actionData.sessionId
  });
  
  console.log('[ElevenLabs] Research completed:', topic);
}
```

## Error Handling

### API Error Types
```typescript
enum ElevenLabsError {
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  INVALID_REQUEST = 'invalid_request',
  SERVER_ERROR = 'server_error'
}

function handleElevenLabsError(error: any) {
  switch (error.type) {
    case ElevenLabsError.AUTHENTICATION_ERROR:
      console.error('ElevenLabs API key invalid or missing');
      break;
    case ElevenLabsError.RATE_LIMIT_ERROR:
      console.error('ElevenLabs rate limit exceeded');
      break;
    case ElevenLabsError.INVALID_REQUEST:
      console.error('Invalid request to ElevenLabs API:', error.message);
      break;
    default:
      console.error('ElevenLabs API error:', error);
  }
}
```

## Rate Limiting and Quotas

### Usage Monitoring
```typescript
class ElevenLabsUsageTracker {
  private requestCount = 0;
  private resetTime = Date.now() + 3600000; // 1 hour from now
  
  canMakeRequest(): boolean {
    if (Date.now() > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = Date.now() + 3600000;
    }
    
    return this.requestCount < 1000; // Adjust based on your plan
  }
  
  recordRequest(): void {
    this.requestCount++;
  }
}
```

## Testing and Development

### Mock Agent for Development
```typescript
class MockElevenLabsAgent {
  constructor(private config: { agentId: string }) {}
  
  async simulateAction(action: string, parameters: any) {
    console.log('[Mock ElevenLabs] Simulating action:', action, parameters);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock response
    return { success: true, action, parameters };
  }
}
```

### Testing Voice Integration
```typescript
describe('ElevenLabs Integration', () => {
  it('should create tasks from voice input', async () => {
    const mockAction = {
      agentId: 'agent_7401k28d3x9kfdntv7cjrj6t43be',
      sessionId: 'test_session',
      action: 'add_task',
      parameters: {
        name: 'Test Task',
        description: 'Task created via voice',
        context: 'computer'
      }
    };
    
    await handleAddTask(mockAction);
    
    const tasks = await storage.getTasksBySessionId('test_session');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Test Task');
  });
});
```

## Performance Considerations

### Audio Caching
```typescript
class AudioCache {
  private cache = new Map<string, ArrayBuffer>();
  
  async getAudio(text: string, voice: string): Promise<ArrayBuffer> {
    const cacheKey = `${voice}:${text}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const audio = await client.generate({ text, voice });
    this.cache.set(cacheKey, audio);
    
    return audio;
  }
}
```

### Widget Optimization
```typescript
// Lazy load widget only when needed
async function loadElevenLabsWidget() {
  if (!document.querySelector('script[src*="elevenlabs.io/convai-widget"]')) {
    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    
    return new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}
```

## Security Best Practices

### API Key Protection
```typescript
// Never expose API keys in frontend
const isServer = typeof window === 'undefined';

if (!isServer) {
  throw new Error('ElevenLabs client should only be used on server side');
}

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});
```

### Webhook Security
```typescript
// Validate webhook signatures
function validateWebhookSignature(payload: string, signature: string) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.ELEVENLABS_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

This API integration documentation provides comprehensive guidance for working with the ElevenLabs platform within the Emergent Intelligence system.