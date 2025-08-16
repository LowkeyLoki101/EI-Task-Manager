/**
 * Emergent Intelligence Microservice Integration v2.0
 * Smart auto-detection with fallback mode for cross-service collaboration
 */

import fetch from 'node-fetch';

export class MicroserviceConnector {
  private serviceName: string;
  private serviceUrl: string;
  private hubUrl: string | null;
  private connectedServices: Map<string, any>;
  private knownServices: Map<string, string>;

  constructor(serviceName: string, serviceUrl: string) {
    this.serviceName = serviceName;
    this.serviceUrl = serviceUrl;
    this.hubUrl = null;
    this.connectedServices = new Map();
    
    // Pre-populate known services (existing network)
    this.knownServices = new Map([
      ['EI-Task-Manager', 'https://Emergent-Task-Manager.replit.app'],
      ['TaskPilot', 'https://Emergent-Assistant.replit.app']
    ]);
    
    console.log(`🔧 ${serviceName} initializing microservice connections...`);
  }

  // Smart Hub detection - tries multiple methods
  async detectIntegrationHub(): Promise<string | null> {
    if (this.hubUrl) return this.hubUrl;
    
    const candidateUrls = [
      'https://e506524e-3736-4b43-8cfa-4cc2a74bb701-00-15jabwch4trm1.riker.replit.dev',
      process.env.REPLIT_DEV_DOMAIN,
      'https://integration-hub.your-username.repl.co' // fallback to original
    ];
    
    for (const url of candidateUrls.filter(Boolean)) {
      try {
        const response = await fetch(`${url}/api/stats`, { 
          method: 'GET',
          timeout: 3000 
        } as any);
        
        if (response.ok) {
          const stats = await response.json() as any;
          if (stats.connectedRepls !== undefined) {
            this.hubUrl = url;
            console.log(`✅ Found Integration Hub at: ${url}`);
            return url;
          }
        }
      } catch (error) {
        // Continue to next candidate
        continue;
      }
    }
    
    console.log(`⚠️ Integration Hub not found - working in standalone mode`);
    return null;
  }

  // Register with Hub if available
  async registerWithHub(): Promise<boolean> {
    const hubUrl = await this.detectIntegrationHub();
    if (!hubUrl) return false;
    
    try {
      const response = await fetch(`${hubUrl}/api/repls`, {
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
        console.log(`✅ ${this.serviceName} registered with Integration Hub`);
        return true;
      }
    } catch (error: any) {
      console.log(`⚠️ Could not register with Hub: ${error?.message || 'Unknown error'}`);
    }
    
    return false;
  }

  // Register endpoint with Hub if available
  async registerEndpoint(method: string, path: string, description: string): Promise<void> {
    const hubUrl = await this.detectIntegrationHub();
    if (!hubUrl) return;
    
    try {
      await fetch(`${hubUrl}/api/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          path,
          description,
          isActive: true,
          service: this.serviceName
        })
      });
      
      console.log(`📡 Registered: ${method} ${path}`);
    } catch (error) {
      // Silent fail - not critical
    }
  }

  // Direct service call (bypasses Hub)
  async callService(serviceName: string, endpoint: string, options: any = {}): Promise<any> {
    let serviceUrl = this.knownServices.get(serviceName);
    
    // If we don't know the service, try to find it via Hub
    if (!serviceUrl) {
      const hubUrl = await this.detectIntegrationHub();
      if (hubUrl) {
        try {
          const response = await fetch(`${hubUrl}/api/repls`);
          const services = await response.json() as any[];
          const service = services.find((s: any) => s.name === serviceName);
          
          if (service && service.apiBaseUrl) {
            serviceUrl = service.apiBaseUrl;
            this.knownServices.set(serviceName, serviceUrl);
          }
        } catch (error) {
          throw new Error(`Service ${serviceName} not found and Hub unavailable`);
        }
      } else {
        throw new Error(`Service ${serviceName} not found - no Hub connection`);
      }
    }

    const url = `${serviceUrl}${endpoint}`;
    
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
        throw new Error(`${serviceName} call failed: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`❌ ${serviceName}${endpoint} failed:`, error.message);
      throw error;
    }
  }

  // Test network connectivity
  async testNetworkConnectivity(): Promise<any> {
    console.log(`🧪 Testing network connectivity for ${this.serviceName}...`);
    
    const results = {
      hub: false,
      taskManager: false,
      taskPilot: false
    };
    
    // Test Hub
    try {
      const hubUrl = await this.detectIntegrationHub();
      results.hub = !!hubUrl;
    } catch (error) {
      results.hub = false;
    }
    
    // Test Task Manager
    try {
      await this.callService('EI-Task-Manager', '/api/health');
      results.taskManager = true;
    } catch (error) {
      results.taskManager = false;
    }
    
    // Test TaskPilot
    try {
      await this.callService('TaskPilot', '/api/health');
      results.taskPilot = true;
    } catch (error) {
      results.taskPilot = false;
    }
    
    console.log('🌐 Network Status:', results);
    return results;
  }

  // Create health endpoint for Express apps
  createHealthEndpoint(app: any, capabilities: string[] = []): void {
    app.get('/api/health', (req: any, res: any) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        capabilities: capabilities,
        version: '2.0.0',
        network: 'microservices'
      });
    });
    
    // Register with Hub
    this.registerEndpoint('GET', '/api/health', 'Health check and capability discovery');
  }
}

// Helper functions for service integration
export async function getAIAgents(connector: MicroserviceConnector): Promise<any[]> {
  try {
    const agents = await connector.callService('EI-Task-Manager', '/api/agents');
    console.log(`🤖 Connected to ${agents.length} AI agents`);
    return agents;
  } catch (error: any) {
    console.log('⚠️ Task Manager unavailable');
    return [];
  }
}

export async function delegateTask(connector: MicroserviceConnector, agentId: string, taskData: any): Promise<any> {
  return await connector.callService('EI-Task-Manager', '/api/agents/task', {
    method: 'POST',
    body: { agentId, task: taskData, priority: 'normal' }
  });
}

export async function performResearch(connector: MicroserviceConnector, query: string, type: string = 'web_search'): Promise<any> {
  return await connector.callService('TaskPilot', '/api/research', {
    method: 'POST',
    body: { query, type }
  });
}

export async function storeMemory(connector: MicroserviceConnector, data: any, context: string = 'general'): Promise<any> {
  return await connector.callService('TaskPilot', '/api/memory', {
    method: 'POST',
    body: { type: 'store', content: data, context }
  });
}

// Legacy exports for backwards compatibility
export const connectToTaskManager = getAIAgents;
export const connectToTaskPilot = async (connector: MicroserviceConnector) => {
  try {
    const response = await connector.callService('TaskPilot', '/api/health');
    console.log(`🎯 Connected to TaskPilot`);
    return response;
  } catch (error: any) {
    console.log('⚠️ TaskPilot unavailable');
    return null;
  }
};

export const delegateToAgent = delegateTask;
export const accessResearch = performResearch;
export const storeInMemory = storeMemory;