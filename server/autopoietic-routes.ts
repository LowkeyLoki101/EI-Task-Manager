import type { Express } from "express";
import { getAutopoieticDiary } from "./autopoietic-diary";
import { KnowledgeBaseSystem } from "./knowledge-base-system";
import { createKbEntrySchema, triggerLensProcessingSchema, updateSelfQuestionSchema } from "@shared/kb-schema";

export function registerAutopoieticRoutes(app: Express) {
  console.log('[AutopoieticRoutes] Registering autopoietic diary routes...');

  // Start/Stop autonomous loop
  app.post("/api/autopoietic/start/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { intervalMinutes = 30 } = req.body;

      const diary = getAutopoieticDiary(sessionId);
      await diary.startAutonomousLoop(intervalMinutes);

      res.json({
        success: true,
        message: `Autopoietic diary started for session ${sessionId}`,
        intervalMinutes
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error starting diary:', error);
      res.status(500).json({
        error: "Failed to start autopoietic diary",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/autopoietic/stop/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;

      const diary = getAutopoieticDiary(sessionId);
      diary.stopAutonomousLoop();

      res.json({
        success: true,
        message: `Autopoietic diary stopped for session ${sessionId}`
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error stopping diary:', error);
      res.status(500).json({
        error: "Failed to stop autopoietic diary",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual trigger
  app.post("/api/autopoietic/trigger/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { trigger } = req.body;

      const diary = getAutopoieticDiary(sessionId);
      const result = await diary.manualThinkingCycle(trigger);

      res.json({
        success: true,
        message: "Manual thinking cycle completed",
        result
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error in manual trigger:', error);
      res.status(500).json({
        error: "Failed to run manual thinking cycle",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get status
  app.get("/api/autopoietic/status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;

      const diary = getAutopoieticDiary(sessionId);
      const status = await diary.getStatus();

      res.json(status);
    } catch (error) {
      console.error('[AutopoieticRoutes] Error getting status:', error);
      res.status(500).json({
        error: "Failed to get autopoietic diary status",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Knowledge Base Routes
  app.post("/api/kb/entries", async (req, res) => {
    try {
      const validatedData = createKbEntrySchema.parse(req.body);
      
      const kbSystem = new KnowledgeBaseSystem(validatedData.sessionId);
      const entry = await kbSystem.createKbEntry(validatedData);

      res.json({
        success: true,
        entry
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error creating Knowledge Base entry:', error);
      res.status(500).json({
        error: "Failed to create knowledge base entry",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/kb/entries/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { source, tags, limit } = req.query;

      const filters: any = {};
      if (source) filters.source = source as string;
      if (tags) filters.tags = (tags as string).split(',');
      if (limit) filters.limit = parseInt(limit as string);

      const kbSystem = new KnowledgeBaseSystem(sessionId);
      const entries = await kbSystem.listKbEntries(filters);

      res.json({
        entries,
        count: entries.length
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error listing Knowledge Base entries:', error);
      res.status(500).json({
        error: "Failed to list knowledge base entries",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/kb/entries/:sessionId/:id", async (req, res) => {
    try {
      const { sessionId, id } = req.params;

      const kbSystem = new KnowledgeBaseSystem(sessionId);
      const entry = await kbSystem.getKbEntry(id);

      if (!entry) {
        return res.status(404).json({ error: "Knowledge base entry not found" });
      }

      res.json({ entry });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error getting Knowledge Base entry:', error);
      res.status(500).json({
        error: "Failed to get knowledge base entry",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Self-Question Pool Routes
  app.get("/api/kb/questions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;

      const kbSystem = new KnowledgeBaseSystem(sessionId);
      const questions = await kbSystem.getSelfQuestions();

      res.json({
        questions: questions.filter(q => !q.retired),
        total: questions.length,
        active: questions.filter(q => !q.retired).length
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error getting self-questions:', error);
      res.status(500).json({
        error: "Failed to get self-questions",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/kb/questions/:sessionId/random", async (req, res) => {
    try {
      const { sessionId } = req.params;

      const kbSystem = new KnowledgeBaseSystem(sessionId);
      const question = await kbSystem.getRandomSelfQuestion();

      if (!question) {
        return res.status(404).json({ error: "No active self-questions available" });
      }

      res.json({ question });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error getting random question:', error);
      res.status(500).json({
        error: "Failed to get random self-question",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.patch("/api/kb/questions/:sessionId/:id", async (req, res) => {
    try {
      const { sessionId, id } = req.params;
      const updates = updateSelfQuestionSchema.parse(req.body);

      const kbSystem = new KnowledgeBaseSystem(sessionId);
      
      // Convert updates to proper format
      const formattedUpdates: any = {};
      if (updates.effectiveness) formattedUpdates.effectiveness = updates.effectiveness;
      if (updates.useCount) formattedUpdates.useCount = updates.useCount;
      if (updates.retired) formattedUpdates.retired = new Date();

      await kbSystem.updateSelfQuestion(id, formattedUpdates);

      res.json({
        success: true,
        message: "Self-question updated successfully"
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error updating self-question:', error);
      res.status(500).json({
        error: "Failed to update self-question",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Self-Question Evolution
  app.post("/api/kb/questions/:sessionId/evolve", async (req, res) => {
    try {
      const { sessionId } = req.params;

      const kbSystem = new KnowledgeBaseSystem(sessionId);
      await kbSystem.evolveSelfQuestions();

      res.json({
        success: true,
        message: "Self-questions evolved successfully"
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error evolving self-questions:', error);
      res.status(500).json({
        error: "Failed to evolve self-questions",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual Lens Processing
  app.post("/api/kb/lens/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { trigger } = triggerLensProcessingSchema.parse({ sessionId, ...req.body });

      const kbSystem = new KnowledgeBaseSystem(sessionId);
      const lensSession = await kbSystem.processWithColbyLens(trigger);

      res.json({
        success: true,
        lensSession
      });
    } catch (error) {
      console.error('[AutopoieticRoutes] Error processing with lens:', error);
      res.status(500).json({
        error: "Failed to process with Colby lens",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log('[AutopoieticRoutes] Autopoietic diary routes registered successfully');
}