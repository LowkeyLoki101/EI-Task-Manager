import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import type { Express } from "express";
import { storage } from "./storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CodeAnalysisResult {
  summary: string;
  issues: Array<{
    type: 'bug' | 'security' | 'performance' | 'style' | 'maintainability';
    severity: 'low' | 'medium' | 'high' | 'critical';
    file: string;
    line?: number;
    description: string;
    suggestion: string;
  }>;
  recommendations: Array<{
    type: 'improvement' | 'bug_fix' | 'feature' | 'optimization' | 'security' | 'refactor';
    title: string;
    description: string;
    reasoning: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedEffort: 'quick' | 'moderate' | 'substantial' | 'major';
    codeSnippet?: string;
    filePath?: string;
  }>;
  complexity: number; // 1-10 scale
  maintainability: number; // 1-10 scale
  confidenceScore: number; // 1-10 scale
}

class IntelligentCodeAnalyzer {
  private fileSystemCache = new Map<string, { content: string; lastModified: number }>();

  async analyzeProject(sessionId: string, targetPath: string = "."): Promise<CodeAnalysisResult> {
    console.log(`[Code Analysis] Starting comprehensive analysis for session ${sessionId}`);
    
    // Read project files
    const projectFiles = await this.scanProjectFiles(targetPath);
    const codebase = await this.buildCodebaseContext(projectFiles);
    
    // Generate intelligent analysis using GPT-5
    const analysis = await this.performIntelligentAnalysis(codebase, sessionId);
    
    // Store analysis results and create recommendations
    await this.storeAnalysisResults(sessionId, analysis, projectFiles);
    
    return analysis;
  }

