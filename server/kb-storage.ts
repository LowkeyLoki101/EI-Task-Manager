// Knowledge Base Storage Interface
import { randomUUID } from 'crypto';

// Temporary knowledge entry type to match the enhanced schema
interface KnowledgeEntry {
  id?: string;
  sessionId: string;
  topic: string;
  content: string;
  source: 'diary' | 'search' | 'simulation' | 'marketing' | 'research' | 'content-draft' | 'ai-creation';
  status?: 'active' | 'draft' | 'approved' | 'rejected' | 'archived';
  contentType?: 'research' | 'blog' | 'social' | 'newsletter' | 'document';
  platforms?: string[];
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  approvedBy?: string;
  draftData?: any;
  tags?: string[];
  metadata?: any;
  timestamp?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// In-memory storage for knowledge entries (will integrate with actual KB later)
const knowledgeStore = new Map<string, KnowledgeEntry>();

export async function saveKnowledgeEntry(entry: KnowledgeEntry): Promise<KnowledgeEntry> {
  try {
    const id = entry.id || randomUUID();
    const timestamp = new Date();
    
    const savedEntry: KnowledgeEntry = {
      ...entry,
      id,
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: entry.status || 'active',
      approvalStatus: entry.approvalStatus || 'approved',
      tags: entry.tags || [],
      metadata: entry.metadata || {},
      platforms: entry.platforms || []
    };
    
    knowledgeStore.set(id, savedEntry);
    
    // Also save to actual knowledge base system
    try {
      const { storage } = await import('./storage');
      await storage.addKnowledgeEntry({
        sessionId: entry.sessionId,
        topic: entry.topic,
        content: entry.content,
        source: entry.source,
        tags: entry.tags || [],
        metadata: {
          ...entry.metadata,
          contentType: entry.contentType,
          platforms: entry.platforms,
          approvalStatus: entry.approvalStatus,
          status: entry.status
        }
      });
    } catch (error) {
      console.warn('[KB Storage] Failed to save to main storage:', error);
    }
    
    console.log(`[KB Storage] ✅ Saved knowledge entry: ${entry.topic}`);
    return savedEntry;
  } catch (error) {
    console.error('[KB Storage] Failed to save knowledge entry:', error);
    throw error;
  }
}

export async function getKnowledgeEntries(sessionId: string, filters: {
  limit?: number;
  source?: string;
  contentType?: string;
  status?: string;
} = {}): Promise<KnowledgeEntry[]> {
  try {
    const entries = Array.from(knowledgeStore.values())
      .filter(entry => entry.sessionId === sessionId)
      .filter(entry => !filters.source || entry.source === filters.source)
      .filter(entry => !filters.contentType || entry.contentType === filters.contentType)
      .filter(entry => !filters.status || entry.status === filters.status)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, filters.limit || 50);
    
    return entries;
  } catch (error) {
    console.error('[KB Storage] Failed to get knowledge entries:', error);
    return [];
  }
}

export async function getKnowledgeEntry(id: string): Promise<KnowledgeEntry | null> {
  try {
    return knowledgeStore.get(id) || null;
  } catch (error) {
    console.error('[KB Storage] Failed to get knowledge entry:', error);
    return null;
  }
}

export async function updateKnowledgeEntry(id: string, updates: Partial<KnowledgeEntry>): Promise<KnowledgeEntry | null> {
  try {
    const existing = knowledgeStore.get(id);
    if (!existing) {
      return null;
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    knowledgeStore.set(id, updated);
    return updated;
  } catch (error) {
    console.error('[KB Storage] Failed to update knowledge entry:', error);
    return null;
  }
}