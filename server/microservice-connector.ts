/**
 * Emergent Intelligence Microservice Integration
 * Enables connection to AI agent networks and cross-service collaboration
 */

import fetch from 'node-fetch';

export class MicroserviceConnector {
  private serviceName: string;
  private serviceUrl: string;
  private hubUrl: string;
  private connectedServices: Map<string, any>;

  constructor(serviceName: string, serviceUrl: string, hubUrl = 'https://integration-hub.your-username.repl.co') {
    this.serviceName = serviceName;
    this.serviceUrl = serviceUrl;
    this.hubUrl = hubUrl;
    this.connectedServices = new Map();
  }

  // Register this service with the Integration Hub
  async registerWithHub() {
    try {
      const response = await fetch(`${this.hubUrl}/api/repls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.serviceName,
          apiBaseUrl: this.serviceUrl,
          status: 'online',
          description: `Emergent Intelligence: ${this.serviceName} - Autonomous AI workstation with task management, knowledge base, and voice integration`,
          githubUrl: `https://github.com/user/${this.serviceName}`,
          replUrl: this.serviceUrl,
          capabilities: [
            'autonomous-ai-workstation',
            'task-management',
            'knowledge-base',
            'voice-integration',
            'code-analysis',
            'calendar-sync',
            'n8n-automation',
            'realtime-chat'
          ]
        })
      });

      if (response.ok) {
        console.log(`✅ Service ${this.serviceName} registered with Integration Hub`);
        return await response.json();
      } else {
        console.log(`⚠️ Failed to register with Integration Hub: ${response.status}`);
      }
    } catch (error: any) {
      console.log(`⚠️ Integration Hub not available: ${error?.message || 'Unknown error'}`);
    }
  }

  // Register API endpoints for discovery
  async registerEndpoint(method: string, path: string, description: string, requestSchema: any = null, responseSchema: any = null) {
    try {
      const response = await fetch(`${this.hubUrl}/api/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          path,
          description,
          requestSchema,
          responseSchema,
          isActive: true,
          service: this.serviceName
        })
      });

      if (response.ok) {
        console.log(`📡 Registered endpoint: ${method} ${path}`);
      }
    } catch (error: any) {
      console.log(`⚠️ Could not register endpoint: ${error?.message || 'Unknown error'}`);
    }
  }

  // Get all available services from the network
  async getAvailableServices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.hubUrl}/api/repls`);
      const data = await response.json();
      const services: any[] = Array.isArray(data) ? data : [];
      
      // Cache service information
      services.forEach((service: any) => {
        this.connectedServices.set(service.name, service);
      });
      
      return services;
    } catch (error: any) {
      console.log(`⚠️ Could not fetch available services: ${error?.message || 'Unknown error'}`);
      return [];
    }
  }

  // Call another service's API
  async callService(serviceName: string, endpoint: string, options: any = {}) {
    let service = this.connectedServices.get(serviceName);
    if (!service) {
      const services: any[] = await this.getAvailableServices();
      const foundService = services.find((s: any) => s.name === serviceName);
      if (!foundService) {
        throw new Error(`Service ${serviceName} not found`);
      }
      this.connectedServices.set(serviceName, foundService);
      service = foundService;
    }

    const serviceInfo = this.connectedServices.get(serviceName)!;
    const url = `${serviceInfo.apiBaseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`Service call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`❌ Failed to call ${serviceName}${endpoint}:`, error?.message || 'Unknown error');
      throw error;
    }
  }

  // Health check data for service discovery
  getHealthData() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      capabilities: [
        'autonomous-ai-workstation',
        'task-management',
        'knowledge-base',
        'voice-integration',
        'code-analysis',
        'calendar-sync',
        'n8n-automation',
        'realtime-chat'
      ],
      version: '1.0.0',
      features: {
        aiWorkstation: 'Two-mode AI workstation with autonomous and human control',
        taskManagement: 'Hierarchical task management with AI completion learning',
        knowledgeBase: 'Auto-capture knowledge base with metadata and search',
        voiceIntegration: 'ElevenLabs conversational AI with actions',
        codeAnalysis: 'GPT-5 powered code recommendations with voting system',
        calendarSync: 'iPhone calendar integration via CalDAV',
        automation: 'N8N workflow automation with AI suggestions',
        realtimeChat: 'GPT-5 autonomous chat with persistent memory'
      }
    };
  }
}

// Quick setup functions for common integrations
export async function connectToTaskManager(connector: MicroserviceConnector) {
  try {
    const data = await connector.callService('EI-Task-Manager', '/api/agents');
    const agents: any[] = Array.isArray(data) ? data : [];
    console.log(`🤖 Connected to Task Manager with ${agents.length} AI agents`);
    return agents;
  } catch (error) {
    console.log('⚠️ Task Manager not available');
    return [];
  }
}

export async function connectToTaskPilot(connector: MicroserviceConnector) {
  try {
    const health: any = await connector.callService('TaskPilot', '/api/health');
    console.log(`🧠 Connected to TaskPilot with features:`, Object.keys(health.features || {}));
    return health;
  } catch (error) {
    console.log('⚠️ TaskPilot not available');
    return null;
  }
}

export async function delegateToAgent(connector: MicroserviceConnector, agentId: string, taskData: any) {
  return await connector.callService('EI-Task-Manager', '/api/agents/task', {
    method: 'POST',
    body: { agentId, task: taskData }
  });
}

export async function accessResearch(connector: MicroserviceConnector, query: string) {
  return await connector.callService('TaskPilot', '/api/research', {
    method: 'POST',
    body: { query, type: 'web_search' }
  });
}

export async function storeInMemory(connector: MicroserviceConnector, data: any, context = 'general') {
  return await connector.callService('TaskPilot', '/api/memory', {
    method: 'POST',
    body: { type: 'store', content: data, context }
  });
}

// Check if specific service is available
export async function isServiceAvailable(connector: MicroserviceConnector, serviceName: string) {
  try {
    const services: any[] = await connector.getAvailableServices();
    return services.some((s: any) => s.name === serviceName && s.status === 'online');
  } catch (error) {
    return false;
  }
}

// Get service capabilities
export async function getServiceCapabilities(connector: MicroserviceConnector, serviceName: string) {
  try {
    const health: any = await connector.callService(serviceName, '/api/health');
    return health.capabilities || [];
  } catch (error) {
    return [];
  }
}

// List all available network services
export async function listNetworkServices(connector: MicroserviceConnector) {
  const services: any[] = await connector.getAvailableServices();
  console.log('🌐 Available Services:');
  services.forEach((service: any) => {
    console.log(`  • ${service.name} (${service.status}) - ${service.description}`);
  });
  return services;
}