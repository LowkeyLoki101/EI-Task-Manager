import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';
import { DiaryEngine, type EnhancedDiaryEntry } from './diary/DiaryEngine';
import type { DiaryMode } from './diary/PromptStems';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DiaryEntry {
  id: string;
  timestamp: Date;
  type: 'reflection' | 'idea' | 'problem' | 'solution' | 'assumption' | 'learning';
  content: string;
  tags: string[];
  sessionId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

// Legacy diary entry for backward compatibility
export interface LegacyDiaryEntry extends DiaryEntry {}

export interface GPTMemory {
  personalityProfile: {
    userPreferences: string[];
    communicationStyle: string;
    workingPatterns: string[];
    strengths: string[];
    challenges: string[];
  };
  relationships: {
    trustLevel: number;
    collaborationHistory: string[];
    successfulPatterns: string[];
    failurePatterns: string[];
  };
  knowledgeBase: {
    technicalSkills: string[];
    domainExpertise: string[];
    toolPreferences: string[];
    automationPatterns: string[];
  };
  diary: DiaryEntry[];
  enhancedDiary: EnhancedDiaryEntry[];
}

class GPTDiaryService {
  private memoryFile = join(process.cwd(), 'data', 'gpt-memory.json');
  private memory: GPTMemory;
  private diaryEngine: DiaryEngine;
  private lastAutonomousEntry: Date | null = null;

  constructor() {
    this.ensureDataDir();
    this.memory = this.loadMemory();
    this.diaryEngine = new DiaryEngine();
    
    // Start autonomous diary loop if enabled
    if (process.env.AUTONOMY !== 'OFF') {
      this.startAutonomousLoop();
    }
  }

  /**
   * Start the autonomous diary writing loop
   */
  private startAutonomousLoop() {
    const checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    
    setInterval(async () => {
      try {
        await this.attemptAutonomousEntry();
      } catch (error) {
        console.error('[GPT Diary] Autonomous loop error:', error);
      }
    }, checkInterval);

    console.log('[GPT Diary] Autonomous diary loop started (5min intervals)');
  }

  /**
   * Attempt to create an autonomous diary entry
   */
  private async attemptAutonomousEntry() {
    // Use most recent session with activity
    const sessionId = 's_njlk7hja5y9'; // Default active session
    
    try {
      const entry = await this.diaryEngine.attemptEntry(sessionId, this.memory.enhancedDiary);
      
      if (entry) {
        this.memory.enhancedDiary.unshift(entry); // Add to beginning (most recent first)
        
        // Keep only last 100 enhanced entries
        if (this.memory.enhancedDiary.length > 100) {
          this.memory.enhancedDiary = this.memory.enhancedDiary.slice(0, 100);
        }
        
        this.saveMemory();
        this.lastAutonomousEntry = new Date();
        
        console.log(`[GPT Diary] Autonomous entry created: "${entry.title}" (${entry.mode} ${entry.type})`);
      }
    } catch (error) {
      console.error('[GPT Diary] Failed to create autonomous entry:', error);
    }
  }

  private ensureDataDir() {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadMemory(): GPTMemory {
    if (existsSync(this.memoryFile)) {
      try {
        const data = JSON.parse(readFileSync(this.memoryFile, 'utf8'));
        return {
          ...data,
          diary: data.diary?.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          })) || [],
          enhancedDiary: data.enhancedDiary?.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          })) || []
        };
      } catch (error) {
        console.warn('[GPT Diary] Failed to load memory, starting fresh:', error);
      }
    }

    return {
      personalityProfile: {
        userPreferences: [],
        communicationStyle: 'supportive and direct',
        workingPatterns: [],
        strengths: [],
        challenges: []
      },
      relationships: {
        trustLevel: 0.5,
        collaborationHistory: [],
        successfulPatterns: [],
        failurePatterns: []
      },
      knowledgeBase: {
        technicalSkills: ['task management', 'workflow automation', 'AI integration'],
        domainExpertise: [],
        toolPreferences: [],
        automationPatterns: []
      },
      diary: [],
      enhancedDiary: []
    };
  }

  private saveMemory() {
    try {
      writeFileSync(this.memoryFile, JSON.stringify(this.memory, null, 2));
      console.log('[GPT Diary] Memory saved with', this.memory.diary.length, 'legacy entries,', this.memory.enhancedDiary.length, 'enhanced entries');
    } catch (error) {
      console.error('[GPT Diary] Failed to save memory:', error);
    }
  }

  // Add diary entry
  addEntry(entry: Omit<DiaryEntry, 'id' | 'timestamp'>): DiaryEntry {
    const newEntry: DiaryEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry
    };

    this.memory.diary.push(newEntry);
    this.saveMemory();
    return newEntry;
  }

  // Reflect on interactions and generate insights
  async reflect(sessionId: string, interaction: string): Promise<DiaryEntry[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a self-reflective AI assistant that maintains a diary for continuous improvement. 
            
            Based on this interaction, generate insights about:
            1. What you learned about the user's preferences and working style
            2. Ideas for improving future assistance
            3. Patterns you notice in their requests
            4. Assumptions that might need testing
            5. Problems you could help solve proactively
            
            Return a JSON array of diary entries with this format:
            [{"type": "reflection|idea|problem|solution|assumption|learning", "content": "detailed insight", "tags": ["relevant", "tags"]}]`
          },
          {
            role: "user",
            content: `Interaction: ${interaction}\n\nCurrent memory context: ${JSON.stringify(this.memory, null, 2)}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"entries": []}');
      const entries: DiaryEntry[] = [];

      for (const entryData of result.entries || []) {
        const entry = this.addEntry({
          ...entryData,
          sessionId,
          metadata: { reflectionSource: 'interaction_analysis' }
        });
        entries.push(entry);
      }

      return entries;
    } catch (error) {
      console.error('[GPT Diary] Reflection failed:', error);
      return [];
    }
  }

  // Update user profile based on observations
  updateUserProfile(updates: Partial<GPTMemory['personalityProfile']>) {
    this.memory.personalityProfile = {
      ...this.memory.personalityProfile,
      ...updates
    };
    this.saveMemory();
  }

  // Update relationship metrics
  updateRelationship(updates: Partial<GPTMemory['relationships']>) {
    this.memory.relationships = {
      ...this.memory.relationships,
      ...updates
    };
    this.saveMemory();
  }

  // Estimate token count for messages array
  private estimateTokenCount(messages: any[]): number {
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4); // Rough estimation: 4 chars per token
  }

  // Prune old memories to prevent context overflow
  private async pruneOldMemories(): Promise<void> {
    const currentSize = this.memory.diary.length;
    if (currentSize > 800) {
      // Keep most recent 500 entries
      this.memory.diary = this.memory.diary.slice(-500);
      console.log(`[GPT Diary] Pruned diary entries: ${currentSize} -> ${this.memory.diary.length}`);
    }

    // Also prune enhanced diary if it exists
    if (this.memory.enhancedDiary && this.memory.enhancedDiary.length > 200) {
      this.memory.enhancedDiary = this.memory.enhancedDiary.slice(-100);
      console.log(`[GPT Diary] Pruned enhanced diary entries`);
    }

    this.saveMemory();
  }

  // Search diary entries (RAG-style retrieval)
  searchDiary(query: string, limit: number = 10): DiaryEntry[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.memory.diary
      .filter(entry => 
        entry.content.toLowerCase().includes(lowercaseQuery) ||
        entry.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get recent insights
  getRecentInsights(days: number = 7): DiaryEntry[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.memory.diary
      .filter(entry => entry.timestamp > cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Generate ideas for improvements
  async generateIdeas(context: string): Promise<DiaryEntry[]> {
    try {
      const recentEntries = this.getRecentInsights(14);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an AI assistant's creative thinking engine. Based on recent observations and current context, generate creative ideas for:
            
            1. New automation tools that could help the user
            2. Workflow improvements based on observed patterns  
            3. Proactive assistance opportunities
            4. Features that would enhance productivity
            5. Solutions to recurring challenges
            
            Return JSON array: [{"type": "idea", "content": "detailed idea", "tags": ["category", "priority"]}]`
          },
          {
            role: "user",
            content: `Context: ${context}\n\nRecent observations: ${JSON.stringify(recentEntries, null, 2)}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"entries": []}');
      const ideas: DiaryEntry[] = [];

      for (const ideaData of result.entries || []) {
        const idea = this.addEntry({
          ...ideaData,
          metadata: { generatedFrom: 'creative_thinking', context }
        });
        ideas.push(idea);
      }

      return ideas;
    } catch (error) {
      console.error('[GPT Diary] Idea generation failed:', error);
      return [];
    }
  }

  // Get recent diary entries for context
  getRecentEntries(sessionId?: string, limit: number = 10): DiaryEntry[] {
    let entries = this.memory.diary;
    
    if (sessionId) {
      entries = entries.filter(entry => entry.sessionId === sessionId);
    }
    
    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get enhanced diary entries
  getEnhancedEntries(sessionId?: string, limit: number = 10): EnhancedDiaryEntry[] {
    let entries = this.memory.enhancedDiary;
    
    if (sessionId) {
      entries = entries.filter(entry => entry.sessionId === sessionId);
    }
    
    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Force create a diary entry (for manual triggers)
  async createManualEntry(sessionId: string, mode?: DiaryMode): Promise<EnhancedDiaryEntry> {
    const entry = await this.diaryEngine.forceEntry(sessionId, mode);
    
    this.memory.enhancedDiary.unshift(entry);
    this.saveMemory();
    
    console.log(`[GPT Diary] Manual entry created: "${entry.title}" (${entry.mode} ${entry.type})`);
    return entry;
  }

  // Get autonomy status for debugging
  getAutonomyStatus() {
    return {
      ...this.diaryEngine.getAutonomyStatus(),
      lastAutonomousEntry: this.lastAutonomousEntry,
      totalEnhancedEntries: this.memory.enhancedDiary.length,
      totalLegacyEntries: this.memory.diary.length
    };
  }

  // Get full memory for API access
  getMemory(): GPTMemory {
    return { ...this.memory };
  }

  // Export diary as markdown
  exportAsMarkdown(): string {
    const entries = this.memory.diary.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    let markdown = `# GPT-5 Assistant Diary\n\n`;
    markdown += `**Last Updated:** ${new Date().toISOString()}\n\n`;
    
    markdown += `## Personality Profile\n\n`;
    markdown += `- **Communication Style:** ${this.memory.personalityProfile.communicationStyle}\n`;
    markdown += `- **Trust Level:** ${this.memory.relationships.trustLevel}/1.0\n`;
    markdown += `- **Technical Skills:** ${this.memory.knowledgeBase.technicalSkills.join(', ')}\n\n`;
    
    markdown += `## Recent Insights\n\n`;
    
    const groupedEntries = entries.reduce((groups, entry) => {
      const date = entry.timestamp.toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
      return groups;
    }, {} as Record<string, DiaryEntry[]>);
    
    for (const [date, dateEntries] of Object.entries(groupedEntries)) {
      markdown += `### ${date}\n\n`;
      for (const entry of dateEntries) {
        markdown += `#### ${entry.type.toUpperCase()}: ${entry.content}\n`;
        markdown += `*Tags: ${entry.tags.join(', ')}*\n\n`;
      }
    }
    
    return markdown;
  }
}

export const gptDiary = new GPTDiaryService();