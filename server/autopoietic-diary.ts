import { KnowledgeBaseSystem } from "./knowledge-base-system";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

export class AutopoieticDiary {
  private kbSystem: KnowledgeBaseSystem;
  private sessionId: string;
  private activeLoopInterval: NodeJS.Timeout | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.kbSystem = new KnowledgeBaseSystem(sessionId);
  }

  // Main autonomous loop - runs periodically
  async startAutonomousLoop(intervalMinutes: number = 30): Promise<void> {
    if (this.activeLoopInterval) {
      clearInterval(this.activeLoopInterval);
    }

    console.log(`[AutopoieticDiary] Starting autonomous loop (${intervalMinutes}min intervals) for session ${this.sessionId}`);

    // Run immediately, then set interval
    await this.runThinkingCycle();

    this.activeLoopInterval = setInterval(async () => {
      try {
        await this.runThinkingCycle();
      } catch (error) {
        console.error('[AutopoieticDiary] Error in thinking cycle:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  stopAutonomousLoop(): void {
    if (this.activeLoopInterval) {
      clearInterval(this.activeLoopInterval);
      this.activeLoopInterval = null;
      console.log('[AutopoieticDiary] Stopped autonomous loop');
    }
  }

  // Core thinking cycle
  async runThinkingCycle(): Promise<{
    trigger: string;
    lensSession: any;
    generatedTasks: number;
    generatedKbEntries: number;
    researchInitiated: number;
  }> {
    console.log('[AutopoieticDiary] Starting thinking cycle...');

    try {
      // 1. Get a random self-question trigger
      const selfQuestion = await this.kbSystem.getRandomSelfQuestion();
      const trigger = selfQuestion?.text || "What should I be thinking about right now?";

      console.log(`[AutopoieticDiary] Trigger: "${trigger}"`);

      // 2. Process through Colby-style lens
      const lensSession = await this.kbSystem.processWithColbyLens(trigger);

      // 3. Execute generated research topics
      let researchCount = 0;
      if (lensSession.generatedResearch && lensSession.generatedResearch.length > 0) {
        for (const topic of lensSession.generatedResearch.slice(0, 2)) { // Limit to 2 research topics
          try {
            await this.conductResearch(topic);
            researchCount++;
          } catch (error) {
            console.error(`[AutopoieticDiary] Research failed for topic "${topic}":`, error);
          }
        }
      }

      // 4. Check task limits before creating new tasks
      const { TaskCompletionSystem } = await import('./task-completion-system');
      const taskSystem = new TaskCompletionSystem(this.sessionId);
      const limitCheck = await taskSystem.shouldBlockTaskCreation();
      
      let taskCount = 0;
      if (limitCheck.blocked) {
        console.log(`[AutopoieticDiary] Task creation blocked: ${limitCheck.reason}`);
        console.log(`[AutopoieticDiary] Incomplete tasks: ${limitCheck.incompleteTasks}`);
        
        // Focus on existing incomplete tasks instead of creating new ones
        const incompleteTasks = await taskSystem.getIncompleteTasks();
        if (incompleteTasks.length > 0) {
          const randomTask = incompleteTasks[Math.floor(Math.random() * incompleteTasks.length)];
          await taskSystem.focusAIOnTask(randomTask.id, 
            `Complete this task based on autopoietic thinking cycle: "${trigger}"`);
          console.log(`[AutopoieticDiary] Focused AI on existing task: ${randomTask.title}`);
        }
      } else if (lensSession.generatedTasks && lensSession.generatedTasks.length > 0) {
        // Only create tasks if under limit
        const maxNewTasks = Math.min(2, 5 - limitCheck.incompleteTasks); // Stay under 5 total
        
        for (const taskTitle of lensSession.generatedTasks.slice(0, maxNewTasks)) {
          try {
            const task = await storage.createTask({
              sessionId: this.sessionId,
              title: taskTitle,
              context: "computer",
              timeWindow: "any",
              status: "today",
              tags: ["autopoietic", "diary-generated"],
              category: "ai-generated",
              priority: "medium",
              description: `Generated from autopoietic thinking: "${trigger}"`
            });
            
            // Initialize task with completion system
            await taskSystem.initializeTaskProgress(task.id);
            taskCount++;
            console.log(`[AutopoieticDiary] Created task with completion tracking: "${taskTitle}"`);
          } catch (error) {
            console.error(`[AutopoieticDiary] Failed to create task "${taskTitle}":`, error);
          }
        }
      }

      // 5. Create knowledge base entries from generated topics
      let kbCount = 0;
      if (lensSession.generatedKbEntries && lensSession.generatedKbEntries.length > 0) {
        for (const kbTopic of lensSession.generatedKbEntries) {
          try {
            // Report KB creation activity
            await this.reportInsightActivity({
              type: 'kb_creation',
              status: 'active',
              description: `Creating KB entry: ${kbTopic}`,
              progress: 0
            });

            await this.kbSystem.createKbEntry({
              sessionId: this.sessionId,
              source: "diary",
              topic: kbTopic,
              content: `Generated from lens processing: ${lensSession.closureStep}`,
              tags: ["autopoietic", "lens-generated"],
              metadata: {
                lensSessionId: lensSession.id,
                trigger: trigger,
                generationTimestamp: new Date().toISOString(),
              }
            });
            kbCount++;
            
            // Report completed KB creation
            await this.reportInsightActivity({
              type: 'kb_creation',
              status: 'completed',
              description: `KB entry created: ${kbTopic}`,
              progress: 100
            });

            console.log(`[AutopoieticDiary] Created KB entry: "${kbTopic}"`);
          } catch (error) {
            console.error(`[AutopoieticDiary] Failed to create KB entry "${kbTopic}":`, error);
          }
        }
      }

      // 6. Save diary entry with lens processing results
      await this.saveDiaryEntry(trigger, lensSession, {
        tasksGenerated: taskCount,
        kbEntriesGenerated: kbCount,
        researchConducted: researchCount,
      });

      // 7. Periodically evolve self-questions (10% chance each cycle)
      if (Math.random() < 0.1) {
        await this.kbSystem.evolveSelfQuestions();
      }

      console.log(`[AutopoieticDiary] Cycle complete - Tasks: ${taskCount}, KB: ${kbCount}, Research: ${researchCount}`);

      return {
        trigger,
        lensSession,
        generatedTasks: taskCount,
        generatedKbEntries: kbCount,
        researchInitiated: researchCount,
      };

    } catch (error) {
      console.error('[AutopoieticDiary] Thinking cycle error:', error);
      throw error;
    }
  }

  // Research integration
  private async conductResearch(topic: string): Promise<void> {
    console.log(`[AutopoieticDiary] Conducting research on: "${topic}"`);

    try {
      // Note: Web search would be integrated here
      // For now, we'll create a placeholder research entry
      
      const researchContent = await this.generateResearchPlaceholder(topic);
      
      await this.kbSystem.createKbEntry({
        sessionId: this.sessionId,
        source: "research",
        topic: `Research: ${topic}`,
        content: researchContent,
        tags: ["research", "autopoietic"],
        metadata: {
          researchQuery: topic,
          conductedAt: new Date().toISOString(),
          method: "ai-analysis", // Will be "web-search" when integrated
        }
      });

      console.log(`[AutopoieticDiary] Research completed and stored for: "${topic}"`);

    } catch (error) {
      console.error(`[AutopoieticDiary] Research error for "${topic}":`, error);
      throw error;
    }
  }

  private async generateResearchPlaceholder(topic: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are conducting research analysis on a topic. Provide a structured research summary that includes:

1. Key findings or insights
2. Market relevance (especially for solar/AI/energy sectors)
3. Actionable implications
4. Questions for further investigation

Keep it concise but comprehensive (300-400 words).`
          },
          {
            role: "user",
            content: `Research topic: ${topic}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0].message.content || `Research analysis pending for topic: ${topic}`;

    } catch (error) {
      console.error('[AutopoieticDiary] Error generating research placeholder:', error);
      return `Research placeholder for: ${topic}. Analysis to be conducted.`;
    }
  }

  // Save diary entry with lens processing
  private async saveDiaryEntry(trigger: string, lensSession: any, stats: any): Promise<void> {
    try {
      const diaryContent = this.formatDiaryEntry(trigger, lensSession, stats);
      
      await storage.createMessage({
        sessionId: this.sessionId,
        content: `Autonomous thinking cycle triggered by: "${trigger}"\n\n${diaryContent}`,
        role: "assistant"
      });

      // Also add to knowledge base for RAG integration
      try {
        const { knowledgeBaseManager } = await import("./knowledge-base-manager");
        await knowledgeBaseManager.addEntry({
          title: `AI Diary: ${trigger}`,
          content: diaryContent,
          type: 'conversation',
          sessionId: this.sessionId,
          metadata: {
            tags: ["ai-diary", "autopoietic", "thinking", trigger.toLowerCase().replace(/\s+/g, '-')],
            category: "AI Autonomous Thinking",
            source: "autopoietic_diary",
            priority: "medium"
          }
        });
        console.log(`[AutopoieticDiary] Added to knowledge base for trigger: "${trigger}"`);
      } catch (error) {
        console.error('[AutopoieticDiary] Error adding to knowledge base:', error);
      }

      console.log(`[AutopoieticDiary] Saved diary entry for trigger: "${trigger}"`);

    } catch (error) {
      console.error('[AutopoieticDiary] Error saving diary entry:', error);
    }
  }

  // Report insight activity for progress tracking
  private async reportInsightActivity(activity: {
    type: 'research' | 'kb_creation' | 'task_generation' | 'lens_processing';
    status: 'active' | 'completed' | 'failed';
    description: string;
    progress?: number;
  }): Promise<void> {
    try {
      await fetch('http://localhost:5000/api/insights/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity)
      });
    } catch (error) {
      // Fail silently to not disrupt main operations
      console.warn('[AutopoieticDiary] Failed to report activity:', error);
    }
  }

  private formatDiaryEntry(trigger: string, lensSession: any, stats: any): string {
    return `# Autonomous Thinking Session

**Trigger:** ${trigger}

## Lens Processing Results

**Frame:** ${lensSession.frameStep || 'N/A'}

**Reframe:** ${lensSession.reframeStep || 'N/A'}

**Meta-Lens:** ${lensSession.metaLensStep || 'N/A'}

**Recursive Exploration:** ${lensSession.recursiveStep || 'N/A'}

**Closure:** ${lensSession.closureStep || 'N/A'}

## Generated Outputs

- **Tasks Created:** ${stats.tasksGenerated}
- **Knowledge Entries:** ${stats.kbEntriesGenerated}
- **Research Conducted:** ${stats.researchConducted}

## Research Topics
${lensSession.generatedResearch?.map((topic: string) => `- ${topic}`).join('\n') || 'None'}

## Generated Tasks
${lensSession.generatedTasks?.map((task: string) => `- ${task}`).join('\n') || 'None'}

## Knowledge Base Topics  
${lensSession.generatedKbEntries?.map((entry: string) => `- ${entry}`).join('\n') || 'None'}

---
*Session completed: ${new Date().toISOString()}*`;
  }

  // Manual trigger for testing
  async manualThinkingCycle(customTrigger?: string): Promise<any> {
    const selfQuestion = await this.kbSystem.getRandomSelfQuestion();
    const originalTrigger = customTrigger || selfQuestion?.text || "Manual thinking trigger";
    return await this.runThinkingCycle();
  }

  // Get system status
  async getStatus(): Promise<{
    isRunning: boolean;
    sessionId: string;
    kbEntries: number;
    selfQuestions: number;
    lastCycle?: string;
  }> {
    const kbEntries = await this.kbSystem.listKbEntries();
    const selfQuestions = await this.kbSystem.getSelfQuestions();

    return {
      isRunning: this.activeLoopInterval !== null,
      sessionId: this.sessionId,
      kbEntries: kbEntries.length,
      selfQuestions: selfQuestions.filter(q => !q.retired).length,
      lastCycle: "N/A", // Could track this if needed
    };
  }
}

// Global instances per session
const activeDiaries = new Map<string, AutopoieticDiary>();

export function getAutopoieticDiary(sessionId: string): AutopoieticDiary {
  if (!activeDiaries.has(sessionId)) {
    activeDiaries.set(sessionId, new AutopoieticDiary(sessionId));
  }
  return activeDiaries.get(sessionId)!;
}

export function stopAllDiaries(): void {
  activeDiaries.forEach(diary => {
    diary.stopAutonomousLoop();
  });
  activeDiaries.clear();
}