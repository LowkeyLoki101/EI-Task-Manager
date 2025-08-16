import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import type { 
  KnowledgeEntry, InsertKnowledgeEntry, 
  SelfQuestion, InsertSelfQuestion,
  LensProcessingSession, InsertLensProcessingSession,
  CreateKbEntryRequest, TriggerLensProcessingRequest
} from "@shared/kb-schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

// Colby-Style Lens Template
export const COLBY_LENS_STEPS = [
  {
    name: "frame",
    prompt: "Frame the problem or idea directly. What do you see? State it clearly without overthinking.",
  },
  {
    name: "reframe", 
    prompt: "Now reframe it from a completely different perspective. What if you looked at this from another angle? What changes?",
  },
  {
    name: "meta_lens",
    prompt: "Step back with a meta-lens: Why are you thinking about this right now? What pattern are you repeating in how you approach this?",
  },
  {
    name: "recursive",
    prompt: "Recursive exploration: What new questions or topics emerge from this? What deserves deeper research or investigation?",
  },
  {
    name: "closure",
    prompt: "Closure (for now): What's your working hypothesis or next step? What action will you take?",
  },
];

// Default Self-Question Pool
export const DEFAULT_SELF_QUESTIONS = [
  "What's a question I haven't asked myself in a while?",
  "What would surprise me if I found it?",
  "If I wanted to make marketing content today, what story hook would I use?",
  "What simulation could I run to create new data for us?",
  "What problem am I avoiding thinking about?",
  "If I shuffled my own prompts, what new ones emerge?",
  "What's happening in my industry that I should be paying attention to?",
  "What assumption am I making that might be wrong?",
  "What would happen if I approached this problem backwards?",
  "What pattern do I keep seeing that others might be missing?",
];

export class KnowledgeBaseSystem {
  private kbDir: string;
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.kbDir = join(process.cwd(), "data", "kb", sessionId);
    
