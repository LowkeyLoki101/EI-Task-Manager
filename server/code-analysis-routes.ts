import type { Express } from "express";
import { storage } from "./storage";
import { codeAnalyzer } from "./code-analysis";
import fs from "fs/promises";
import path from "path";
import { insertCodeRecommendationSchema, insertRecommendationVoteSchema, insertExportRequestSchema } from "@shared/schema";

export function registerCodeAnalysisRoutes(app: Express) {
  
  // **PROJECT ANALYSIS**
  
  // Trigger comprehensive project analysis
  app.post("/api/code-analysis/analyze", async (req, res) => {
    try {
      const { sessionId, targetPath } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      console.log(`[Code Analysis API] Starting analysis for session ${sessionId}`);
      
      // Perform intelligent analysis using GPT-5
      const analysis = await codeAnalyzer.analyzeProject(sessionId, targetPath || ".");
      
      res.json({
        success: true,
        analysis,
        message: `Generated ${analysis.recommendations.length} recommendations`
      });
    } catch (error) {
      console.error('[Code Analysis API] Analysis failed:', error);
      res.status(500).json({ 
        error: "Analysis failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Analyze specific file
  app.post("/api/code-analysis/analyze-file", async (req, res) => {
    try {
      const { sessionId, filePath } = req.body;
      
      if (!sessionId || !filePath) {
        return res.status(400).json({ error: "sessionId and filePath are required" });
      }

      const analysis = await codeAnalyzer.analyzeSpecificFile(sessionId, filePath);
      
      res.json({
        success: true,
        analysis,
        message: `Analyzed ${filePath} successfully`
      });
    } catch (error) {
      console.error('[Code Analysis API] File analysis failed:', error);
      res.status(500).json({ 
        error: "File analysis failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // **CODE RECOMMENDATIONS**
  
  // Get all recommendations for a session
  app.get("/api/code-recommendations/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { type, status, priority } = req.query;
      
      const recommendations = await storage.listCodeRecommendations(sessionId, {
        type: type as string,
        status: status as string,
        priority: priority as string,
      });
      
      res.json({ recommendations });
    } catch (error) {
      console.error('[Code Analysis API] Error fetching recommendations:', error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // Get specific recommendation with vote info
  app.get("/api/code-recommendations/:sessionId/:recommendationId", async (req, res) => {
    try {
      const { recommendationId, sessionId } = req.params;
      
      const recommendation = await storage.getCodeRecommendation(recommendationId);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      const votes = await storage.listRecommendationVotes(recommendationId);
      const userVote = await storage.getUserVoteForRecommendation(recommendationId, sessionId);
      
      res.json({ 
        recommendation, 
        votes: votes.length,
        userVote: userVote?.voteType || null 
      });
    } catch (error) {
      console.error('[Code Analysis API] Error fetching recommendation:', error);
      res.status(500).json({ error: "Failed to fetch recommendation" });
    }
  });

  // Update recommendation status (approve/reject)
  app.patch("/api/code-recommendations/:recommendationId", async (req, res) => {
    try {
      const { recommendationId } = req.params;
      const updates = req.body;
      
      const updated = await storage.updateCodeRecommendation(recommendationId, updates);
      
      // If approved, trigger development request
      if (updates.status === 'approved') {
        console.log(`[Code Analysis API] Recommendation ${recommendationId} approved - triggering development request`);
        // Here you could add logic to automatically create a development task
        // or send a message to the autonomous chat system
      }
      
      res.json({ recommendation: updated });
    } catch (error) {
      console.error('[Code Analysis API] Error updating recommendation:', error);
      res.status(500).json({ error: "Failed to update recommendation" });
    }
  });

  // **VOTING SYSTEM**
  
  // Vote on recommendation
  app.post("/api/code-recommendations/:recommendationId/vote", async (req, res) => {
    try {
      const { recommendationId } = req.params;
      const { sessionId, voteType, feedback } = req.body;
      
      // Validate vote data
      const voteData = insertRecommendationVoteSchema.parse({
        recommendationId,
        sessionId,
        voteType,
        feedback
      });
      
      // Check if user already voted
      const existingVote = await storage.getUserVoteForRecommendation(recommendationId, sessionId);
      if (existingVote) {
        return res.status(400).json({ error: "You have already voted on this recommendation" });
      }
      
      const vote = await storage.createRecommendationVote(voteData);
      const updatedRecommendation = await storage.getCodeRecommendation(recommendationId);
      
      res.json({ 
        vote, 
        recommendation: updatedRecommendation,
        message: `Vote recorded: ${voteType}` 
      });
    } catch (error) {
      console.error('[Code Analysis API] Error creating vote:', error);
      res.status(500).json({ error: "Failed to record vote" });
    }
  });

  // **FILE ANALYSIS**
  
  // Get file analysis results
  app.get("/api/file-analysis/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { filePath } = req.query;
      
      const analyses = await storage.listFileAnalysis(sessionId, filePath as string);
      
      res.json({ analyses });
    } catch (error) {
      console.error('[Code Analysis API] Error fetching file analyses:', error);
      res.status(500).json({ error: "Failed to fetch file analyses" });
    }
  });

  // **EXPORT FUNCTIONALITY**
  
  // Create export request
  app.post("/api/exports", async (req, res) => {
    try {
      const exportData = insertExportRequestSchema.parse(req.body);
      const exportRequest = await storage.createExportRequest(exportData);
      
      // Start async export processing
      processExportRequest(exportRequest.id);
      
      res.json({ 
        exportRequest,
        message: "Export request created successfully" 
      });
    } catch (error) {
      console.error('[Code Analysis API] Error creating export:', error);
      res.status(500).json({ error: "Failed to create export request" });
    }
  });

  // Get export requests
  app.get("/api/exports/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const exports = await storage.listExportRequests(sessionId);
      
      res.json({ exports });
    } catch (error) {
      console.error('[Code Analysis API] Error fetching exports:', error);
      res.status(500).json({ error: "Failed to fetch export requests" });
    }
  });

  // Download export file
  app.get("/api/exports/:exportId/download", async (req, res) => {
    try {
      const { exportId } = req.params;
      const exportRequest = await storage.getExportRequest(exportId);
      
      if (!exportRequest || exportRequest.status !== 'completed' || !exportRequest.fileUrl) {
        return res.status(404).json({ error: "Export file not found or not ready" });
      }

      const filePath = exportRequest.fileUrl;
      const fileName = exportRequest.fileName || `export-${exportId}.${exportRequest.exportType}`;
      
      res.download(filePath, fileName);
    } catch (error) {
      console.error('[Code Analysis API] Error downloading export:', error);
      res.status(500).json({ error: "Failed to download export file" });
    }
  });

  // **SYSTEM INSIGHTS**
  
  // Get comprehensive system insights
  app.get("/api/insights/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const [recommendations, analyses] = await Promise.all([
        storage.listCodeRecommendations(sessionId),
        storage.listFileAnalysis(sessionId)
      ]);

      // Generate insights summary
      const insights = {
        summary: {
          totalRecommendations: recommendations.length,
          highPriorityRecommendations: recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length,
          pendingRecommendations: recommendations.filter(r => r.status === 'pending').length,
          approvedRecommendations: recommendations.filter(r => r.status === 'approved').length,
          averageConfidence: recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length || 0,
          totalAnalyses: analyses.length
        },
        recentRecommendations: recommendations.slice(0, 10),
        topIssueTypes: getTopIssueTypes(analyses),
        recommendationsByType: getRecommendationsByType(recommendations),
        priorityDistribution: getPriorityDistribution(recommendations)
      };
      
      res.json({ insights });
    } catch (error) {
      console.error('[Code Analysis API] Error generating insights:', error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });
}

// **HELPER FUNCTIONS**

async function processExportRequest(exportId: string) {
  try {
    const exportRequest = await storage.getExportRequest(exportId);
    if (!exportRequest) return;

    // Update status to processing
    await storage.updateExportRequest(exportId, { status: 'processing' });

    // Generate export based on type and content
    const content = await generateExportContent(exportRequest);
    const fileName = `export-${Date.now()}.${exportRequest.exportType}`;
    const filePath = path.join('uploads', fileName);

    // Ensure uploads directory exists
    await fs.mkdir('uploads', { recursive: true });

    // Write content to file
    await fs.writeFile(filePath, content);

    // Update export request with completion
    await storage.updateExportRequest(exportId, {
      status: 'completed',
      fileUrl: filePath,
      fileName
    });

    console.log(`[Export] Completed export ${exportId} - ${fileName}`);
  } catch (error) {
    console.error(`[Export] Failed to process export ${exportId}:`, error);
    await storage.updateExportRequest(exportId, { status: 'error' });
  }
}

async function generateExportContent(exportRequest: any): Promise<string> {
  const { sessionId, contentType, exportType } = exportRequest;

  // Fetch data based on content type
  let data: any = {};
  
  if (contentType === 'recommendations' || contentType === 'all') {
    data.recommendations = await storage.listCodeRecommendations(sessionId);
  }
  if (contentType === 'analysis' || contentType === 'all') {
    data.analyses = await storage.listFileAnalysis(sessionId);
  }
  if (contentType === 'insights' || contentType === 'all') {
    data.insights = await storage.getSystemStats(sessionId);
  }

  // Generate content based on export type
  switch (exportType) {
    case 'json':
      return JSON.stringify(data, null, 2);
    
    case 'txt':
      return generateTextReport(data);
    
    case 'ts':
      return generateTypeScriptReport(data);
    
    case 'markdown':
      return generateMarkdownReport(data);
    
    default:
      throw new Error(`Unsupported export type: ${exportType}`);
  }
}

function generateTextReport(data: any): string {
  let report = `# Code Analysis Report
Generated: ${new Date().toISOString()}

`;

  if (data.recommendations) {
    report += `## Recommendations (${data.recommendations.length})\n\n`;
    data.recommendations.forEach((rec: any, i: number) => {
      report += `${i + 1}. ${rec.title}
   Type: ${rec.type}
   Priority: ${rec.priority}
   Status: ${rec.status}
   Description: ${rec.description}
   
`;
    });
  }

  if (data.insights) {
    report += `## System Stats
Total Tasks: ${data.insights.totalTasks}
Total Projects: ${data.insights.totalProjects}
Total Recommendations: ${data.insights.totalRecommendations}

`;
  }

  return report;
}

function generateTypeScriptReport(data: any): string {
  return `// Code Analysis Report - Generated ${new Date().toISOString()}

export interface AnalysisReport {
  timestamp: string;
  recommendations: CodeRecommendation[];
  insights: SystemInsights;
}

export const analysisReport: AnalysisReport = ${JSON.stringify({
  timestamp: new Date().toISOString(),
  recommendations: data.recommendations || [],
  insights: data.insights || {}
}, null, 2)};
`;
}

function generateMarkdownReport(data: any): string {
  let markdown = `# Code Analysis Report

**Generated:** ${new Date().toLocaleString()}

`;

  if (data.recommendations) {
    markdown += `## 📋 Recommendations (${data.recommendations.length})

`;
    data.recommendations.forEach((rec: any) => {
      markdown += `### ${rec.title}

- **Type:** ${rec.type}
- **Priority:** ${rec.priority} 
- **Status:** ${rec.status}
- **Confidence:** ${rec.confidence}/10

${rec.description}

**Reasoning:** ${rec.reasoning}

---

`;
    });
  }

  return markdown;
}

function getTopIssueTypes(analyses: any[]): any[] {
  const typeCounts: Record<string, number> = {};
  
  analyses.forEach(analysis => {
    if (analysis.issues) {
      analysis.issues.forEach((issue: any) => {
        typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;
      });
    }
  });

  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getRecommendationsByType(recommendations: any[]): any[] {
  const typeCounts: Record<string, number> = {};
  
  recommendations.forEach(rec => {
    typeCounts[rec.type] = (typeCounts[rec.type] || 0) + 1;
  });

  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }));
}

function getPriorityDistribution(recommendations: any[]): any[] {
  const priorityCounts: Record<string, number> = {};
  
  recommendations.forEach(rec => {
    priorityCounts[rec.priority] = (priorityCounts[rec.priority] || 0) + 1;
  });

  return Object.entries(priorityCounts)
    .map(([priority, count]) => ({ priority, count }));
}