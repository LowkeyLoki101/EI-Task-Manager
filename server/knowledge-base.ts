// Central Knowledge Base Management for GPT-5, User, and ElevenLabs
import { storage } from "./storage";
import { randomUUID } from "crypto";
import type { ResearchDoc } from "@shared/schema";
import fs from "fs/promises";
import FormData from "form-data";
import fetch from "node-fetch";

export interface KnowledgeBaseDocument {
  id: string;
  sessionId: string;
  projectId?: string;
  title: string;
  content: string;
  format: 'text' | 'pdf' | 'docx' | 'html' | 'epub';
  source: 'gpt5' | 'user_upload' | 'manual_entry';
  elevenlabsDocId?: string; // ElevenLabs document ID after upload
  synced: boolean; // Whether it's synced with ElevenLabs
  tags: string[];
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElevenLabsKBResponse {
  id: string;
  name: string;
  status: 'processing' | 'ready' | 'error';
  character_count?: number;
  error_message?: string;
}

export class KnowledgeBaseManager {
  private documents: Map<string, KnowledgeBaseDocument>;
  private elevenlabsApiKey: string;
  private agentId: string;

  constructor() {
    this.documents = new Map();
    this.elevenlabsApiKey = process.env.ELEVENLABS_API_KEY || '';
    this.agentId = process.env.ELEVENLABS_AGENT_ID || 'agent_7401k28d3x9kfdntv7cjrj6t43be';
  }

  // **CORE KNOWLEDGE BASE OPERATIONS**

