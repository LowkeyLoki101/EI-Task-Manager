import OpenAI from "openai";
import { AiJobQueue, type AiJob } from "../lib/aiJobQueue";
import { CircuitBreaker } from "../lib/circuit";
import { computeBackoff, parseRetryAfter, classifyStatus } from "../lib/rateLimit";
import { KnowledgeBaseManager } from "../knowledge-base-manager";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export class AiWorker {
  private queue = new AiJobQueue();
  private breaker = new CircuitBreaker(5, 20_000);
  private isRunning = false;
  private kbManager: KnowledgeBaseManager;

  constructor() {
    this.kbManager = new KnowledgeBaseManager();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[AiWorker] Starting intelligent AI content worker...');
    this.processLoop();
  }

  stop() {
    this.isRunning = false;
  }

  private async processLoop() {
    while (this.isRunning) {
      try {
        const job = await this.queue.pick();
        if (job) {
          await this.handleJob(job);
        } else {
          // No jobs available, wait a bit
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('[AiWorker] Loop error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async handleJob(job: AiJob) {
    console.log(`[AiWorker] Processing job ${job.id} (${job.type})`);
    
    if (!this.breaker.canRequest()) {
      const delay = computeBackoff(job.attempts);
      await this.queue.fail(job.id, "circuit-breaker-open", delay);
      console.log(`[AiWorker] Circuit breaker open, delaying job ${job.id} by ${delay}ms`);
      return;
    }

    try {
      if (this.breaker.status().state === 'half-open') {
        this.breaker.markProbe();
      }

      const result = await this.executeJobByType(job);
      
      this.breaker.onSuccess();
      await this.queue.complete(job.id, result);
      console.log(`[AiWorker] Completed job ${job.id}`);

    } catch (error: any) {
      console.error(`[AiWorker] Job ${job.id} failed:`, error.message);
      
      const status = error?.status ?? error?.response?.status ?? 500;
      const headers = error?.response?.headers ?? {};
      const cls = classifyStatus(status);
      
      let delay = parseRetryAfter(headers) ?? computeBackoff(job.attempts);

      if (cls === 'client' && status !== 429) {
        // 4xx (not 429): no retry, permanent failure
        await this.queue.fail(job.id, `client-error:${status}:${error.message}`, 0);
        this.breaker.onFailure();
        return;
      }

      // Rate limit or server error: retry with delay
      this.breaker.onFailure();
      await this.queue.fail(job.id, `retry:${status}:${error.message}`, delay);
    }
  }

  private async executeJobByType(job: AiJob): Promise<any> {
    const payload = job.payload;

    switch (job.type) {
      case 'diary.entry':
        return await this.handleDiaryEntry(payload);
      
      case 'kb.ingest':
        return await this.handleKnowledgeBaseIngest(payload);
      
      case 'autopoietic.tick':
        return await this.handleAutopoieticTick(payload);
      
      case 'supervisor.analysis':
        return await this.handleSupervisorAnalysis(payload);
      
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  private async handleDiaryEntry(payload: any): Promise<any> {
    const { sessionId, mode, content, type } = payload;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are creating a ${mode} diary entry. Write a thoughtful, personal reflection that captures insights and learning. Keep it concise but meaningful.`
        },
        {
          role: "user",
          content: `Create a ${mode} diary entry based on: ${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const generatedContent = response.choices[0]?.message?.content || content;
    
    // Store in diary system
    return {
      content: generatedContent,
      timestamp: new Date(),
      sessionId,
      mode,
      type
    };
  }

  private async handleKnowledgeBaseIngest(payload: any): Promise<any> {
    const { title, content, type, sessionId, metadata } = payload;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are processing content for a knowledge base. Enhance and structure the content while preserving all important information. Add relevant tags and improve searchability."
        },
        {
          role: "user",
          content: `Process this ${type} content for knowledge base storage:\n\nTitle: ${title}\nContent: ${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const enhancedContent = response.choices[0]?.message?.content || content;
    
    // Store in knowledge base
    const entry = this.kbManager.addEntry({
      title,
      content: enhancedContent,
      type,
      sessionId,
      metadata: metadata || {}
    });

    return entry;
  }

  private async handleAutopoieticTick(payload: any): Promise<any> {
    const { sessionId } = payload;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an autonomous AI conducting self-directed thinking. Generate a thoughtful question about productivity, learning, or system improvement that drives further exploration."
        },
        {
          role: "user",
          content: "Generate an autonomous thinking cycle entry focused on system improvement and learning."
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    });

    const thinking = response.choices[0]?.message?.content || "System reflection cycle";
    
    return {
      thinking,
      sessionId,
      timestamp: new Date(),
      type: 'autonomous'
    };
  }

  private async handleSupervisorAnalysis(payload: any): Promise<any> {
    const { tasks, conversations } = payload;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are analyzing user patterns to suggest workflow improvements. Focus on actionable insights."
        },
        {
          role: "user",
          content: `Analyze these patterns and suggest improvements:\n\nTasks: ${JSON.stringify(tasks)}\nConversations: ${JSON.stringify(conversations)}`
        }
      ],
      temperature: 0.4,
      max_tokens: 600
    });

    const analysis = response.choices[0]?.message?.content || "No analysis available";
    
    return {
      analysis,
      timestamp: new Date(),
      suggestions: []
    };
  }

  async enqueueJob(type: string, payload: any, priority: number = 5): Promise<string> {
    return await this.queue.enqueue(type, payload, { priority });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      breaker: this.breaker.status(),
    };
  }

  async getQueueStats() {
    return await this.queue.getStats();
  }
}

// Global worker instance
export const aiWorker = new AiWorker();