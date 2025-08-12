import type { Express } from "express";
import { knowledgeBaseManager } from "./knowledge-base-manager";
import multer from "multer";
import { join } from "path";

const upload = multer({
  dest: './data/exports/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for knowledge base files
});

export function registerKnowledgeBaseRoutes(app: Express) {

  // Search knowledge base
  app.get("/api/knowledge-base/search", async (req, res) => {
    try {
      const { q: query, sessionId, type, tags, category, startDate, endDate } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }
      
      const filters: any = {};
      if (type) filters.type = type;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
      if (category) filters.category = category;
      if (startDate && endDate) {
        filters.dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };
      }

      const results = await knowledgeBaseManager.searchEntries(
        query as string || "",
        sessionId as string,
        filters
      );
      
      res.json({
        results,
        total: results.length,
        query: query || ""
      });
    } catch (error) {
      console.error("Knowledge base search error:", error);
      res.status(500).json({ error: "Failed to search knowledge base" });
    }
  });

  // Add entry to knowledge base
  app.post("/api/knowledge-base/entries", async (req, res) => {
    try {
      const { title, content, type, sessionId, metadata } = req.body;
      
      if (!title || !content || !sessionId) {
        return res.status(400).json({ error: "title, content, and sessionId are required" });
      }

      const entry = await knowledgeBaseManager.addEntry({
        title,
        content,
        type: type || 'document',
        sessionId,
        metadata: {
          tags: metadata?.tags || [],
          category: metadata?.category || 'General',
          priority: metadata?.priority,
          source: 'manual',
          customFields: metadata?.customFields || {}
        }
      });

      res.json({ success: true, entry });
    } catch (error) {
      console.error("Knowledge base add entry error:", error);
      res.status(500).json({ error: "Failed to add entry" });
    }
  });

  // Get knowledge base statistics
  app.get("/api/knowledge-base/statistics", async (req, res) => {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const statistics = await knowledgeBaseManager.getStatistics(sessionId as string);
      res.json(statistics);
    } catch (error) {
      console.error("Knowledge base statistics error:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  // Export knowledge base as zip
  app.post("/api/knowledge-base/export", async (req, res) => {
    try {
      const { sessionId, description } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const filename = await knowledgeBaseManager.exportToZip(sessionId, description);
      res.json({ 
        success: true, 
        filename,
        message: "Knowledge base exported successfully" 
      });
    } catch (error) {
      console.error("Knowledge base export error:", error);
      res.status(500).json({ error: "Failed to export knowledge base" });
    }
  });

  // Import knowledge base from zip
  app.post("/api/knowledge-base/import", upload.single('zipFile'), async (req, res) => {
    try {
      const { sessionId, mergeStrategy = 'merge' } = req.body;
      const file = req.file;
      
      if (!sessionId || !file) {
        return res.status(400).json({ error: "sessionId and zipFile are required" });
      }

      const stats = await knowledgeBaseManager.importFromZip(
        file.filename,
        sessionId,
        mergeStrategy
      );

      res.json({
        success: true,
        stats,
        message: `Import completed: ${stats.imported} imported, ${stats.merged} merged, ${stats.skipped} skipped`
      });
    } catch (error) {
      console.error("Knowledge base import error:", error);
      res.status(500).json({ error: "Failed to import knowledge base" });
    }
  });

  // List available exports
  app.get("/api/knowledge-base/exports", async (req, res) => {
    try {
      const exports = await knowledgeBaseManager.listExports();
      res.json({ exports });
    } catch (error) {
      console.error("List exports error:", error);
      res.status(500).json({ error: "Failed to list exports" });
    }
  });

  // Download export file
  app.get("/api/knowledge-base/exports/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const filepath = join('./data/exports', filename);
      
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error("Download error:", err);
          res.status(404).json({ error: "Export file not found" });
        }
      });
    } catch (error) {
      console.error("Download export error:", error);
      res.status(500).json({ error: "Failed to download export" });
    }
  });

  // Auto-capture endpoints - these integrate with existing systems

  // Auto-capture task to knowledge base
  app.post("/api/knowledge-base/capture/task", async (req, res) => {
    try {
      const { taskId, sessionId } = req.body;
      
      if (!taskId || !sessionId) {
        return res.status(400).json({ error: "taskId and sessionId are required" });
      }

      // This would be called when tasks are created/updated
      // For now, we'll just acknowledge the capture request
      res.json({ success: true, message: "Task capture registered" });
    } catch (error) {
      console.error("Task capture error:", error);
      res.status(500).json({ error: "Failed to capture task" });
    }
  });

  // Auto-capture conversation to knowledge base
  app.post("/api/knowledge-base/capture/conversation", async (req, res) => {
    try {
      const { conversationId, sessionId } = req.body;
      
      if (!conversationId || !sessionId) {
        return res.status(400).json({ error: "conversationId and sessionId are required" });
      }

      // This would be called when conversations are saved
      res.json({ success: true, message: "Conversation capture registered" });
    } catch (error) {
      console.error("Conversation capture error:", error);
      res.status(500).json({ error: "Failed to capture conversation" });
    }
  });
}