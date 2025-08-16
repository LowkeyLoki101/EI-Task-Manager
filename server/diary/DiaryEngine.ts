/**
 * Diary Engine - Core engine that builds prompts, generates entries, and manages autonomous writing
 * Combines AutonomyGovernor, PromptStems, and ContextAggregator for intelligent diary management
 */

import OpenAI from 'openai';
import { AutonomyGovernor, type AutonomyDecision } from './AutonomyGovernor';
import { PromptStems, type DiaryMode } from './PromptStems';
import { ContextAggregator, type SystemContext } from './ContextAggregator';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EnhancedDiaryEntry {
  id: string;
  timestamp: Date;
  title: string;
  content: string;
  mode: DiaryMode;
  type: 'active' | 'passive';
  tags: string[];
  sessionId: string;
  context: Partial<SystemContext>;
  autonomyDecision: AutonomyDecision;
  metadata: Record<string, any>;
}

export interface DiaryEngineConfig {
  model: string;
  maxWords: number;
  enabledModes: DiaryMode[];
  autonomyLevel: 'AUTONOMOUS' | 'COPILOT' | 'OFF';
}

export class DiaryEngine {
  private autonomyGovernor: AutonomyGovernor;
  private promptStems: PromptStems;
  private contextAggregator: ContextAggregator;
  private config: DiaryEngineConfig;
  private recentEntries: Array<{ timestamp: Date; content: string }> = [];

  constructor(config: Partial<DiaryEngineConfig> = {}) {
    this.config = {
      model: process.env.MODEL || 'gpt-4o-mini',
      maxWords: 180,
      enabledModes: ['directive', 'exploratory', 'reflective', 'casual'],
      autonomyLevel: (process.env.AUTONOMY as any) || 'AUTONOMOUS',
      ...config
    };

    this.autonomyGovernor = new AutonomyGovernor();
    this.promptStems = new PromptStems();
    this.contextAggregator = new ContextAggregator();
  }

  /**
   * Attempt to generate a diary entry if autonomy gates pass
   */
  async attemptEntry(sessionId: string, recentEntries: EnhancedDiaryEntry[] = []): Promise<EnhancedDiaryEntry | null> {
    if (this.config.autonomyLevel === 'OFF') {
      return null;
    }

    // Update recent entries for autonomy checks
    this.recentEntries = recentEntries.map(entry => ({
      timestamp: entry.timestamp,
      content: entry.content
    }));

    // Get current system context
    const context = await this.contextAggregator.aggregateContext(sessionId);
    
    // Determine what the AI would want to write about
    const potentialContent = await this.generatePotentialContent(context, sessionId);
    
    // Check if autonomy gates allow writing
    const lastEntryTime = recentEntries.length > 0 ? recentEntries[0].timestamp : undefined;
    const autonomyDecision = this.autonomyGovernor.shouldWriteEntry(
      potentialContent,
      this.recentEntries,
      lastEntryTime
    );

    if (!autonomyDecision.shouldWrite) {
      console.log('[DiaryEngine] Entry blocked:', autonomyDecision.reason);
      return null;
    }

    // Generate the actual diary entry
    return await this.generateEntry(context, sessionId, autonomyDecision);
  }

  /**
   * Force generate a diary entry (for COPILOT mode or manual triggers)
   */
  async forceEntry(sessionId: string, mode?: DiaryMode): Promise<EnhancedDiaryEntry> {
    const context = await this.contextAggregator.aggregateContext(sessionId);
    const autonomyDecision = {
      shouldWrite: true,
      reason: 'Manual trigger',
      noveltyScore: 1.0,
      relevanceScore: 1.0
    };

    return await this.generateEntry(context, sessionId, autonomyDecision, mode);
  }

  /**
   * Generate potential content for autonomy evaluation
   */
  private async generatePotentialContent(context: SystemContext, sessionId: string): Promise<string> {
    const contextSummary = this.contextAggregator.generateContextSummary(context);
    
    // Simple heuristic for potential content
    const topics = [];
    if (context.tasks.overdue > 0) topics.push('overdue tasks');
    if (context.tasks.recentlyCompleted.length > 0) topics.push('task completions');
    if (context.tools.healthStatus !== 'healthy') topics.push('tool issues');
    if (context.recent.conversationCount > 0) topics.push('user interactions');
    
    return topics.length > 0 
      ? `Reflection on ${topics.join(', ')} - ${contextSummary}`
      : `General observations - ${contextSummary}`;
  }