  // Add document from research doc (GPT-5 created)
  async addFromResearchDoc(researchDoc: ResearchDoc): Promise<KnowledgeBaseDocument> {
    const kbDoc: KnowledgeBaseDocument = {
      id: randomUUID(),
      sessionId: researchDoc.sessionId,
      projectId: researchDoc.projectId || undefined,
      title: researchDoc.title,
      content: researchDoc.content,
      format: 'text',
      source: 'gpt5',
      synced: false,
      tags: researchDoc.tags || [],
      metadata: {
        researchDocId: researchDoc.id,
        summary: researchDoc.summary,
        sources: researchDoc.sources
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.documents.set(kbDoc.id, kbDoc);
    
    // Auto-sync to ElevenLabs if API key is available
    if (this.elevenlabsApiKey) {
      await this.syncToElevenLabs(kbDoc.id);
    }

    return kbDoc;
  }

  // Add document from user upload
  async addFromUserUpload(
    sessionId: string,
    title: string,
    filePath: string,
    format: KnowledgeBaseDocument['format'],
    projectId?: string
  ): Promise<KnowledgeBaseDocument> {
    let content = '';
    
    // Read file content based on format
    if (format === 'text') {
      content = await fs.readFile(filePath, 'utf-8');
    } else {
      // For other formats, we'll upload the file directly to ElevenLabs
      // and store the file path as content for now
      content = `[File: ${filePath}]`;
    }

    const kbDoc: KnowledgeBaseDocument = {
      id: randomUUID(),
      sessionId,
      projectId,
      title,
      content,
      format,
      source: 'user_upload',
      synced: false,
      tags: [],
      metadata: { filePath },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.documents.set(kbDoc.id, kbDoc);
    
    // Sync to ElevenLabs
    if (this.elevenlabsApiKey) {
      await this.syncToElevenLabs(kbDoc.id, filePath);
    }

    return kbDoc;
  }

  // Manual text entry
  async addManualDocument(
    sessionId: string,
    title: string,
    content: string,
    projectId?: string,
    tags: string[] = []
  ): Promise<KnowledgeBaseDocument> {
    const kbDoc: KnowledgeBaseDocument = {
      id: randomUUID(),
      sessionId,
      projectId,
      title,
      content,
      format: 'text',
      source: 'manual_entry',
      synced: false,
      tags,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.documents.set(kbDoc.id, kbDoc);
    
    if (this.elevenlabsApiKey) {
      await this.syncToElevenLabs(kbDoc.id);
    }

    return kbDoc;
  }

  // **ELEVENLABS INTEGRATION**

  // Sync document to ElevenLabs knowledge base
  async syncToElevenLabs(docId: string, filePath?: string): Promise<boolean> {
    const doc = this.documents.get(docId);
    if (!doc || !this.elevenlabsApiKey) {
      return false;
    }

    try {
      const formData = new FormData();
      formData.append('name', doc.title);

      if (filePath && doc.format !== 'text') {
        // Upload file directly for non-text formats
        const fileBuffer = await fs.readFile(filePath);
        formData.append('file', fileBuffer, {
          filename: `${doc.title}.${doc.format}`,
          contentType: this.getContentType(doc.format)
        });
      } else {
        // Create temporary text file for text content
        const tempFilePath = `/tmp/${doc.id}.txt`;
        await fs.writeFile(tempFilePath, doc.content);
        const fileBuffer = await fs.readFile(tempFilePath);
        formData.append('file', fileBuffer, {
          filename: `${doc.title}.txt`,
          contentType: 'text/plain'
        });
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {}); 
      }

      const response = await fetch('https://api.elevenlabs.io/v1/knowledge-base/documents', {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenlabsApiKey,
          ...formData.getHeaders()
        },
        body: formData as any
      });

      if (response.ok) {
        const result: ElevenLabsKBResponse = await response.json();
        
        // Update document with ElevenLabs ID
        doc.elevenlabsDocId = result.id;
        doc.synced = true;
        doc.updatedAt = new Date();
        this.documents.set(docId, doc);

        // Update the agent's knowledge base
        await this.updateAgentKnowledgeBase();
        
        console.log(`Successfully synced document "${doc.title}" to ElevenLabs KB: ${result.id}`);
        return true;
      } else {
        const error = await response.text();
        console.error('ElevenLabs KB sync failed:', error);
        return false;
      }
    } catch (error) {
      console.error('Error syncing to ElevenLabs:', error);
      return false;
    }
  }

  // Update agent's knowledge base configuration
  private async updateAgentKnowledgeBase(): Promise<void> {
    if (!this.elevenlabsApiKey || !this.agentId) return;

    try {
      const syncedDocs = Array.from(this.documents.values())
        .filter(doc => doc.synced && doc.elevenlabsDocId)
        .map(doc => doc.elevenlabsDocId!);

      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${this.agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenlabsApiKey
        },
        body: JSON.stringify({
          knowledge_base: {
            documents: syncedDocs
          }
        })
      });

      if (response.ok) {
        console.log('Agent knowledge base updated successfully');
      } else {
        console.error('Failed to update agent knowledge base:', await response.text());
      }
    } catch (error) {
      console.error('Error updating agent knowledge base:', error);
    }
  }

  // **QUERY AND RETRIEVAL**

