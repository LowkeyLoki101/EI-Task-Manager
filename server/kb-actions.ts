// Knowledge Base Actions - Direct AI Integration
import type { Express } from "express";
import { z } from 'zod';

// Knowledge base entry creation schema
const createKbEntrySchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  content: z.string(),
  source: z.enum(['ai-research', 'content-draft', 'manual', 'completion-cycle']).default('ai-research'),
  contentType: z.enum(['research', 'blog', 'social', 'newsletter', 'document']).optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

export function registerKnowledgeBaseActions(app: Express) {
  
  // Create knowledge base entry (AI can call this directly)
  app.post('/api/kb/create', async (req, res) => {
    try {
      const validatedData = createKbEntrySchema.parse(req.body);
      const { sessionId, title, content, source, contentType, tags, metadata } = validatedData;
      
      // Save to knowledge base storage
      const { saveKnowledgeEntry } = await import('./kb-storage');
      
      const entry = await saveKnowledgeEntry({
        sessionId,
        topic: title,
        content,
        source: source as any,
        status: 'active',
        contentType,
        platforms: [],
        approvalStatus: 'approved', // Auto-approve AI research entries
        tags,
        metadata: {
          ...metadata,
          createdByAI: true,
          createdAt: new Date().toISOString()
        }
      });

      console.log(`[KB Actions] ✅ Created knowledge base entry: ${title}`);
      res.json({ 
        success: true, 
        entry: {
          id: entry.id,
          title,
          content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          source,
          contentType,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[KB Actions] Failed to create entry:', error);
      res.status(500).json({ error: 'Failed to create knowledge base entry' });
    }
  });

  // Get knowledge base entries for a session
  app.get('/api/kb/entries/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { limit = 20, source, contentType } = req.query;
      
      const { getKnowledgeEntries } = await import('./kb-storage');
      
      const entries = await getKnowledgeEntries(sessionId, {
        limit: Number(limit),
        source: source as string,
        contentType: contentType as string
      });

      res.json({ entries, total: entries.length });
    } catch (error) {
      console.error('[KB Actions] Failed to get entries:', error);
      res.status(500).json({ error: 'Failed to get knowledge base entries' });
    }
  });

  // Convert completed task to knowledge base entry
  app.post('/api/kb/convert-task', async (req, res) => {
    try {
      const { taskId, sessionId } = req.body;
      
      // Get task from storage
      const { storage } = await import('./storage');
      const tasks = await storage.getTasks(sessionId);
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Convert task to knowledge base entry
      const { saveKnowledgeEntry } = await import('./kb-storage');
      
      const entry = await saveKnowledgeEntry({
        sessionId,
        topic: task.title,
        content: `# ${task.title}\n\n${task.context || 'Task completed successfully.'}\n\n## Status\nCompleted\n\n## Metadata\n- Task ID: ${task.id}\n- Converted to knowledge base: ${new Date().toISOString()}`,
        source: 'completion-cycle',
        status: 'active',
        contentType: 'document',
        platforms: [],
        approvalStatus: 'approved',
        tags: ['task-completion', 'converted', task.context || 'general'],
        metadata: {
          originalTaskId: task.id,
          taskTitle: task.title,
          taskContext: task.context,
          convertedAt: new Date().toISOString(),
          convertedByAI: true
        }
      });

      console.log(`[KB Actions] ✅ Converted task "${task.title}" to knowledge base entry`);
      res.json({ success: true, entry, task });
    } catch (error) {
      console.error('[KB Actions] Failed to convert task:', error);
      res.status(500).json({ error: 'Failed to convert task to knowledge base entry' });
    }
  });
}