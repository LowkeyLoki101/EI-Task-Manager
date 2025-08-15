/**
 * Microservice Network Integration Routes
 * Enables cross-service communication and AI agent delegation
 */

import type { Express } from "express";
import { MicroserviceConnector, connectToTaskManager, connectToTaskPilot, delegateToAgent, accessResearch, storeInMemory } from "./microservice-connector";

let microserviceConnector: MicroserviceConnector;

export function registerMicroserviceRoutes(app: Express, connector: MicroserviceConnector) {
  microserviceConnector = connector;

  // Enhanced task processing with cross-service AI delegation
  app.post('/api/enhanced-processing', async (req, res) => {
    try {
      const { query, data, taskType } = req.body;

      // Get AI agents for task delegation
      const agents = await connectToTaskManager(connector);
      
      // Access research if needed
      const researchData = query ? await accessResearch(connector, query) : null;
      
      // Delegate complex analysis to appropriate agent
      let analysis = null;
      if (agents.length > 0) {
        const agentId = taskType === 'code' ? 'code-analyst-001' : 'general-assistant-001';
        analysis = await delegateToAgent(connector, agentId, {
          type: taskType || 'analysis',
          data: data,
          research_context: researchData
        });
      }
      
      // Store results for future reference
      if (analysis) {
        await storeInMemory(connector, {
          request: req.body,
          analysis: analysis,
          timestamp: new Date().toISOString()
        }, 'processing_results');
      }
      
      res.json({
        success: true,
        analysis: analysis,
        research: researchData,
        available_agents: agents.length,
        service_name: connector['serviceName']
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Processing failed'
      });
    }
  });

  // Smart task coordination endpoint
  app.post('/api/coordinate-task', async (req, res) => {
    try {
      const { projectGoal, requirements } = req.body;

      // Get available AI workforce
      const agents = await connectToTaskManager(connector);
      
      // Research best practices
      const research = projectGoal ? await accessResearch(connector, `${projectGoal} implementation guide`) : null;
      
      // Create comprehensive plan
      const plan = {
        goal: projectGoal,
        requirements: requirements || [],
        available_agents: agents.map((a: any) => ({ 
          id: a.id, 
          capabilities: a.config?.capabilities || ['general'] 
        })),
        research_insights: research,
        recommended_approach: 'AI-coordinated development',
        created_at: new Date().toISOString()
      };
      
      // Store plan for tracking
      await storeInMemory(connector, plan, 'project_plans');
      
      res.json({
        success: true,
        plan: plan,
        next_steps: [
          'Review available agents and their capabilities',
          'Delegate specific tasks to appropriate agents',
          'Monitor progress and coordinate between agents',
          'Integrate results from multiple agents'
        ]
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Coordination failed'
      });
    }
  });

  // Cross-service knowledge sharing
  app.post('/api/share-knowledge', async (req, res) => {
    try {
      const { knowledge, context, tags } = req.body;

      const sharedData = {
        knowledge: knowledge,
        context: context || 'general',
        tags: tags || [],
        source_service: connector['serviceName'],
        shared_at: new Date().toISOString()
      };

      await storeInMemory(connector, sharedData, 'shared_knowledge');

      res.json({
        success: true,
        message: 'Knowledge shared successfully',
        data: sharedData
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Knowledge sharing failed'
      });
    }
  });

  // Access shared knowledge from other services
  app.get('/api/shared-knowledge', async (req, res) => {
    try {
      const { context, tags } = req.query;

      // This would typically query the shared memory system
      // For now, return a placeholder response
      res.json({
        success: true,
        knowledge: [],
        message: 'Shared knowledge access - implementation pending'
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Knowledge access failed'
      });
    }
  });

  // Service discovery and capability mapping
  app.get('/api/network-capabilities', async (req, res) => {
    try {
      const services = await connector.getAvailableServices();
      
      const capabilities = await Promise.all(
        services.map(async (service: any) => {
          try {
            const health: any = await connector.callService(service.name, '/api/health');
            return {
              name: service.name,
              capabilities: health?.capabilities || [],
              features: health?.features || {},
              status: service.status
            };
          } catch {
            return {
              name: service.name,
              capabilities: [],
              features: {},
              status: 'unavailable'
            };
          }
        })
      );

      res.json({
        success: true,
        network_capabilities: capabilities,
        total_services: services.length
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Capability discovery failed'
      });
    }
  });
}

export { microserviceConnector };