  // Search documents for GPT-5 context
  searchDocuments(sessionId: string, query: string, projectId?: string): KnowledgeBaseDocument[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.documents.values())
      .filter(doc => {
        if (doc.sessionId !== sessionId) return false;
        if (projectId && doc.projectId !== projectId) return false;
        
        return (
          doc.title.toLowerCase().includes(lowerQuery) ||
          doc.content.toLowerCase().includes(lowerQuery) ||
          doc.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10); // Top 10 results
  }

  // Get all documents for a session/project
  getDocuments(sessionId: string, projectId?: string): KnowledgeBaseDocument[] {
    return Array.from(this.documents.values())
      .filter(doc => {
        if (doc.sessionId !== sessionId) return false;
        if (projectId && doc.projectId !== projectId) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Get document by ID
  getDocument(id: string): KnowledgeBaseDocument | undefined {
    return this.documents.get(id);
  }

  // **SYNC STATUS AND MANAGEMENT**

  // Get sync status for all documents
  getSyncStatus(sessionId: string): {
    total: number;
    synced: number;
    pending: number;
    failed: number;
  } {
    const docs = Array.from(this.documents.values())
      .filter(doc => doc.sessionId === sessionId);
    
    return {
      total: docs.length,
      synced: docs.filter(doc => doc.synced).length,
      pending: docs.filter(doc => !doc.synced && !doc.elevenlabsDocId).length,
      failed: docs.filter(doc => !doc.synced && doc.elevenlabsDocId).length
    };
  }

  // Retry failed syncs
  async retryFailedSyncs(sessionId: string): Promise<number> {
    const failedDocs = Array.from(this.documents.values())
      .filter(doc => doc.sessionId === sessionId && !doc.synced);
    
    let successCount = 0;
    for (const doc of failedDocs) {
      const success = await this.syncToElevenLabs(doc.id);
      if (success) successCount++;
    }
    
    return successCount;
  }

  // **UTILITY METHODS**

  private getContentType(format: string): string {
    const contentTypes = {
      'text': 'text/plain',
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'html': 'text/html',
      'epub': 'application/epub+zip'
    };
    return contentTypes[format as keyof typeof contentTypes] || 'text/plain';
  }

  // Remove document
  async removeDocument(id: string): Promise<boolean> {
    const doc = this.documents.get(id);
    if (!doc) return false;

    // Remove from ElevenLabs if synced
    if (doc.synced && doc.elevenlabsDocId && this.elevenlabsApiKey) {
      try {
        await fetch(`https://api.elevenlabs.io/v1/knowledge-base/documents/${doc.elevenlabsDocId}`, {
          method: 'DELETE',
          headers: {
            'xi-api-key': this.elevenlabsApiKey
          }
        });
      } catch (error) {
        console.error('Error removing document from ElevenLabs:', error);
      }
    }

    this.documents.delete(id);
    return true;
  }

  // Update document content
  async updateDocument(id: string, updates: Partial<KnowledgeBaseDocument>): Promise<boolean> {
    const doc = this.documents.get(id);
    if (!doc) return false;

    const updatedDoc = {
      ...doc,
      ...updates,
      updatedAt: new Date()
    };

    this.documents.set(id, updatedDoc);

    // Re-sync if content changed
    if (updates.content || updates.title) {
      updatedDoc.synced = false;
      if (this.elevenlabsApiKey) {
        await this.syncToElevenLabs(id);
      }
    }

    return true;
  }

  // Generate knowledge context for GPT-5
  generateKnowledgeContext(sessionId: string, projectId?: string, query?: string): string {
    let relevantDocs: KnowledgeBaseDocument[];
    
    if (query) {
      relevantDocs = this.searchDocuments(sessionId, query, projectId);
    } else {
      relevantDocs = this.getDocuments(sessionId, projectId).slice(0, 5);
    }

    if (relevantDocs.length === 0) {
      return "No relevant knowledge base documents found.";
    }

    let context = "📚 **Available Knowledge Base:**\n\n";
    
    relevantDocs.forEach(doc => {
      context += `**${doc.title}** (${doc.source})\n`;
      const summary = doc.metadata?.summary || doc.content.slice(0, 200) + '...';
      context += `${summary}\n`;
      if (doc.tags.length > 0) {
        context += `Tags: ${doc.tags.join(', ')}\n`;
      }
      context += `\n`;
    });

    context += `*${relevantDocs.length} documents available. Ask me to reference specific documents for detailed information.*`;
    
    return context;
  }
}

export const knowledgeBaseManager = new KnowledgeBaseManager();

// Auto-sync research documents to knowledge base
export async function syncResearchDocToKB(researchDoc: ResearchDoc): Promise<void> {
  try {
    await knowledgeBaseManager.addFromResearchDoc(researchDoc);
    console.log(`Research document "${researchDoc.title}" added to shared knowledge base`);
  } catch (error) {
    console.error('Failed to sync research doc to KB:', error);
  }
}