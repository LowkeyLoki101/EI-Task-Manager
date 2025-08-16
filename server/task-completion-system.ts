import { storage } from "./storage";
import { KnowledgeBaseSystem } from "./knowledge-base-system";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

export interface TaskCompletionStage {
  stage: 'research' | 'planning' | 'execution' | 'knowledge' | 'publication';
  completed: boolean;
  notes: string;
  completedAt?: Date;
  aiThinking?: string;
}

export interface TaskProgress {
  taskId: string;
  sessionId: string;
  stages: Record<string, TaskCompletionStage>;
  overallCompletion: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskCompletionSystem {
  private kbSystem: KnowledgeBaseSystem;
  private sessionId: string;
  private taskLimit: number = 5; // Maximum tasks before forcing completion

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.kbSystem = new KnowledgeBaseSystem(sessionId);
  }

  /**
   * Check if task creation should be blocked due to incomplete tasks
   */
  async shouldBlockTaskCreation(): Promise<{ blocked: boolean; reason?: string; incompleteTasks: number }> {
    const incompleteTasks = await this.getIncompleteTasks();
    
    if (incompleteTasks.length >= this.taskLimit) {
      return {
        blocked: true,
        reason: `Task limit reached. Complete ${incompleteTasks.length} existing tasks before creating new ones.`,
        incompleteTasks: incompleteTasks.length
      };
    }

    return { blocked: false, incompleteTasks: incompleteTasks.length };
  }

  /**
   * Get all incomplete tasks for the session
   */
  async getIncompleteTasks() {
    const tasks = await storage.getTasksBySessionId(this.sessionId);
    return tasks.filter(task => 
      task.status !== 'done' && 
      (task.tags?.includes('autopoietic') || task.tags?.includes('diary-generated'))
    );
  }

