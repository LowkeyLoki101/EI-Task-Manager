/**
 * Enhanced Diary API Routes
 * Provides endpoints for the new autonomous diary system with context awareness
 */

import type { Express } from 'express';
import { gptDiary } from './gpt-diary';

export function registerDiaryRoutes(app: Express) {
  // Get enhanced diary entries
  app.get('/api/diary/enhanced/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const entries = gptDiary.getEnhancedEntries(sessionId, limit);
      
      res.json({
        success: true,
        entries,
        total: entries.length
      });
    } catch (error) {
      console.error('[Diary API] Failed to get enhanced entries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve diary entries'
      });
    }
  });

  // Get all enhanced diary entries (no session filter)
  app.get('/api/diary/enhanced', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      
      const entries = gptDiary.getEnhancedEntries(undefined, limit);
      
      res.json({
        success: true,
        entries,
        total: entries.length
      });
    } catch (error) {
      console.error('[Diary API] Failed to get all enhanced entries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve diary entries'
      });
    }
  });

  // Create manual diary entry
  app.post('/api/diary/manual', async (req, res) => {
    try {
      const { sessionId, mode } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }

      const entry = await gptDiary.createManualEntry(sessionId, mode);
      
      res.json({
        success: true,
        entry,
        message: `Created ${entry.mode} ${entry.type} entry: "${entry.title}"`
      });
    } catch (error) {
      console.error('[Diary API] Failed to create manual entry:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create diary entry'
      });
    }
  });

  // Get autonomy status
  app.get('/api/diary/autonomy/status', async (req, res) => {
    try {
      const status = gptDiary.getAutonomyStatus();
      
      res.json({
        success: true,
        status
      });
    } catch (error) {
      console.error('[Diary API] Failed to get autonomy status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve autonomy status'
      });
    }
  });

  // Search diary entries
  app.get('/api/diary/search', async (req, res) => {
    try {
      const { q: query, limit = 20 } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required'
        });
      }

      const entries = gptDiary.searchDiary(query, parseInt(limit as string));
      
      res.json({
        success: true,
        entries,
        query,
        total: entries.length
      });
    } catch (error) {
      console.error('[Diary API] Failed to search entries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search diary entries'
      });
    }
  });

  // Export diary as markdown
  app.get('/api/diary/export/markdown', async (req, res) => {
    try {
      const markdown = gptDiary.exportAsMarkdown();
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="gpt-diary.md"');
      res.send(markdown);
    } catch (error) {
      console.error('[Diary API] Failed to export markdown:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export diary'
      });
    }
  });

  // Get diary statistics
  app.get('/api/diary/stats', async (req, res) => {
    try {
      const memory = gptDiary.getMemory();
      const autonomyStatus = gptDiary.getAutonomyStatus();
      
      // Calculate statistics
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const enhancedThisWeek = memory.enhancedDiary.filter(
        entry => entry.timestamp > weekAgo
      ).length;
      
      const enhancedThisMonth = memory.enhancedDiary.filter(
        entry => entry.timestamp > monthAgo
      ).length;

      // Mode distribution
      const modeStats = memory.enhancedDiary.reduce((acc, entry) => {
        acc[entry.mode] = (acc[entry.mode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Type distribution  
      const typeStats = memory.enhancedDiary.reduce((acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        success: true,
        stats: {
          total: {
            enhanced: memory.enhancedDiary.length,
            legacy: memory.diary.length
          },
          recent: {
            thisWeek: enhancedThisWeek,
            thisMonth: enhancedThisMonth
          },
          distribution: {
            modes: modeStats,
            types: typeStats
          },
          autonomy: autonomyStatus
        }
      });
    } catch (error) {
      console.error('[Diary API] Failed to get stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve diary statistics'
      });
    }
  });

  console.log('[Diary Routes] Enhanced diary API routes registered');
}