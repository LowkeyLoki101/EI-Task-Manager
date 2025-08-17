import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { createWriteStream, createReadStream } from "fs";
import archiver from "archiver";
import unzipper from "unzipper";

// Knowledge Base Entry with comprehensive metadata
export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  type: 'task' | 'conversation' | 'document' | 'code' | 'research' | 'file' | 'workflow' | 'project';
  sessionId: string;
  
  // Rich metadata system
  metadata: {
    tags: string[];
    category: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: string;
    source?: string;
    relatedEntries?: string[]; // IDs of related entries
    customFields?: Record<string, any>;
  };
  
  // Timestamps and versioning
  createdAt: Date;
  updatedAt: Date;
  version: number;
  
  // Content analysis
  searchableContent: string; // Processed for search
  contentHash: string; // For deduplication
}

// Knowledge Base Export/Import structure
export interface KnowledgeBaseExport {
  metadata: {
    exportId: string;
    exportDate: Date;
    version: string;
    totalEntries: number;
    sessionId: string;
    description?: string;
  };
  entries: KnowledgeBaseEntry[];
  relationships: Record<string, string[]>; // Entry relationships map
  statistics: {
    entriesByType: Record<string, number>;
    entriesByTag: Record<string, number>;
    entriesByCategory: Record<string, number>;
  };
}

export class KnowledgeBaseManager {
  private entries: Map<string, KnowledgeBaseEntry> = new Map();
  private readonly dataPath = "./data/knowledge-base.json";
  private readonly exportPath = "./data/exports";

  constructor() {
    this.loadFromFile();
    this.ensureExportDirectory();
  }

  private ensureExportDirectory(): void {
    if (!existsSync(this.exportPath)) {
      mkdirSync(this.exportPath, { recursive: true });
    }
  }