    // Ensure KB directory exists
    if (!existsSync(this.kbDir)) {
      mkdirSync(this.kbDir, { recursive: true });
    }
  }

  // Knowledge Base Operations
  async createKbEntry(entry: CreateKbEntryRequest): Promise<KnowledgeEntry> {
    const id = randomUUID();
    const kbEntry: KnowledgeEntry = {
      id,
      sessionId: entry.sessionId,
      timestamp: new Date(),
      source: entry.source,
      topic: entry.topic,
      content: entry.content,
      tags: entry.tags || [],
      derivedTasks: entry.derivedTasks || [],
      metadata: entry.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to file system
    const filePath = join(this.kbDir, `${id}.json`);
    writeFileSync(filePath, JSON.stringify(kbEntry, null, 2));

    console.log(`[KnowledgeBase] Created entry: ${entry.topic} (${id})`);
    return kbEntry;
  }

  async getKbEntry(id: string): Promise<KnowledgeEntry | null> {
    const filePath = join(this.kbDir, `${id}.json`);
    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as KnowledgeEntry;
    } catch (error) {
      console.error('[KnowledgeBase] Error reading entry:', error);
      return null;
    }
  }

  async listKbEntries(filters?: { source?: string; tags?: string[]; limit?: number }): Promise<KnowledgeEntry[]> {
    try {
      const files = require('fs').readdirSync(this.kbDir).filter((f: string) => f.endsWith('.json'));
      const entries: KnowledgeEntry[] = [];

      for (const file of files) {
        const content = readFileSync(join(this.kbDir, file), 'utf-8');
        const entry = JSON.parse(content) as KnowledgeEntry;
        
        // Apply filters
        if (filters?.source && entry.source !== filters.source) continue;
        if (filters?.tags && entry.tags && !filters.tags.some(tag => entry.tags.includes(tag))) continue;

        entries.push(entry);
      }

      // Sort by timestamp, newest first
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return filters?.limit ? entries.slice(0, filters.limit) : entries;
    } catch (error) {
      console.error('[KnowledgeBase] Error listing entries:', error);
      return [];
    }
  }

  // Self-Question Pool Operations
  async getSelfQuestions(): Promise<SelfQuestion[]> {
    const questionsPath = join(this.kbDir, 'self-questions.json');
    
    if (!existsSync(questionsPath)) {
      // Initialize with default questions
      const defaultQuestions: SelfQuestion[] = DEFAULT_SELF_QUESTIONS.map(text => ({
        id: randomUUID(),
        sessionId: this.sessionId,
        text,
        category: "general",
        useCount: "0",
        lastUsed: null,
        effectiveness: "5",
        created: new Date(),
        retired: null,
      }));

      writeFileSync(questionsPath, JSON.stringify(defaultQuestions, null, 2));
      return defaultQuestions;
    }

    try {
      const content = readFileSync(questionsPath, 'utf-8');
      return JSON.parse(content) as SelfQuestion[];
    } catch (error) {
      console.error('[KnowledgeBase] Error loading self-questions:', error);
      return [];
    }
  }

  async updateSelfQuestion(id: string, updates: Partial<SelfQuestion>): Promise<void> {
    const questions = await this.getSelfQuestions();
    const index = questions.findIndex(q => q.id === id);
    
    if (index !== -1) {
      questions[index] = { ...questions[index], ...updates };
      const questionsPath = join(this.kbDir, 'self-questions.json');
      writeFileSync(questionsPath, JSON.stringify(questions, null, 2));
    }
  }

  async getRandomSelfQuestion(): Promise<SelfQuestion | null> {
    const questions = await this.getSelfQuestions();
    const activeQuestions = questions.filter(q => !q.retired);
    
    if (activeQuestions.length === 0) return null;

    // Weight by effectiveness and recency (prefer less recently used)
    const weighted = activeQuestions.map(q => {
      const effectivenessScore = parseInt(q.effectiveness || '5') || 5;
      const daysSinceUsed = q.lastUsed ? 
        (Date.now() - new Date(q.lastUsed).getTime()) / (1000 * 60 * 60 * 24) : 30;
      
      return {
        question: q,
        weight: effectivenessScore * Math.min(daysSinceUsed, 10) // Cap at 10 days
      };
    });

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const item of weighted) {
      currentWeight += item.weight;
      if (random <= currentWeight) {
        // Update usage stats
        await this.updateSelfQuestion(item.question.id, {
          useCount: (parseInt(item.question.useCount || '0') + 1).toString(),
          lastUsed: new Date(),
        });
        return item.question;
      }
    }

    return activeQuestions[0]; // Fallback
  }

  // Colby-Style Lens Processing
  async processWithColbyLens(trigger: string): Promise<LensProcessingSession> {
    const sessionId = randomUUID();
    const session: LensProcessingSession = {
      id: sessionId,
      sessionId: this.sessionId,
      trigger,
      frameStep: null,
      reframeStep: null,
      metaLensStep: null,
      recursiveStep: null,
      closureStep: null,
      generatedTasks: [],
      generatedKbEntries: [],
      generatedResearch: [],
      completed: null,
      createdAt: new Date(),
    };

    console.log(`[ColbyLens] Starting lens processing with trigger: "${trigger}"`);

    try {
      // Process each lens step
      for (const step of COLBY_LENS_STEPS) {
        const stepResult = await this.processLensStep(trigger, step, session);
        (session as any)[`${step.name}Step`] = stepResult;
        
        console.log(`[ColbyLens] Completed ${step.name}: ${stepResult.slice(0, 100)}...`);

        // Check for research triggers in recursive step
        if (step.name === "recursive") {
          const researchTopics = await this.extractResearchTopics(stepResult);
          session.generatedResearch = researchTopics;
        }
      }

      // Generate actionable outputs
      const outputs = await this.generateActionableOutputs(session);
      session.generatedTasks = outputs.tasks;
      session.generatedKbEntries = outputs.kbEntries;
      session.completed = new Date();

      // Save session
      const sessionPath = join(this.kbDir, `lens-session-${sessionId}.json`);
      writeFileSync(sessionPath, JSON.stringify(session, null, 2));

      console.log(`[ColbyLens] Completed lens processing session: ${sessionId}`);
      return session;

    } catch (error) {
      console.error('[ColbyLens] Error processing lens:', error);
      throw error;
    }
  }

  private async processLensStep(trigger: string, step: any, session: LensProcessingSession): Promise<string> {
    const context = {
      trigger,
      previousSteps: {
        frame: session.frameStep,
        reframe: session.reframeStep,
        metaLens: session.metaLensStep,
        recursive: session.recursiveStep,
      }
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are processing a thought using Colby's thinking methodology. Current step: ${step.name}.

${step.prompt}

Context from previous steps: ${JSON.stringify(context, null, 2)}

Respond with 2-3 sentences that directly address the step prompt. Be specific and actionable.`
        },
        {
          role: "user",
          content: `Original trigger: "${trigger}"\n\nApply the ${step.name} lens to this trigger.`
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0].message.content || `No response for ${step.name}`;
  }

  private async extractResearchTopics(recursiveStep: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Extract specific research topics or questions from this recursive exploration step. Return only topics that would benefit from web search or investigation.

Format as JSON array of strings. Maximum 3 topics. Examples:
["solar adoption in churches Texas", "DC heat pump rebates Houston", "grid resilience community hubs"]`
          },
          {
            role: "user",
            content: recursiveStep
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || "[]";
      return JSON.parse(content) as string[];
    } catch (error) {
      console.error('[ColbyLens] Error extracting research topics:', error);
      return [];
    }
  }

  private async generateActionableOutputs(session: LensProcessingSession): Promise<{tasks: string[], kbEntries: string[]}> {
    const fullContext = {
      trigger: session.trigger,
      frame: session.frameStep,
      reframe: session.reframeStep,
      metaLens: session.metaLensStep,
      recursive: session.recursiveStep,
      closure: session.closureStep,
      research: session.generatedResearch,
    };

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Based on this completed lens processing session, generate specific actionable outputs:

1. Tasks - concrete work items that should be created (e.g., "Draft blog post on...", "Research customer objections to...", "Create FAQ document for...")
2. Knowledge Base entries - topics that should be documented (e.g., "Church solar rebate programs by state", "Heat pump ROI calculations")

Return JSON format:
{
  "tasks": ["task 1", "task 2"],
  "kbEntries": ["kb topic 1", "kb topic 2"]  
}

Maximum 3 items each. Focus on business-relevant outputs for solar/AI/energy sectors.`
          },
          {
            role: "user",
            content: JSON.stringify(fullContext, null, 2)
          }
        ],
        max_tokens: 400,
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || '{"tasks": [], "kbEntries": []}';
      return JSON.parse(content);
    } catch (error) {
      console.error('[ColbyLens] Error generating outputs:', error);
      return { tasks: [], kbEntries: [] };
    }
  }

  // Self-Question Evolution
  async evolveSelfQuestions(): Promise<void> {
    const questions = await this.getSelfQuestions();
    const activeQuestions = questions.filter(q => !q.retired);
    
    if (activeQuestions.length < 5) return; // Don't evolve if too few questions

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are evolving a self-question pool for an autonomous thinking agent. 

Current questions: ${JSON.stringify(activeQuestions.map(q => q.text), null, 2)}

Create 2-3 new variations by:
1. Combining existing questions in new ways
2. Adding deeper perspectives 
3. Introducing new angles relevant to business/solar/AI/energy

Return JSON array of new question strings. Focus on questions that would trigger valuable thinking sessions.`
          },
          {
            role: "user",
            content: "Generate evolved self-questions"
          }
        ],
        max_tokens: 300,
        temperature: 0.8,
      });

      const content = response.choices[0].message.content || "[]";
      const newQuestions = JSON.parse(content) as string[];

      // Add new questions to pool
      for (const text of newQuestions) {
        const question: SelfQuestion = {
          id: randomUUID(),
          sessionId: this.sessionId,
          text,
          category: "evolved",
          useCount: "0",
          lastUsed: null,
          effectiveness: "5",
          created: new Date(),
          retired: null,
        };
        questions.push(question);
      }

      // Retire oldest low-performing questions if pool is too large
      if (questions.length > 20) {
        const lowPerforming = activeQuestions
          .filter(q => parseInt(q.effectiveness || '5') < 4 && parseInt(q.useCount || '0') > 3)
          .sort((a, b) => parseInt(a.effectiveness || '5') - parseInt(b.effectiveness || '5'))
          .slice(0, Math.floor(questions.length - 15));

        for (const q of lowPerforming) {
          await this.updateSelfQuestion(q.id, { retired: new Date() });
        }
      }

      // Save updated questions
      const questionsPath = join(this.kbDir, 'self-questions.json');
      writeFileSync(questionsPath, JSON.stringify(questions, null, 2));

      console.log(`[KnowledgeBase] Evolved self-questions: added ${newQuestions.length}, retired ${questions.length > 20 ? Math.floor(questions.length - 15) : 0}`);
    } catch (error) {
      console.error('[KnowledgeBase] Error evolving questions:', error);
    }
  }
}