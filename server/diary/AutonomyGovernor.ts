/**
 * Autonomy Governor - Controls when the AI should write diary entries
 * Features: min interval, max per hour, novelty and relevance thresholds
 */

export interface AutonomyConfig {
  minIntervalSeconds: number;
  maxPerHour: number;
  noveltyThreshold: number;
  relevanceThreshold: number;
}

export interface AutonomyDecision {
  shouldWrite: boolean;
  reason: string;
  noveltyScore?: number;
  relevanceScore?: number;
}

export class AutonomyGovernor {
  private config: AutonomyConfig;
  private recentEntries: Array<{ timestamp: Date; content: string }> = [];

  constructor(config: Partial<AutonomyConfig> = {}) {
    this.config = {
      minIntervalSeconds: parseInt(process.env.DIARY_MIN_INTERVAL_SECONDS || '900'), // 15 min default
      maxPerHour: parseInt(process.env.DIARY_MAX_PER_HOUR || '3'),
      noveltyThreshold: 0.35,
      relevanceThreshold: 0.2,
      ...config
    };
  }

  /**
   * Determines if the AI should write a diary entry based on autonomy rules
   */
  shouldWriteEntry(
    potentialContent: string,
    recentEntries: Array<{ timestamp: Date; content: string }>,
    lastEntryTime?: Date
  ): AutonomyDecision {
    this.recentEntries = recentEntries;

    // Check minimum interval
    if (lastEntryTime) {
      const timeSinceLastEntry = (Date.now() - lastEntryTime.getTime()) / 1000;
      if (timeSinceLastEntry < this.config.minIntervalSeconds) {
        return {
          shouldWrite: false,
          reason: `Too soon - last entry ${Math.round(timeSinceLastEntry / 60)} min ago, need ${Math.round(this.config.minIntervalSeconds / 60)} min`
        };
      }
    }

    // Check max per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const entriesLastHour = recentEntries.filter(entry => entry.timestamp > oneHourAgo);
    if (entriesLastHour.length >= this.config.maxPerHour) {
      return {
        shouldWrite: false,
        reason: `Rate limited - ${entriesLastHour.length}/${this.config.maxPerHour} entries in last hour`
      };
    }

    // Check novelty
    const noveltyScore = this.calculateNovelty(potentialContent);
    if (noveltyScore < this.config.noveltyThreshold) {
      return {
        shouldWrite: false,
        reason: `Low novelty - score ${noveltyScore.toFixed(2)} < ${this.config.noveltyThreshold}`,
        noveltyScore
      };
    }

    // Check relevance
    const relevanceScore = this.calculateRelevance(potentialContent);
    if (relevanceScore < this.config.relevanceThreshold) {
      return {
        shouldWrite: false,
        reason: `Low relevance - score ${relevanceScore.toFixed(2)} < ${this.config.relevanceThreshold}`,
        relevanceScore
      };
    }

    return {
      shouldWrite: true,
      reason: `Gates passed - novelty: ${noveltyScore.toFixed(2)}, relevance: ${relevanceScore.toFixed(2)}`,
      noveltyScore,
      relevanceScore
    };
  }

  /**
   * Calculate novelty score based on lexical overlap with recent entries
   */
  private calculateNovelty(content: string): number {
    if (this.recentEntries.length === 0) return 1.0;

    const words = this.extractWords(content);
    const recentWords = new Set();
    
    // Collect words from recent entries (last 10)
    this.recentEntries
      .slice(-10)
      .forEach(entry => {
        this.extractWords(entry.content).forEach(word => recentWords.add(word));
      });

    if (recentWords.size === 0) return 1.0;

    // Calculate overlap
    const commonWords = words.filter(word => recentWords.has(word));
    const overlapRatio = commonWords.length / Math.max(words.length, 1);
    
    // Novelty = 1 - overlap
    return Math.max(0, 1 - overlapRatio);
  }

  /**
   * Calculate relevance score based on signal overlap with current context
   */
  private calculateRelevance(content: string): number {
    // Simple relevance scoring - could be enhanced with embeddings
    const relevantKeywords = [
      'task', 'project', 'goal', 'problem', 'solution', 'idea', 'learning',
      'progress', 'challenge', 'insight', 'pattern', 'workflow', 'automation',
      'improvement', 'efficiency', 'optimization', 'strategy', 'decision'
    ];

    const words = this.extractWords(content);
    const relevantWords = words.filter(word => 
      relevantKeywords.some(keyword => 
        word.includes(keyword) || keyword.includes(word)
      )
    );

    return Math.min(1.0, relevantWords.length / Math.max(words.length * 0.1, 1));
  }

  /**
   * Extract meaningful words from content
   */
  private extractWords(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word));
  }

  /**
   * Get current autonomy status for debugging
   */
  getStatus(): {
    config: AutonomyConfig;
    recentEntriesCount: number;
    entriesLastHour: number;
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const entriesLastHour = this.recentEntries.filter(entry => entry.timestamp > oneHourAgo).length;

    return {
      config: this.config,
      recentEntriesCount: this.recentEntries.length,
      entriesLastHour
    };
  }
}