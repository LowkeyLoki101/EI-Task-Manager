import { Express } from 'express';

// n8n Integration Service
export class N8nIntegrationService {
  private n8nBaseUrl: string;
  private isConnected: boolean = false;

  constructor(baseUrl: string = 'http://localhost:5678') {
    this.n8nBaseUrl = baseUrl;
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('[N8N] Checking connection to n8n instance...');
      const response = await fetch(`${this.n8nBaseUrl}/rest/healthy`, {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('[N8N] ✅ Connected to n8n successfully');
        this.isConnected = true;
        return true;
      } else {
        console.log('[N8N] ❌ n8n instance not healthy');
        return false;
      }
    } catch (error: any) {
      console.log('[N8N] ❌ Failed to connect to n8n:', error?.message || 'Unknown error');
      return false;
    }
  }

  async createTaskWorkflow(task: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('n8n is not connected');
    }

    const workflowData = {
      name: `Task Automation: ${task.title}`,
      nodes: [
        {
          parameters: {},
          id: "start-node",
          name: "Start",
          type: "n8n-nodes-base.start",
          typeVersion: 1,
          position: [240, 300]
        },
        {
          parameters: {
            url: `http://localhost:5000/api/tasks/${task.id}/update`,
            requestMethod: "PUT",
            jsonParameters: true,
            parametersJson: JSON.stringify({
              status: "running",
              description: "Automated workflow started"
            })
          },
          id: "update-task",
          name: "Update Task Status",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [460, 300]
        },
        {
          parameters: {
            content: `Task "${task.title}" automation workflow has been started.`,
            options: {}
          },
          id: "notify-completion",
          name: "Notify Completion",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [680, 300]
        }
      ],
      connections: {
        "Start": {
          "main": [
            [
              {
                "node": "Update Task Status",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Update Task Status": {
          "main": [
            [
              {
                "node": "Notify Completion",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      active: true,
      settings: {
        executionOrder: "v1"
      },
      meta: {
        templateCredsSetupCompleted: true
      }
    };

    try {
      const response = await fetch(`${this.n8nBaseUrl}/rest/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      if (response.ok) {
        const workflow = await response.json();
        console.log(`[N8N] Created workflow for task: ${task.title}`);
        return workflow;
      } else {
        const error = await response.text();
        console.error('[N8N] Failed to create workflow:', error);
        throw new Error(`Failed to create workflow: ${error}`);
      }
    } catch (error) {
      console.error('[N8N] Workflow creation error:', error);
      throw error;
    }
  }

  async createLLMWorkflow(prompt: string, taskId?: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('n8n is not connected');
    }

    const workflowData = {
      name: `LLM Automation: ${prompt.slice(0, 50)}...`,
      nodes: [
        {
          parameters: {},
          id: "start-node",
          name: "Start",
          type: "n8n-nodes-base.start",
          typeVersion: 1,
          position: [240, 300]
        },
        {
          parameters: {
            model: "gpt-4o",
            messages: {
              "messageType": "singleMessage",
              "message": prompt
            },
            options: {
              "temperature": 0.7,
              "maxTokens": 1000
            }
          },
          id: "openai-llm",
          name: "OpenAI LLM",
          type: "n8n-nodes-base.openAi",
          typeVersion: 1,
          position: [460, 300]
        },
        {
          parameters: {
            url: `http://localhost:5000/api/llm-automation/result`,
            requestMethod: "POST",
            jsonParameters: true,
            parametersJson: JSON.stringify({
              taskId: taskId,
              prompt: prompt,
              result: "={{ $json.message.content }}"
            })
          },
          id: "save-result",
          name: "Save LLM Result",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [680, 300]
        }
      ],
      connections: {
        "Start": {
          "main": [
            [
              {
                "node": "OpenAI LLM",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "OpenAI LLM": {
          "main": [
            [
              {
                "node": "Save LLM Result",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      active: true,
      settings: {
        executionOrder: "v1"
      }
    };

    try {
      const response = await fetch(`${this.n8nBaseUrl}/rest/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      if (response.ok) {
        const workflow = await response.json();
        console.log(`[N8N] Created LLM workflow: ${prompt.slice(0, 50)}...`);
        return workflow;
      } else {
        const error = await response.text();
        console.error('[N8N] Failed to create LLM workflow:', error);
        throw new Error(`Failed to create LLM workflow: ${error}`);
      }
    } catch (error) {
      console.error('[N8N] LLM workflow creation error:', error);
      throw error;
    }
  }

  async getWorkflows(): Promise<any[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const response = await fetch(`${this.n8nBaseUrl}/rest/workflows`);
      if (response.ok) {
        const data: any = await response.json();
        return data.data || [];
      }
      return [];
    } catch (error: any) {
      console.error('[N8N] Failed to fetch workflows:', error?.message);
      return [];
    }
  }

  async executeWorkflow(workflowId: string, inputData?: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('n8n is not connected');
    }

    try {
      const response = await fetch(`${this.n8nBaseUrl}/rest/workflows/${workflowId}/activate`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log(`[N8N] Executed workflow: ${workflowId}`);
        return await response.json();
      } else {
        throw new Error(`Failed to execute workflow: ${workflowId}`);
      }
    } catch (error) {
      console.error('[N8N] Workflow execution error:', error);
      throw error;
    }
  }

  async getWorkflowExecutions(workflowId?: string): Promise<any[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const url = workflowId 
        ? `${this.n8nBaseUrl}/rest/executions?filter={"workflowId":"${workflowId}"}`
        : `${this.n8nBaseUrl}/rest/executions`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data: any = await response.json();
        return data.data || [];
      }
      return [];
    } catch (error: any) {
      console.error('[N8N] Failed to fetch executions:', error?.message);
      return [];
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

// Global instance
export const n8nService = new N8nIntegrationService();