  private async scanProjectFiles(targetPath: string): Promise<Array<{ path: string; content: string; type: string }>> {
    const files: Array<{ path: string; content: string; type: string }> = [];
    
    const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.scss'];
    const ignorePaths = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
    
    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(targetPath, entry.name);
        
        if (entry.isDirectory() && !ignorePaths.includes(entry.name)) {
          const subFiles = await this.scanProjectFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (allowedExtensions.includes(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              files.push({
                path: fullPath,
                content,
                type: this.getFileType(ext)
              });
            } catch (error) {
              console.warn(`[Code Analysis] Could not read file ${fullPath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[Code Analysis] Could not scan directory ${targetPath}:`, error);
    }
    
    return files;
  }

  private getFileType(extension: string): string {
    switch (extension) {
      case '.ts': case '.tsx': return 'typescript';
      case '.js': case '.jsx': return 'javascript';
      case '.json': return 'json';
      case '.md': return 'markdown';
      case '.css': case '.scss': return 'styles';
      default: return 'other';
    }
  }

  private async buildCodebaseContext(files: Array<{ path: string; content: string; type: string }>): Promise<string> {
    let context = "# Codebase Analysis Context\n\n";
    
    // Group files by type for better analysis
    const filesByType = files.reduce((acc, file) => {
      if (!acc[file.type]) acc[file.type] = [];
      acc[file.type].push(file);
      return acc;
    }, {} as Record<string, typeof files>);

    // Add file structure overview
    context += "## Project Structure\n";
    for (const [type, typeFiles] of Object.entries(filesByType)) {
      context += `\n### ${type.toUpperCase()} Files (${typeFiles.length})\n`;
      typeFiles.forEach(file => {
        context += `- ${file.path}\n`;
      });
    }

    // Add key file contents (limit size for API)
    context += "\n## Key File Contents\n";
    for (const file of files.slice(0, 20)) { // Limit to first 20 files
      const truncatedContent = file.content.length > 2000 
        ? file.content.substring(0, 2000) + "... [truncated]"
        : file.content;
      
      context += `\n### ${file.path}\n`;
      context += "```" + file.type + "\n" + truncatedContent + "\n```\n";
    }

    return context;
  }

  private async performIntelligentAnalysis(codebase: string, sessionId: string): Promise<CodeAnalysisResult> {
    const systemPrompt = `You are an expert software architect and code reviewer with deep knowledge of TypeScript, React, Node.js, and modern web development practices. 

Analyze the provided codebase and provide a comprehensive analysis including:

1. **Issues**: Identify potential bugs, security vulnerabilities, performance issues, style problems, and maintainability concerns
2. **Recommendations**: Suggest specific improvements, optimizations, new features, and refactoring opportunities
3. **Metrics**: Rate complexity and maintainability on a 1-10 scale
4. **Confidence**: Rate your confidence in the analysis on a 1-10 scale

Focus on:
- Code quality and best practices
- Security vulnerabilities
- Performance optimization opportunities  
- Architecture improvements
- User experience enhancements
- Developer experience improvements
- Potential new features that would add value

Be specific, actionable, and prioritize recommendations by impact and effort required.`;

    const userPrompt = `Please analyze this codebase comprehensively:

${codebase}

Return a detailed JSON response with the following structure:
{
  "summary": "Brief overview of the codebase analysis",
  "issues": [
    {
      "type": "bug|security|performance|style|maintainability",
      "severity": "low|medium|high|critical", 
      "file": "path/to/file",
      "line": 123,
      "description": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "recommendations": [
    {
      "type": "improvement|bug_fix|feature|optimization|security|refactor",
      "title": "Recommendation title",
      "description": "Detailed description", 
      "reasoning": "Why this matters",
      "priority": "low|medium|high|critical",
      "estimatedEffort": "quick|moderate|substantial|major",
      "codeSnippet": "Optional code example",
      "filePath": "Optional specific file path"
    }
  ],
  "complexity": 7,
  "maintainability": 8,
  "confidenceScore": 9
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }

      const analysis = JSON.parse(jsonMatch[0]) as CodeAnalysisResult;
      
      console.log(`[Code Analysis] Generated ${analysis.recommendations.length} recommendations and found ${analysis.issues.length} issues`);
      
      return analysis;
    } catch (error) {
      console.error('[Code Analysis] Error performing analysis:', error);
      
      // Return fallback analysis
      return {
        summary: "Code analysis failed - using fallback assessment",
        issues: [],
        recommendations: [{
          type: 'improvement',
          title: 'Code Analysis System',
          description: 'The automated code analysis encountered an error. Manual review recommended.',
          reasoning: 'System reliability and error handling improvement needed.',
          priority: 'medium',
          estimatedEffort: 'moderate'
        }],
        complexity: 5,
        maintainability: 5,
        confidenceScore: 3
      };
    }
  }

  private async storeAnalysisResults(sessionId: string, analysis: CodeAnalysisResult, files: Array<{ path: string; content: string; type: string }>): Promise<void> {
    try {
      // Store file analysis record
      await storage.createFileAnalysis({
        sessionId,
        filePath: "project_root",
        fileType: "project",
        fileSize: files.reduce((sum, f) => sum + f.content.length, 0),
        analysisType: "code_review",
        summary: analysis.summary,
        details: { analysis, fileCount: files.length },
        issues: analysis.issues,
        suggestions: analysis.recommendations,
        complexity: analysis.complexity,
        maintainability: analysis.maintainability,
        status: "completed"
      });

      // Create individual recommendations
      for (const rec of analysis.recommendations) {
        await storage.createCodeRecommendation({
          sessionId,
          type: rec.type,
          title: rec.title,
          description: rec.description,
          recommendation: rec.description,
          reasoning: rec.reasoning,
          priority: rec.priority,
          estimatedEffort: rec.estimatedEffort,
          filePath: rec.filePath,
          codeSnippet: rec.codeSnippet,
          confidence: analysis.confidenceScore,
          tags: [rec.type, rec.priority],
          metadata: { analysisId: Date.now().toString() }
        });
      }

      console.log(`[Code Analysis] Stored analysis with ${analysis.recommendations.length} recommendations`);
    } catch (error) {
      console.error('[Code Analysis] Error storing results:', error);
    }
  }

  async analyzeSpecificFile(sessionId: string, filePath: string): Promise<CodeAnalysisResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const singleFileContext = `# Single File Analysis\n\n## ${filePath}\n\`\`\`\n${content}\n\`\`\``;
      
      return await this.performIntelligentAnalysis(singleFileContext, sessionId);
    } catch (error) {
      console.error(`[Code Analysis] Error analyzing file ${filePath}:`, error);
      throw error;
    }
  }
}

export const codeAnalyzer = new IntelligentCodeAnalyzer();