  private loadFromFile(): void {
    if (existsSync(this.dataPath)) {
      try {
        const rawData = readFileSync(this.dataPath, 'utf-8');
        const data = JSON.parse(rawData);
        
        // Convert back to Map with proper date objects
        this.entries = new Map(
          data.entries.map((entry: any) => [
            entry.id,
            {
              ...entry,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt),
            }
          ])
        );
        
        console.log(`[KnowledgeBase] Loaded ${this.entries.size} entries`);
      } catch (error) {
        console.error("[KnowledgeBase] Error loading data:", error);
        this.entries = new Map();
      }
    }
  }

  private saveToFile(): void {
    const data = {
      entries: Array.from(this.entries.values()),
      lastUpdated: new Date(),
    };
    
    try {
      writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("[KnowledgeBase] Error saving data:", error);
    }
  }

  // Generate searchable content from entry
  private generateSearchableContent(entry: Omit<KnowledgeBaseEntry, 'searchableContent' | 'contentHash' | 'id' | 'createdAt' | 'updatedAt' | 'version'>): string {
    const parts = [
      entry.title,
      entry.content,
      entry.type,
      entry.metadata.tags.join(' '),
      entry.metadata.category,
      JSON.stringify(entry.metadata.customFields || {})
    ];
    return parts.join(' ').toLowerCase();
  }

  // Generate content hash for deduplication
  private generateContentHash(content: string): string {
    // Simple hash function - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Add or update entry
  async addEntry(entry: Omit<KnowledgeBaseEntry, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'searchableContent' | 'contentHash'>): Promise<KnowledgeBaseEntry> {
    const searchableContent = this.generateSearchableContent(entry);
    const contentHash = this.generateContentHash(entry.content);
    
    // Check for existing entry with same hash to prevent duplicates
    const existingEntry = Array.from(this.entries.values())
      .find(e => e.contentHash === contentHash && e.sessionId === entry.sessionId);
    
    if (existingEntry) {
      // Update existing entry
      const updated: KnowledgeBaseEntry = {
        ...existingEntry,
        ...entry,
        updatedAt: new Date(),
        version: existingEntry.version + 1,
        searchableContent,
        contentHash,
      };
      this.entries.set(updated.id, updated);
      this.saveToFile();
      return updated;
    }

    // Create new entry
    const newEntry: KnowledgeBaseEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      searchableContent,
      contentHash,
    };

    this.entries.set(newEntry.id, newEntry);
    this.saveToFile();
    return newEntry;
  }

  // Auto-capture from tasks, conversations, etc.
  async captureTask(task: any, sessionId: string): Promise<KnowledgeBaseEntry> {
    return this.addEntry({
      title: task.title,
      content: `Task: ${task.title}\nDescription: ${task.description || 'No description'}\nStatus: ${task.status}\nContext: ${task.context}`,
      type: 'task',
      sessionId,
      metadata: {
        tags: [task.status, task.context, task.timeWindow].filter(Boolean),
        category: 'Task Management',
        status: task.status,
        source: 'task_manager',
        customFields: {
          taskId: task.id,
          timeWindow: task.timeWindow,
          context: task.context,
        }
      }
    });
  }

  async captureConversation(conversation: any, sessionId: string): Promise<KnowledgeBaseEntry> {
    return this.addEntry({
      title: `Conversation - ${new Date(conversation.timestamp).toLocaleDateString()}`,
      content: `Role: ${conversation.role}\nMessage: ${conversation.message}\nTimestamp: ${conversation.timestamp}`,
      type: 'conversation',
      sessionId,
      metadata: {
        tags: ['conversation', conversation.role],
        category: 'Chat History',
        source: 'autonomous_chat',
        customFields: {
          conversationId: conversation.id,
          role: conversation.role,
          timestamp: conversation.timestamp,
        }
      }
    });
  }

  // Search and retrieval
  async searchEntries(query: string, sessionId: string, filters?: {
    type?: string;
    tags?: string[];
    category?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<KnowledgeBaseEntry[]> {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    let results = Array.from(this.entries.values())
      .filter(entry => entry.sessionId === sessionId);

    // Apply filters
    if (filters?.type) {
      results = results.filter(entry => entry.type === filters.type);
    }
    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter(entry => 
        filters.tags!.some(tag => entry.metadata.tags.includes(tag))
      );
    }
    if (filters?.category) {
      results = results.filter(entry => entry.metadata.category === filters.category);
    }
    if (filters?.dateRange) {
      results = results.filter(entry => 
        entry.createdAt >= filters.dateRange!.start && 
        entry.createdAt <= filters.dateRange!.end
      );
    }

    // Search in content
    if (searchTerms.length > 0) {
      results = results.filter(entry => 
        searchTerms.some(term => entry.searchableContent.includes(term))
      );
    }

    // Sort by relevance (simple scoring)
    return results
      .map(entry => ({
        ...entry,
        relevanceScore: searchTerms.reduce((score, term) => {
          const titleMatches = (entry.title.toLowerCase().match(new RegExp(term, 'g')) || []).length * 3;
          const contentMatches = (entry.searchableContent.match(new RegExp(term, 'g')) || []).length;
          return score + titleMatches + contentMatches;
        }, 0)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 50); // Limit results
  }

  // Simple search wrapper method for routes
  async search(sessionId: string, query: string = '', type: string = 'all'): Promise<KnowledgeBaseEntry[]> {
    const filters: any = {};
    if (type && type !== 'all') {
      filters.type = type;
    }
    return this.searchEntries(query, sessionId, filters);
  }

  // Export to zip file
  async exportToZip(sessionId: string, description?: string): Promise<string> {
    const exportId = randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `knowledge-base-${timestamp}.zip`;
    const zipPath = join(this.exportPath, filename);

    // Prepare export data
    const entries = Array.from(this.entries.values())
      .filter(entry => entry.sessionId === sessionId);

    const exportData: KnowledgeBaseExport = {
      metadata: {
        exportId,
        exportDate: new Date(),
        version: "1.0.0",
        totalEntries: entries.length,
        sessionId,
        description,
      },
      entries,
      relationships: this.buildRelationshipMap(entries),
      statistics: this.generateStatistics(entries),
    };

    // Create zip file
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(filename));
      archive.on('error', reject);
      
      archive.pipe(output);
      
      // Add main data file
      archive.append(JSON.stringify(exportData, null, 2), { name: 'knowledge-base.json' });
      
      // Add entries as individual files for easy browsing
      entries.forEach(entry => {
        const filename = `entries/${entry.type}/${entry.id}.json`;
        archive.append(JSON.stringify(entry, null, 2), { name: filename });
      });
      
      // Add README
      const readme = this.generateExportReadme(exportData);
      archive.append(readme, { name: 'README.md' });
      
      archive.finalize();
    });
  }

  // Import from zip file
  async importFromZip(zipFilename: string, sessionId: string, mergeStrategy: 'replace' | 'merge' | 'skip' = 'merge'): Promise<{
    imported: number;
    skipped: number;
    merged: number;
  }> {
    const zipPath = join(this.exportPath, zipFilename);
    const stats = { imported: 0, skipped: 0, merged: 0 };

    if (!existsSync(zipPath)) {
      throw new Error(`Zip file not found: ${zipFilename}`);
    }

    const zip = await unzipper.Open.file(zipPath);
    const knowledgeBaseFile = zip.files.find((file: any) => file.path === 'knowledge-base.json');
    
    if (!knowledgeBaseFile) {
      throw new Error('Invalid knowledge base export: missing knowledge-base.json');
    }

    const exportData: KnowledgeBaseExport = JSON.parse(await knowledgeBaseFile.buffer().then((buf: Buffer) => buf.toString()));
    
    for (const entry of exportData.entries) {
      const existingEntry = Array.from(this.entries.values())
        .find(e => e.contentHash === entry.contentHash && e.sessionId === sessionId);

      if (existingEntry) {
        if (mergeStrategy === 'skip') {
          stats.skipped++;
          continue;
        } else if (mergeStrategy === 'merge') {
          // Update existing entry with newer data
          const updated: KnowledgeBaseEntry = {
            ...existingEntry,
            ...entry,
            id: existingEntry.id, // Keep original ID
            sessionId, // Use target session ID
            updatedAt: new Date(),
            version: existingEntry.version + 1,
          };
          this.entries.set(updated.id, updated);
          stats.merged++;
        }
      } else {
        // Import new entry
        const newEntry: KnowledgeBaseEntry = {
          ...entry,
          id: randomUUID(), // Generate new ID
          sessionId, // Use target session ID
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(),
        };
        this.entries.set(newEntry.id, newEntry);
        stats.imported++;
      }
    }

    this.saveToFile();
    return stats;
  }

  // Get available exports
  async getAvailableExports(): Promise<string[]> {
    try {
      const exports = await this.listExports();
      return exports.map(exp => exp.filename);
    } catch (error) {
      console.error('[Knowledge Base] Error getting available exports:', error);
      return [];
    }
  }

  // Get statistics
  async getStatistics(sessionId: string): Promise<any> {
    const entries = Array.from(this.entries.values())
      .filter(entry => entry.sessionId === sessionId);

    return this.generateStatistics(entries);
  }

  private generateStatistics(entries: KnowledgeBaseEntry[]) {
    const entriesByType: Record<string, number> = {};
    const entriesByTag: Record<string, number> = {};
    const entriesByCategory: Record<string, number> = {};

    entries.forEach(entry => {
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;
      entriesByCategory[entry.metadata.category] = (entriesByCategory[entry.metadata.category] || 0) + 1;
      
      entry.metadata.tags.forEach(tag => {
        entriesByTag[tag] = (entriesByTag[tag] || 0) + 1;
      });
    });

    return {
      totalEntries: entries.length,
      entriesByType,
      entriesByTag,
      entriesByCategory,
      lastUpdated: new Date(),
    };
  }

  private buildRelationshipMap(entries: KnowledgeBaseEntry[]): Record<string, string[]> {
    const relationships: Record<string, string[]> = {};
    
    entries.forEach(entry => {
      if (entry.metadata.relatedEntries) {
        relationships[entry.id] = entry.metadata.relatedEntries;
      }
    });

    return relationships;
  }

  private generateExportReadme(exportData: KnowledgeBaseExport): string {
    return `# Knowledge Base Export

## Export Information
- Export ID: ${exportData.metadata.exportId}
- Export Date: ${exportData.metadata.exportDate}
- Session ID: ${exportData.metadata.sessionId}
- Total Entries: ${exportData.metadata.totalEntries}
- Version: ${exportData.metadata.version}
${exportData.metadata.description ? `- Description: ${exportData.metadata.description}` : ''}

## Statistics
- Entries by Type: ${JSON.stringify(exportData.statistics.entriesByType, null, 2)}
- Entries by Category: ${JSON.stringify(exportData.statistics.entriesByCategory, null, 2)}

## File Structure
- \`knowledge-base.json\` - Complete export data
- \`entries/\` - Individual entry files organized by type
- \`README.md\` - This file

## Import Instructions
To import this knowledge base, use the import functionality in the application and select this zip file.

Export generated by Emergent Intelligence Knowledge Base Manager.
`;
  }

  // List available exports
  async listExports(): Promise<{ filename: string; size: number; created: Date }[]> {
    if (!existsSync(this.exportPath)) {
      return [];
    }

    return readdirSync(this.exportPath)
      .filter(filename => filename.endsWith('.zip'))
      .map(filename => {
        const filepath = join(this.exportPath, filename);
        const stats = statSync(filepath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }
}

// Global instance
export const knowledgeBaseManager = new KnowledgeBaseManager();