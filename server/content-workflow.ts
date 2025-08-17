// Content Workflow System - Draft Cache & Approval Pipeline
import type { Express } from "express";
import { storage } from './storage';
import { z } from 'zod';

// Content approval workflow schemas
const approveContentSchema = z.object({
  entryId: z.string(),
  action: z.enum(['approve', 'reject']),
  approvedBy: z.enum(['ai', 'human']),
  reason: z.string().optional()
});

const bulkApprovalSchema = z.object({
  entryIds: z.array(z.string()),
  action: z.enum(['approve', 'reject', 'publish']),
  approvedBy: z.enum(['ai', 'human'])
});

const userPreferencesSchema = z.object({
  autoApprovalEnabled: z.boolean().default(false),
  autoApprovalThreshold: z.number().min(0).max(1).default(0.8), // AI confidence threshold
  approvalWorkflow: z.enum(['human-only', 'ai-only', 'hybrid']).default('hybrid'),
  contentTypes: z.array(z.enum(['blog', 'social', 'newsletter'])).default(['blog', 'social'])
});

export function registerContentWorkflowRoutes(app: Express) {
  
  // Get content drafts (knowledge base entries with status = 'draft')
  app.get('/api/content-workflow/drafts/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { status = 'draft', contentType } = req.query;
      
      // Get drafts from knowledge base
      const { getKnowledgeEntries } = await import('./kb-storage');
      const drafts = await getKnowledgeEntries(sessionId, {
        status: status as string,
        contentType: contentType as string
      });
      
      console.log(`[Content Workflow] Retrieved ${drafts.length} drafts for session ${sessionId}`);
      res.json({ drafts, total: drafts.length });
    } catch (error) {
      console.error('[Content Workflow] Failed to get drafts:', error);
      res.status(500).json({ error: 'Failed to retrieve content drafts' });
    }
  });

  // Approve or reject content draft
  app.post('/api/content-workflow/approve', async (req, res) => {
    try {
      const validatedData = approveContentSchema.parse(req.body);
      const { entryId, action, approvedBy, reason } = validatedData;
      
      // Update knowledge base entry status
      const { updateKnowledgeEntry } = await import('./kb-storage');
      const updatedEntry = await updateKnowledgeEntry(entryId, {
        approvalStatus: action === 'approve' ? 'approved' : 'rejected',
        approvedBy,
        status: action === 'approve' ? 'approved' : 'rejected',
        metadata: {
          approvalReason: reason,
          approvalTimestamp: new Date().toISOString()
        }
      });

      // If approved and it's a blog draft, create blog post
      if (action === 'approve' && updatedEntry?.contentType === 'blog') {
        await createBlogFromDraft(updatedEntry);
      }

      console.log(`[Content Workflow] ${action} content ${entryId} by ${approvedBy}`);
      res.json({ success: true, entry: updatedEntry });
    } catch (error) {
      console.error('[Content Workflow] Approval failed:', error);
      res.status(500).json({ error: 'Failed to process approval' });
    }
  });

  // Bulk approval for multiple drafts
  app.post('/api/content-workflow/bulk-approve', async (req, res) => {
    try {
      const validatedData = bulkApprovalSchema.parse(req.body);
      const { entryIds, action, approvedBy } = validatedData;
      
      const results = [];
      
      for (const entryId of entryIds) {
        try {
          const { updateKnowledgeEntry } = await import('./kb-storage');
          const updatedEntry = await updateKnowledgeEntry(entryId, {
            approvalStatus: action === 'approve' ? 'approved' : 'rejected',
            approvedBy,
            status: action === 'approve' ? 'approved' : 'rejected',
            metadata: {
              bulkApprovalTimestamp: new Date().toISOString()
            }
          });

          // If approved and it's a blog draft, create blog post
          if (action === 'approve' && updatedEntry?.contentType === 'blog') {
            await createBlogFromDraft(updatedEntry);
          }

          results.push({ entryId, success: true });
        } catch (error) {
          results.push({ entryId, success: false, error: error.message });
        }
      }

      console.log(`[Content Workflow] Bulk ${action} completed: ${results.filter(r => r.success).length}/${entryIds.length} successful`);
      res.json({ results, total: entryIds.length });
    } catch (error) {
      console.error('[Content Workflow] Bulk approval failed:', error);
      res.status(500).json({ error: 'Failed to process bulk approval' });
    }
  });

  // Download draft as file
  app.get('/api/content-workflow/download/:entryId', async (req, res) => {
    try {
      const { entryId } = req.params;
      const { format = 'markdown' } = req.query;
      
      const entry = await storage.getKnowledgeEntry(entryId);
      if (!entry) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      const filename = `${entry.topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${format}`;
      let content = entry.content;
      let mimeType = 'text/plain';

      // Format content based on requested format
      switch (format) {
        case 'markdown':
          content = `# ${entry.topic}\n\n${entry.content}`;
          mimeType = 'text/markdown';
          break;
        case 'html':
          content = `<!DOCTYPE html><html><head><title>${entry.topic}</title></head><body><h1>${entry.topic}</h1><div>${entry.content.replace(/\n/g, '<br>')}</div></body></html>`;
          mimeType = 'text/html';
          break;
        case 'json':
          content = JSON.stringify(entry, null, 2);
          mimeType = 'application/json';
          break;
        default:
          content = entry.content;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', mimeType);
      res.send(content);

      console.log(`[Content Workflow] Downloaded draft ${entryId} as ${format}`);
    } catch (error) {
      console.error('[Content Workflow] Download failed:', error);
      res.status(500).json({ error: 'Failed to download draft' });
    }
  });

  // Get user approval preferences
  app.get('/api/content-workflow/preferences/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Get preferences from user session or default
      const preferences = {
        autoApprovalEnabled: false,
        autoApprovalThreshold: 0.8,
        approvalWorkflow: 'hybrid',
        contentTypes: ['blog', 'social', 'newsletter']
      };

      res.json({ preferences });
    } catch (error) {
      console.error('[Content Workflow] Failed to get preferences:', error);
      res.status(500).json({ error: 'Failed to get user preferences' });
    }
  });

  // Update user approval preferences
  app.post('/api/content-workflow/preferences/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const validatedPreferences = userPreferencesSchema.parse(req.body);
      
      // Store preferences (in production, save to user profile)
      console.log(`[Content Workflow] Updated preferences for ${sessionId}:`, validatedPreferences);
      
      res.json({ success: true, preferences: validatedPreferences });
    } catch (error) {
      console.error('[Content Workflow] Failed to update preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // AI Auto-Approval for high-quality content
  app.post('/api/content-workflow/ai-review/:entryId', async (req, res) => {
    try {
      const { entryId } = req.params;
      
      const { getKnowledgeEntry } = await import('./kb-storage');
      const entry = await getKnowledgeEntry(entryId);
      if (!entry) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      // AI quality assessment (placeholder - integrate with OpenAI for real assessment)
      const qualityScore = await assessContentQuality(entry.content, entry.contentType);
      
      if (qualityScore > 0.8) {
        // Auto-approve high-quality content
        const { updateKnowledgeEntry } = await import('./kb-storage');
        const updatedEntry = await updateKnowledgeEntry(entryId, {
          approvalStatus: 'auto-approved',
          approvedBy: 'ai',
          status: 'approved',
          metadata: {
            aiQualityScore: qualityScore,
            autoApprovalTimestamp: new Date().toISOString()
          }
        });

        // Create blog if it's blog content
        if (entry.contentType === 'blog') {
          await createBlogFromDraft(updatedEntry);
        }

        console.log(`[Content Workflow] AI auto-approved ${entryId} with quality score ${qualityScore}`);
        res.json({ success: true, autoApproved: true, qualityScore, entry: updatedEntry });
      } else {
        console.log(`[Content Workflow] AI review requires human approval for ${entryId} (quality: ${qualityScore})`);
        res.json({ success: true, autoApproved: false, qualityScore, requiresHumanReview: true });
      }
    } catch (error) {
      console.error('[Content Workflow] AI review failed:', error);
      res.status(500).json({ error: 'Failed to perform AI review' });
    }
  });
}

// Helper function to create blog post from approved draft
async function createBlogFromDraft(entry: any) {
  try {
    const blogPost = await storage.createBlogPost({
      sessionId: entry.sessionId,
      title: entry.topic,
      slug: generateSlug(entry.topic),
      excerpt: extractExcerpt(entry.content),
      content: entry.content,
      status: 'published',
      source: 'ai-research',
      tags: entry.tags || [],
      metadata: {
        sourceKnowledgeEntry: entry.id,
        contentType: entry.contentType,
        platforms: entry.platforms,
        approvalWorkflow: true,
        ...entry.metadata
      },
      publishedAt: new Date()
    });

    console.log(`[Content Workflow] Created blog post from draft: ${blogPost.title}`);
    return blogPost;
  } catch (error) {
    console.error('[Content Workflow] Failed to create blog from draft:', error);
    throw error;
  }
}

// Helper function to assess content quality using AI
async function assessContentQuality(content: string, contentType?: string): Promise<number> {
  // Placeholder quality assessment - integrate with OpenAI for real assessment
  // For now, return a score based on content length and basic characteristics
  const wordCount = content.split(' ').length;
  const hasGoodStructure = content.includes('\n') || content.includes('.');
  const isReasonableLength = wordCount > 50 && wordCount < 2000;
  
  let score = 0.5; // Base score
  
  if (wordCount > 100) score += 0.2;
  if (hasGoodStructure) score += 0.2;
  if (isReasonableLength) score += 0.1;
  
  return Math.min(score, 1.0);
}

// Utility functions
function generateSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function extractExcerpt(content: string): string {
  return content.split('\n').find(line => line.length > 50)?.substring(0, 200) + '...' || '';
}