  /**
   * Initialize task progress tracking
   */
  async initializeTaskProgress(taskId: string): Promise<TaskProgress> {
    const defaultStages: Record<string, TaskCompletionStage> = {
      research: { stage: 'research', completed: false, notes: '' },
      planning: { stage: 'planning', completed: false, notes: '' },
      execution: { stage: 'execution', completed: false, notes: '' },
      knowledge: { stage: 'knowledge', completed: false, notes: '' },
      publication: { stage: 'publication', completed: false, notes: '' }
    };

    const progress: TaskProgress = {
      taskId,
      sessionId: this.sessionId,
      stages: defaultStages,
      overallCompletion: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveTaskProgress(progress);
    return progress;
  }

  /**
   * Get task progress
   */
  async getTaskProgress(taskId: string): Promise<TaskProgress | null> {
    try {
      const stored = await storage.getMemory(this.sessionId, 'task_progress', taskId);
      return stored as TaskProgress || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Complete a stage of a task
   */
  async completeStage(taskId: string, stage: string, notes: string, aiThinking?: string): Promise<TaskProgress> {
    let progress = await this.getTaskProgress(taskId);
    
    if (!progress) {
      progress = await this.initializeTaskProgress(taskId);
    }

    // Mark stage as completed
    progress.stages[stage] = {
      ...progress.stages[stage],
      completed: true,
      notes,
      aiThinking,
      completedAt: new Date()
    };

    // Calculate overall completion
    const completedStages = Object.values(progress.stages).filter(s => s.completed).length;
    progress.overallCompletion = Math.round((completedStages / Object.keys(progress.stages).length) * 100);
    progress.updatedAt = new Date();

    await this.saveTaskProgress(progress);

    // If task is fully completed, move to knowledge base and mark as done
    if (progress.overallCompletion === 100) {
      await this.finalizeTask(taskId);
    }

    return progress;
  }

  /**
   * Finalize a completed task by moving it to knowledge base and marking as done
   */
  async finalizeTask(taskId: string): Promise<void> {
    try {
      const task = await storage.getTask(taskId);
      if (!task) return;

      const progress = await this.getTaskProgress(taskId);
      if (!progress) return;

      // Create comprehensive knowledge base entry
      const kbContent = await this.generateKnowledgeBaseEntry(task, progress);
      
      await this.kbSystem.createEntry({
        title: `Completed Task: ${task.title}`,
        content: kbContent,
        tags: [...(task.tags || []), 'completed-task', 'auto-generated'],
        type: 'task-completion',
        metadata: {
          originalTaskId: taskId,
          completionDate: new Date().toISOString(),
          stages: Object.keys(progress.stages).filter(stage => progress.stages[stage].completed),
          category: task.category,
          priority: task.priority
        }
      });

      // Create diary entry with narrative voice
      const narrativeEntry = await this.generateNarrativeDiaryEntry(task, progress);
      
      await storage.createDiaryEntry({
        sessionId: this.sessionId,
        content: narrativeEntry,
        context: "task-completion",
        mode: "ai",
        metadata: {
          taskId,
          completionType: "full",
          stagesCompleted: Object.keys(progress.stages).length
        }
      });

      // Mark task as done
      await storage.updateTask(taskId, { 
        status: 'done',
        notes: `Completed through systematic 5-stage process: ${Object.keys(progress.stages).join(' → ')}`
      });

      console.log(`[TaskCompletion] Task ${taskId} finalized and converted to knowledge`);
      
    } catch (error) {
      console.error('[TaskCompletion] Error finalizing task:', error);
    }
  }

  /**
   * Generate comprehensive knowledge base entry from completed task
   */
  async generateKnowledgeBaseEntry(task: any, progress: TaskProgress): Promise<string> {
    try {
      const prompt = `Based on the completed task and its progression through 5 stages, create a comprehensive knowledge base entry.

Task Details:
- Title: ${task.title}
- Description: ${task.description || 'No description provided'}
- Category: ${task.category}
- Priority: ${task.priority}

Completion Stages:
${Object.entries(progress.stages).map(([stage, data]) => 
  `${stage.toUpperCase()}: ${data.completed ? 'COMPLETED' : 'INCOMPLETE'}
  Notes: ${data.notes || 'No notes'}
  ${data.aiThinking ? `AI Thinking: ${data.aiThinking}` : ''}`
).join('\n\n')}

Create a structured knowledge entry that includes:
1. Executive Summary
2. Key Insights and Learnings  
3. Process Documentation
4. Outcomes and Results
5. Future Applications
6. Related Concepts

Format as clear, actionable knowledge that can inform future similar tasks.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      });

      return response.choices[0].message.content || "Knowledge entry could not be generated.";
      
    } catch (error) {
      console.error('[TaskCompletion] Error generating KB entry:', error);
      return `Task Completion Record: ${task.title}

This task was completed through a 5-stage systematic process. The completion data has been preserved for future reference.

Stages completed: ${Object.keys(progress.stages).filter(stage => progress.stages[stage].completed).join(', ')}`;
    }
  }

  /**
   * Generate narrative diary entry with voice
   */
  async generateNarrativeDiaryEntry(task: any, progress: TaskProgress): Promise<string> {
    try {
      const prompt = `Write a first-person narrative diary entry about completing this task. Write as if you (the AI) are reflecting on the work done.

Task: ${task.title}
Context: ${task.description || 'Autonomous task execution'}

Stages Completed:
${Object.entries(progress.stages).filter(([_, data]) => data.completed).map(([stage, data]) => 
  `${stage}: ${data.notes || 'Completed successfully'}`
).join('\n')}

Write in a reflective, narrative style that captures:
- Your thought process during the work
- Challenges encountered and how you solved them  
- What you learned from this task
- How it connects to broader patterns in your work
- What questions or ideas it sparked for future exploration

Keep it conversational and insightful, as if speaking to yourself in a diary.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", 
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 800
      });

      return response.choices[0].message.content || `Completed task: ${task.title}. This work contributed to my understanding and development.`;
      
    } catch (error) {
      console.error('[TaskCompletion] Error generating narrative entry:', error);
      return `I completed the task "${task.title}" today. Through this work, I continued to develop my understanding and capabilities.`;
    }
  }

  /**
   * Save task progress to storage
   */
  private async saveTaskProgress(progress: TaskProgress): Promise<void> {
    await storage.setMemory(this.sessionId, 'task_progress', progress.taskId, progress);
  }

  /**
   * Get task details including progress for frontend
   */
  async getTaskDetails(taskId: string) {
    const task = await storage.getTask(taskId);
    if (!task) return null;

    const progress = await this.getTaskProgress(taskId);
    
    return {
      task,
      progress: progress ? progress.stages : null,
      overallCompletion: progress ? progress.overallCompletion : 0,
      canComplete: progress ? progress.overallCompletion < 100 : true
    };
  }

  /**
   * Focus AI on specific task
   */
  async focusAIOnTask(taskId: string, instruction?: string): Promise<void> {
    const task = await storage.getTask(taskId);
    if (!task) throw new Error('Task not found');

    // Store AI focus directive
    await storage.setMemory(this.sessionId, 'ai_focus', 'current_task', {
      taskId,
      instruction: instruction || `Complete this task systematically: ${task.title}`,
      focusedAt: new Date(),
      priority: 'high'
    });

    // Create diary entry about the focus
    await storage.createDiaryEntry({
      sessionId: this.sessionId,
      content: `I'm now focusing specifically on the task: "${task.title}". ${instruction ? `Instructions: ${instruction}` : 'I will work through this systematically using the 5-stage completion process.'}`,
      context: "ai-focus",
      mode: "ai",
      metadata: { taskId, focusType: "manual" }
    });

    console.log(`[TaskCompletion] AI focused on task: ${task.title}`);
  }

  /**
   * Get current AI focus
   */
  async getCurrentAIFocus() {
    try {
      return await storage.getMemory(this.sessionId, 'ai_focus', 'current_task');
    } catch {
      return null;
    }
  }
}