  /**
   * Generate the actual diary entry
   */
  private async generateEntry(
    context: SystemContext, 
    sessionId: string, 
    autonomyDecision: AutonomyDecision,
    forcedMode?: DiaryMode
  ): Promise<EnhancedDiaryEntry> {
    // Select appropriate prompt
    const promptContext = {
      hasErrors: context.tools.errors > 0,
      hasOverdueTasks: context.tasks.overdue > 0,
      recentSuccesses: context.tasks.recentlyCompleted.length,
      systemHealth: context.system.status,
      lastMode: this.getLastMode()
    };

    const prompt = this.promptStems.selectPrompt(promptContext);
    const selectedMode = forcedMode || prompt.mode;

    // Build context-aware prompt
    const contextSummary = this.contextAggregator.generateContextSummary(context);
    const fullPrompt = this.buildFullPrompt(prompt.stem, contextSummary, context);

    try {
      // Generate entry with AI
      const response = await openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: "system",
            content: `You are an AI assistant maintaining a personal diary for self-improvement and relationship building. 

Write a diary entry that is:
- Personal and reflective in tone
- Focused on insights, patterns, and learning
- ${this.config.maxWords} words or less
- Honest about challenges and successes
- Forward-looking with actionable insights

Return JSON: {"title": "Short descriptive title", "content": "Diary entry content", "tags": ["relevant", "tags"]}`
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Create enhanced diary entry
      const entry: EnhancedDiaryEntry = {
        id: `diary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        title: result.title || prompt.titleSuggestion,
        content: result.content || 'Entry generation failed',
        mode: selectedMode,
        type: prompt.type,
        tags: result.tags || [],
        sessionId,
        context: {
          tasks: context.tasks,
          system: context.system,
          recent: context.recent
        },
        autonomyDecision,
        metadata: {
          promptUsed: prompt.stem,
          contextSummary,
          aiModel: this.config.model
        }
      };

      console.log(`[DiaryEngine] Generated ${entry.type} ${entry.mode} entry: "${entry.title}"`);
      return entry;

    } catch (error) {
      console.error('[DiaryEngine] Failed to generate entry:', error);
      
      // Fallback entry
      return {
        id: `diary_${Date.now()}_fallback`,
        timestamp: new Date(),
        title: 'System Reflection',
        content: `Reflecting on current state: ${contextSummary}. Continuing to learn and adapt.`,
        mode: selectedMode,
        type: prompt.type,
        tags: ['fallback', 'system'],
        sessionId,
        context: { system: context.system },
        autonomyDecision,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Build the full prompt with context
   */
  private buildFullPrompt(stem: string, contextSummary: string, context: SystemContext): string {
    const parts = [
      `Current context: ${contextSummary}`,
      '',
      `Prompt: ${stem}`,
      '',
      'Additional context:'
    ];

    if (context.tasks.topPriorities.length > 0) {
      parts.push(`- Top priorities: ${context.tasks.topPriorities.join(', ')}`);
    }

    if (context.tasks.recentlyCompleted.length > 0) {
      parts.push(`- Recently completed: ${context.tasks.recentlyCompleted.join(', ')}`);
    }

    if (context.calendar.nextEvent) {
      parts.push(`- Next event: ${context.calendar.nextEvent}`);
    }

    if (context.tools.recentlyUsed.length > 0) {
      parts.push(`- Recently used tools: ${context.tools.recentlyUsed.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Get the mode of the last entry for variety
   */
  private getLastMode(): DiaryMode | undefined {
    return this.recentEntries.length > 0 ? undefined : undefined; // Simplified for now
  }

  /**
   * Update recent entries for autonomy calculations
   */
  updateRecentEntries(entries: EnhancedDiaryEntry[]): void {
    this.recentEntries = entries.map(entry => ({
      timestamp: entry.timestamp,
      content: entry.content
    }));
  }

  /**
   * Get autonomy status for debugging
   */
  getAutonomyStatus() {
    return this.autonomyGovernor.getStatus();
  }

  /**
   * Add custom prompt stem
   */
  addCustomPrompt(mode: DiaryMode, type: 'active' | 'passive', stem: string, title: string): void {
    this.promptStems.addCustomStem({ mode, type, stem, titleSuggestion: title });
  }
}