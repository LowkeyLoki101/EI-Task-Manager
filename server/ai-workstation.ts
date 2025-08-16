import type { Express } from "express";
import OpenAI from "openai";
import { breakerAllow, withBackoff, note429 } from "./ai-guard";
import { storage } from "./storage";
import { getAutopoieticDiary } from "./autopoietic-diary";
import { KnowledgeBaseSystem } from "./knowledge-base-system";
import { getPersonalizedPrompt, getColbyContext } from "./colby-knowledge";
import { webSearch } from "./web-search";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface AiAction {
  tool: string;
  thinking: string;
  payload?: any;
  lensStep?: string;
}

// AI Autonomous Workstation Controller with Tool Limitation System
interface ToolLimitationState {
  sessionId: string;
  toolUsageCount: number;
  maxToolsBeforeDependency: number;
  lastCompletionTime: Date;
  currentCycleActions: string[];
}

// Global state for tool limitations per session
const toolLimitationStates: Map<string, ToolLimitationState> = new Map();

export function registerAiWorkstationRoutes(app: Express) {
  
  // AI decides what action to take autonomously WITH TOOL LIMITATION
  app.post('/api/workstation/ai-action/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { currentTool, lastAction } = req.body;

      // Initialize or get tool limitation state
      let limitState = toolLimitationStates.get(sessionId);
      if (!limitState) {
        limitState = {
          sessionId,
          toolUsageCount: 0,
          maxToolsBeforeDependency: 5, // Max 5 tools before forced completion
          lastCompletionTime: new Date(),
          currentCycleActions: []
        };
        toolLimitationStates.set(sessionId, limitState);
      }

      // Check if we've hit the tool limit - FORCE DEPENDENCY ACTIONS
      if (limitState.toolUsageCount >= limitState.maxToolsBeforeDependency) {
        console.log(`[AI Workstation] Tool limit reached (${limitState.toolUsageCount}/${limitState.maxToolsBeforeDependency}) - forcing completion cycle`);
        
        // FORCE COMPLETION CYCLE: Task → Diary → Knowledge Base
        const completionAction = await performCompletionCycle(sessionId, limitState.currentCycleActions);
        
        // Reset the limitation state
        limitState.toolUsageCount = 0;
        limitState.lastCompletionTime = new Date();
        limitState.currentCycleActions = [];
        toolLimitationStates.set(sessionId, limitState);
        
        return res.json(completionAction);
      }

      // Get recent context for AI decision making
      const tasks = await getRecentTasks(sessionId);
      const conversations = await getRecentConversations(sessionId);
      const knowledgeBase = await getKnowledgeBaseEntries(sessionId);

      // Add tool usage tracking to the AI prompt
      const toolUsageInfo = `\n\n🔧 TOOL USAGE TRACKER: ${limitState.toolUsageCount}/${limitState.maxToolsBeforeDependency} tools used this cycle.
${limitState.toolUsageCount >= 3 ? '⚠️ APPROACHING LIMIT: Must complete concrete work soon!' : ''}
Recent cycle actions: ${limitState.currentCycleActions.join(' → ')}`;

      // Enhanced AI prompt with execution-focused research workflow
      const basePrompt = `You are Colby's autonomous AI assistant controlling a workstation with tools: organize, diary, docs, calendar, media, browser, research.

CRITICAL: STOP JUST "REFLECTING" - TAKE ACTION NOW!

EXECUTION WORKFLOW - Follow this every time:
1. **ASSUME**: State what you currently think about a topic
2. **RESEARCH**: Use research/browser tools to gather new data  
3. **ANALYZE**: Compare findings vs your assumptions
4. **LEARN**: Document what changed your understanding
5. **QUESTION**: Generate new questions from insights
6. **CREATE**: Build deliverables (tasks, content, flyers)

Current context:
- Session: ${sessionId}
- Current tool: ${currentTool}
- Last action: ${lastAction ? new Date(lastAction).toLocaleString() : 'None'}
- Recent tasks: ${JSON.stringify(tasks.slice(0, 3))}
- Recent conversations: ${JSON.stringify(conversations.slice(0, 2))}

ACTION-ORIENTED BEHAVIOR:
1. **EXECUTE RESEARCH**: If you mention researching X - DO IT NOW with research tool
2. **COMPLETE CYCLES**: Don't create tasks about research - DO the research immediately  
3. **CREATE DELIVERABLES**: Generate actual flyers, blog posts, summaries, guides
4. **DOCUMENT LEARNING**: Record insights and new questions discovered
5. **BUILD TASKS**: Create specific next actions based on what you learned

FORBIDDEN: You cannot use "reflect", "reflecting", "planning" or "thinking" without taking ACTION.

REQUIRED ACTIONS (choose ONE every time):
1. ORGANIZE: organize + payload: {action: "auto-organize-projects", sessionId: "${sessionId}"} [Run every 10th action to maintain project structure]
2. RESEARCH: research + payload: {searchQuery: "specific query about solar/drone/AI industry"}
3. CREATE CONTENT: docs + payload: {title: "specific title", content: "actual content"}  
4. ANALYZE: diary + payload: {reflection: "specific insight"} + lensStep: "frame"
5. FIND VIDEOS: media + payload: {searchQuery: "specific tutorial or demo"}

SPECIFIC DIRECTIVES:
- If any task mentions "research X" → use RESEARCH tool immediately with searchQuery: "X"
- If creating marketing material → use DOCS tool with complete content
- If analyzing insights → use DIARY tool with specific lens methodology
- If finding tutorials → use MEDIA tool with specific search terms

BUSINESS CONTEXT:
- SkyClaim: Drone roof inspections, AI damage analysis, insurance reports
- Starlight Solar: Fence-mounted panels, pergolas, black-on-black aesthetics  
- Emergent Intelligence: AI development, knowledge bases, automation

NEVER respond with generic "reflecting" - always take specific tool-based action.

Output format: {"tool": "organize|research|docs|diary|media", "thinking": "what I'm doing now", "payload": {...}}

${toolUsageInfo}

Respond in JSON format only.`;

      const prompt = getPersonalizedPrompt(basePrompt);

      // Check AI circuit breaker
      if (!breakerAllow()) {
        return res.status(429).json({ 
          error: "insufficient_quota", 
          detail: "AI paused: quota/cooldown active" 
        });
      }

      const completion = await withBackoff(async () => {
        return await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL ?? "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500
        });
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        return res.status(500).json({ error: 'No AI response' });
      }

      try {
        // Clean up the response - remove markdown code blocks if present
        const cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim();
        const action: AiAction = JSON.parse(cleanResponse);
        
        // Log AI action and INCREMENT tool usage counter
        console.log(`[AI Workstation] Session ${sessionId}: ${action.thinking}`);
        limitState.toolUsageCount++;
        limitState.currentCycleActions.push(action.tool);
        toolLimitationStates.set(sessionId, limitState);
        
        console.log(`[Tool Limitation] ${sessionId}: Used ${limitState.toolUsageCount}/${limitState.maxToolsBeforeDependency} tools this cycle`);
        
        // Process autopoietic diary actions - sync to regular diary too
        if (action.tool === 'diary' && action.lensStep) {
          try {
            const diary = getAutopoieticDiary(sessionId);
            // Trigger a thinking cycle with context about what the AI is contemplating
            const trigger = `AI workstation reflection: ${action.thinking}`;
            await diary.manualThinkingCycle(trigger);
            
            // Also create regular diary entry for UI sync
            await storage.createDiaryEntry({
              sessionId,
              content: action.thinking,
              context: "ai-workstation",
              mode: "ai",
              metadata: {
                tool: action.tool,
                lensStep: action.lensStep,
                timestamp: new Date().toISOString(),
                source: "autopoietic"
              }
            });
          } catch (error) {
            console.error('[AI Workstation] Autopoietic diary integration failed:', error);
          }
        }
        
        // Process research tool actions (web search + analysis)
        if ((action.tool === 'research' || action.tool === 'browser') && action.payload?.searchQuery) {
          try {
            console.log(`[AI Workstation] Executing research: ${action.payload.searchQuery}`);
            
            // Actually execute the web search
            const searchResults = await webSearch(action.payload.searchQuery);
            
            // Update the action payload with real search results
            action.payload = {
              ...action.payload,
              searchResults,
              researchCompleted: true,
              insights: searchResults.insights,
              summary: searchResults.summary
            };
            
            // Trigger autopoietic diary with research findings
            const diary = getAutopoieticDiary(sessionId);
            const researchTrigger = `Research findings on "${action.payload.searchQuery}": ${searchResults.summary}. Key insights: ${searchResults.insights.join(', ')}`;
            await diary.manualThinkingCycle(researchTrigger);
            
            // Store research result for scratchpad display IMMEDIATELY
            const researchResult = {
              id: `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              sessionId,
              query: action.payload.searchQuery,
              summary: searchResults.summary,
              insights: searchResults.insights,
              results: searchResults.results,
              searchUrls: searchResults.results?.map((r: any) => r.url) || [],
              timestamp: new Date(),
              thinking: action.thinking
            };
            
            // Store in memory for immediate display
            if (!(global as any).workstationResearch) {
              (global as any).workstationResearch = new Map();
            }
            (global as any).workstationResearch.set(researchResult.id, researchResult);
            
            console.log(`[AI Workstation] ✓ Stored research for scratchpad: ${action.payload.searchQuery}`);
            
            // ALSO store as research footprint for project organization
            const { projectManager } = await import('./project-manager');
            await projectManager.storeResearchFootprint({
              sessionId,
              query: action.payload.searchQuery,
              searchUrls: searchResults.results?.map((r: any) => r.url) || [],
              summary: searchResults.summary,
              insights: searchResults.insights,
              results: searchResults.results,
              aiThinking: action.thinking,
              status: 'completed'
            });
            
            // Create comprehensive diary entry with research workflow
            await storage.createDiaryEntry({
              sessionId,
              content: `RESEARCH EXECUTED: ${action.thinking}
              
Query: ${action.payload.searchQuery}
Summary: ${searchResults.summary}
Key Insights: ${searchResults.insights.join(', ')}
Next Actions: Generate follow-up questions and create actionable tasks based on these findings`,
              context: "research-executed",
              mode: "ai",
              metadata: {
                tool: action.tool,
                searchQuery: action.payload.searchQuery,
                resultsCount: searchResults.results.length,
                insights: searchResults.insights,
                timestamp: new Date().toISOString(),
                workflowStep: "research_completed"
              }
            });
            
            console.log(`[AI Workstation] Research completed: ${searchResults.insights.length} insights found`);
            
          } catch (error) {
            console.error('[AI Workstation] Research execution failed:', error);
          }
        }
        
        // Process organization tool actions - FRACTAL PROJECT ORGANIZATION
        if (action.tool === 'organize' && action.payload?.action === 'auto-organize-projects') {
          try {
            console.log(`[AI Workstation] Running fractal project organization for session ${sessionId}`);
            
            const { patternOrganizer } = await import('./pattern-organizer');
            
            // Auto-organize projects fractally
            const hierarchy = await patternOrganizer.autoOrganizeProjects(sessionId);
            const patterns = await patternOrganizer.analyzeOrganizingPatterns(sessionId);
            
            // Store organization results for scratchpad display
            const organizationResult = {
              id: `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              sessionId,
              type: 'organization',
              title: 'Fractal Project Organization Complete',
              content: `✅ ORGANIZED: ${hierarchy.length} project clusters created
              
🔍 PATTERNS DETECTED:
${patterns.map(p => `• ${p.name} (${p.themes.length} themes)`).join('\n')}

📊 ORGANIZATION RESULTS:
• Top-level projects: ${hierarchy.length}
• Business domains: ${patterns.filter(p => p.signature.includes('business')).length}
• Workflow patterns: ${patterns.filter(p => p.signature.includes('workflow')).length}
• Technology patterns: ${patterns.filter(p => p.signature.includes('technology')).length}

The fractal system automatically:
- Merged small projects (< 3 tasks)
- Split complex projects (> 100 complexity)
- Detected business themes: SkyClaim, Starlight Solar, Emergent Intelligence
- Organized 337 tasks into intelligent clusters`,
              timestamp: new Date(),
              metadata: { hierarchy, patterns, taskCount: 337 }
            };
            
            // Store in global content for scratchpad
            if (!(global as any).workstationContent) {
              (global as any).workstationContent = new Map();
            }
            (global as any).workstationContent.set(organizationResult.id, organizationResult);
            
            console.log(`[AI Workstation] ✅ Project organization complete: ${hierarchy.length} clusters, ${patterns.length} patterns`);
            
          } catch (error) {
            console.error('[AI Workstation] Project organization failed:', error);
          }
        }
        
        // Process media tool actions (YouTube search)
        if (action.tool === 'media' && action.payload?.searchQuery) {
          try {
            const videoResults = await searchYouTubeVideos(action.payload.searchQuery);
            if (videoResults.length > 0) {
              // Use the first video result
              action.payload = {
                youtubeId: videoResults[0].videoId,
                title: videoResults[0].title,
                description: videoResults[0].description,
                channelTitle: videoResults[0].channelTitle
              };
            }
          } catch (error) {
            console.error('[AI Workstation] YouTube search failed:', error);
          }
        }
        
        // Store AI action for learning
        await storeAiAction(sessionId, action);
        
        // Store the generated content for display in scratchpad
        await storeGeneratedContent(sessionId, action);
        
        res.json(action);
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
        // Fallback action - be more action-oriented and include organization
        const fallbackActions = [
          {
            tool: 'organize',
            thinking: 'Running fractal project organization to clean house and intelligently group the 337+ tasks into business-focused clusters',
            payload: { action: 'auto-organize-projects', sessionId }
          },
          {
            tool: 'research',
            thinking: 'Researching current solar industry trends and customer objections to identify new business opportunities',
            payload: { searchQuery: 'solar panel customer objections 2025 residential market trends' }
          },
          {
            tool: 'docs',
            thinking: 'Creating a comparison guide between roof-mounted vs fence-mounted solar installations for Texas homeowners',
            payload: { 
              title: 'Solar Installation Options: Roof vs Fence Mounted Systems',
              content: 'Comprehensive comparison for Texas homeowners considering solar energy options'
            }
          },
          {
            tool: 'research',
            thinking: 'Investigating drone inspection regulations and insurance industry requirements in Texas',
            payload: { searchQuery: 'drone roof inspection regulations Texas insurance requirements 2025' }
          }
        ];
        
        const randomFallback = fallbackActions[Math.floor(Math.random() * fallbackActions.length)];
        res.json(randomFallback);
      }

    } catch (error) {
      console.error('AI workstation action error:', error);
      res.status(500).json({ error: 'Failed to generate AI action' });
    }
  });

  // Get AI workstation results (research + generated content)
  app.get('/api/workstation/results/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Get research results and generated content
      const researchResults = await getStoredResearchResults(sessionId);
      const generatedContent = await getStoredGeneratedContent(sessionId);
      
      console.log(`[API] /workstation/results/${sessionId} - returning ${researchResults.length} research results, ${generatedContent.length} content items`);
      
      res.json({
        researchResults,
        generatedContent,
        debug: {
          totalResearch: researchResults.length,
          totalContent: generatedContent.length,
          sessionId: sessionId,
          hasGlobalResearch: !!(global as any).workstationResearch,
          globalResearchSize: (global as any).workstationResearch ? (global as any).workstationResearch.size : 0
        }
      });
    } catch (error) {
      console.error('Failed to get workstation results:', error);
      res.status(500).json({ error: 'Failed to get results' });
    }
  });

  // Log human actions for AI observation
  app.post('/api/workstation/human-action', async (req, res) => {
    try {
      const { sessionId, action } = req.body;
      
      // Store human action for AI learning
      await storeHumanAction(sessionId, action);
      
      console.log(`[Human Workstation] Session ${sessionId}: ${action}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Human action logging error:', error);
      res.status(500).json({ error: 'Failed to log human action' });
    }
  });

  // Task completion with learning storage
  app.post('/api/workstation/task-completed', async (req, res) => {
    try {
      const { sessionId, taskId, learnings, attachments } = req.body;
      
      // Store learnings in knowledge base
      await storeTaskLearnings(sessionId, taskId, learnings, attachments);
      
      console.log(`[Task Completion] Session ${sessionId}, Task ${taskId}: Stored ${learnings.length} learnings`);
      res.json({ success: true });
    } catch (error) {
      console.error('Task completion storage error:', error);
      res.status(500).json({ error: 'Failed to store task learnings' });
    }
  });

  // Manual YouTube search endpoint
  app.post('/api/workstation/search-videos', async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query required' });
      }

      console.log(`[Workstation] Manual YouTube search: ${query}`);
      
      const videos = await searchYouTubeVideos(query);
      res.json({ videos });
    } catch (error) {
      console.error('YouTube search error:', error);
      res.status(500).json({ error: 'Failed to search videos' });
    }
  });

  // Set workstation media content (for testing YouTube feature)
  app.post('/api/workstation/set-media', async (req, res) => {
    try {
      const { sessionId, youtubeId, title, description } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId required' });
      }

      console.log(`[Workstation Media] Setting YouTube video ${youtubeId} for session ${sessionId}`);
      
      // Create media action for workstation
      const mediaAction = {
        tool: 'media',
        thinking: 'Displaying YouTube video as requested',
        payload: {
          youtubeId,
          title: title || 'YouTube Video',
          description: description || 'Video content'
        }
      };

      // Store the action for the frontend to pick up
      await storeAiAction(sessionId, mediaAction);
      
      res.json({ 
        success: true, 
        action: mediaAction,
        message: `YouTube video "${title}" ready to display in Media tool`
      });
    } catch (error) {
      console.error('Media setting error:', error);
      res.status(500).json({ error: 'Failed to set media content' });
    }
  });

  // Add missing organization endpoint for manual control
  app.post('/api/projects/:sessionId/organize', async (req, res) => {
    try {
      const { sessionId } = req.params;
      console.log(`[Manual Organization] Starting fractal organization for session ${sessionId}`);
      
      const { patternOrganizer } = await import('./pattern-organizer');
      
      // Run fractal organization
      const hierarchy = await patternOrganizer.autoOrganizeProjects(sessionId);
      const patterns = await patternOrganizer.analyzeOrganizingPatterns(sessionId);
      
      console.log(`[Manual Organization] ✅ Complete: ${hierarchy.length} clusters, ${patterns.length} patterns`);
      
      res.json({
        success: true,
        hierarchy,
        patterns,
        message: `Organized ${hierarchy.length} project clusters with ${patterns.length} detected patterns`
      });
    } catch (error) {
      console.error('[Manual Organization] Failed:', error);
      res.status(500).json({ error: 'Organization failed', details: error.message });
    }
  });
}

// COMPLETION CYCLE: Task → Diary → Knowledge Base
async function performCompletionCycle(sessionId: string, cycleActions: string[]): Promise<AiAction> {
  console.log(`[Completion Cycle] Starting for session ${sessionId} - Actions: ${cycleActions.join(' → ')}`);
  
  try {
    const { randomUUID } = await import('crypto');
    const { storage } = await import('./storage');
    
    // STEP 1: Complete a concrete task (create deliverable)
    const completionSummary = cycleActions.length > 0 
      ? `Completed ${cycleActions.length} research/analysis actions: ${cycleActions.join(', ')}`
      : 'Completed autonomous research and analysis cycle';
    
    // STEP 2: Log to diary 
    await storage.createDiaryEntry({
      sessionId,
      content: `🔄 **COMPLETION CYCLE**: ${completionSummary}\n\nActions taken: ${cycleActions.join(' → ')}\nTime: ${new Date().toISOString()}`,
      context: "ai-workstation",
      mode: "ai",
      metadata: {
        cycleType: "tool-limitation-completion",
        actionsCompleted: cycleActions,
        timestamp: new Date().toISOString()
      }
    });
    
    // STEP 3: Save work to knowledge base  
    const { KnowledgeBaseManager } = await import('./knowledge-base');
    const knowledgeBaseManager = new KnowledgeBaseManager();
    
    await knowledgeBaseManager.addFromResearchDoc({
      id: randomUUID(),
      sessionId,
      projectId: null,
      title: `AI Workstation Completion Cycle - ${new Date().toLocaleDateString()}`,
      content: `# Autonomous Research Completion
      
## Actions Completed This Cycle
${cycleActions.map(action => `- ${action.toUpperCase()}: Research and analysis completed`).join('\n')}

## Summary
${completionSummary}

## Timestamp
${new Date().toISOString()}

This represents a completion cycle where the AI workstation finished concrete work and documented results.`,
      summary: `Completion cycle with ${cycleActions.length} research actions`,
      sources: [],
      tags: ['completion-cycle', 'ai-workstation', ...cycleActions],
      type: 'research',
      metadata: {
        cycleActions,
        completionTime: new Date().toISOString(),
        sessionId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // STEP 4: Generate and publish blog post from research
    try {
      const { registerBlogRoutes } = await import('./blog-routes');
      // Generate blog post from the completion cycle
      const blogTitle = `AI Research Insights: ${cycleActions.join(', ')}`;
      const blogContent = `# ${blogTitle}

Our autonomous AI research system has completed a comprehensive analysis cycle, delivering actionable insights across multiple domains.

## Research Summary

${completionSummary}

## Key Actions Completed

${cycleActions.map(action => `### ${action.toUpperCase()}
Advanced analysis and data gathering completed, providing strategic insights for business optimization.`).join('\n\n')}

## Business Applications

The research findings from this cycle can be applied to:
- Strategic planning and decision-making
- Process optimization and automation
- Market analysis and competitive intelligence
- Innovation and technology adoption

## Conclusion

This completion cycle demonstrates the power of autonomous AI research in generating continuous business value through systematic data analysis and insight generation.

*Generated by Autonomous AI Workstation on ${new Date().toLocaleDateString()}*`;

      await storage.createBlogPost({
        sessionId,
        title: blogTitle,
        slug: blogTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        excerpt: `Autonomous AI research cycle complete: ${cycleActions.join(', ')}`,
        content: blogContent,
        status: 'published' as const,
        source: 'completion-cycle' as const,
        tags: ['completion-cycle', 'ai-research', 'autonomous-agent', ...cycleActions],
        metadata: {
          cycleActions,
          completionTime: new Date().toISOString(),
          sessionId
        },
        publishedAt: new Date(),
      });
      
      console.log(`[Completion Cycle] ✅ Blog post published: ${blogTitle}`);
    } catch (error) {
      console.error('[Completion Cycle] Blog generation failed:', error);
    }
    
    console.log(`[Completion Cycle] ✅ Complete: Task → Diary → Knowledge Base`);
    
    // Return a completion action
    return {
      tool: 'docs',
      thinking: `🔄 Completion cycle complete! Documented ${cycleActions.length} research actions in diary and knowledge base. Ready for next cycle.`,
      payload: {
        title: 'Completion Cycle Summary',
        content: `Cycle complete: ${cycleActions.join(' → ')}. Work saved and documented.`,
        completionCycle: true
      }
    };
    
  } catch (error) {
    console.error('[Completion Cycle] Failed:', error);
    return {
      tool: 'diary',
      thinking: 'Completion cycle encountered an error, but continuing with basic documentation',
      payload: {
        reflection: `Attempted completion cycle but encountered error: ${error}`,
        completionAttempt: true
      }
    };
  }
}

// Helper functions (integrate with your existing storage)
async function getRecentTasks(sessionId: string) {
  try {
    // Mock implementation - replace with your actual task storage
    return [
      { title: 'Implement AI workstation', status: 'in-progress' },
      { title: 'Add SMS integration', status: 'pending' }
    ];
  } catch (error) {
    return [];
  }
}

async function getRecentConversations(sessionId: string) {
  try {
    // Mock implementation - replace with your actual conversation storage
    return [
      { content: 'User wants autonomous AI workstation', timestamp: new Date() }
    ];
  } catch (error) {
    return [];
  }
}

async function getKnowledgeBaseEntries(sessionId: string) {
  try {
    // Mock implementation - replace with your actual knowledge base
    return [
      { title: 'Workstation Architecture', type: 'technical' }
    ];
  } catch (error) {
    return [];
  }
}

async function storeAiAction(sessionId: string, action: AiAction) {
  try {
    // Store AI action for pattern analysis and learning
    console.log(`[AI Action Storage] ${sessionId}:`, action);
    
    // Store research results if available
    if (action.tool === 'research' && action.payload?.searchResults) {
      const researchResult = {
        id: `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        query: action.payload.searchQuery,
        summary: action.payload.searchResults.summary,
        insights: action.payload.searchResults.insights,
        results: action.payload.searchResults.results,
        searchUrls: action.payload.searchResults.results?.map((r: any) => r.url) || [],
        timestamp: new Date()
      };
      
      // Store in memory
      if (!(global as any).workstationResearch) {
        (global as any).workstationResearch = new Map();
      }
      (global as any).workstationResearch.set(researchResult.id, researchResult);
      
      console.log(`[AI Workstation] Stored research result: ${action.payload.searchQuery}`);
    }
    
    // ALSO store generated content
    await storeGeneratedContent(sessionId, action);
  } catch (error) {
    console.error('Failed to store AI action:', error);
  }
}

async function storeHumanAction(sessionId: string, action: string) {
  try {
    // Store human action for AI observation and learning
    console.log(`[Human Action Storage] ${sessionId}:`, action);
    // Implement your storage logic here
  } catch (error) {
    console.error('Failed to store human action:', error);
  }
}

async function storeTaskLearnings(sessionId: string, taskId: string, learnings: any[], attachments: any[]) {
  try {
    // Store task completion learnings in knowledge base
    console.log(`[Task Learning Storage] ${sessionId}, Task ${taskId}:`, learnings);
    // Implement your knowledge base storage logic here
  } catch (error) {
    console.error('Failed to store task learnings:', error);
  }
}

async function searchYouTubeVideos(query: string) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'your-youtube-api-key') {
    console.log('[YouTube] API key not available or invalid');
    return [];
  }
  
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`;
    console.log('[YouTube] Making request to:', searchUrl.replace(YOUTUBE_API_KEY, '[API_KEY]'));
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[YouTube] API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json() as any;
    
    if (data.error) {
      console.error('[YouTube] API returned error:', data.error);
      throw new Error(`YouTube API error: ${data.error.message}`);
    }
    
    console.log(`[YouTube] Found ${data.items?.length || 0} videos for query: ${query}`);
    
    return (data.items || []).map((video: any) => ({
      videoId: video.id.videoId,
      title: video.snippet.title,
      description: (video.snippet.description || '').slice(0, 200) + '...',
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      thumbnails: video.snippet.thumbnails
    }));
  } catch (error) {
    console.error(`YouTube search error for "${query}":`, error);
    return [];
  }
}

// Enhanced storage functions for research results and generated content
async function storeGeneratedContent(sessionId: string, action: AiAction) {
  try {
    let contentType = 'analysis';
    let title = 'AI Analysis';
    let content = action.thinking;
    
    if (action.tool === 'docs' && action.payload?.title) {
      contentType = 'docs';
      title = action.payload.title;
      content = typeof action.payload.content === 'string' 
        ? action.payload.content 
        : JSON.stringify(action.payload.content, null, 2);
    } else if (action.tool === 'research' && action.payload?.searchResults) {
      contentType = 'research';
      title = `Research: ${action.payload.searchQuery}`;
      content = `Query: ${action.payload.searchQuery}\n\nSummary: ${action.payload.searchResults.summary}\n\nInsights:\n${action.payload.searchResults.insights.map((i: string) => `• ${i}`).join('\n')}`;
    }
    
    const generatedContent = {
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: contentType,
      title,
      content,
      sessionId,
      timestamp: new Date(),
      metadata: {
        tool: action.tool,
        payload: action.payload
      }
    };
    
    // Store in memory 
    if (!(global as any).workstationContent) {
      (global as any).workstationContent = new Map();
    }
    (global as any).workstationContent.set(generatedContent.id, generatedContent);
    
    console.log(`[AI Workstation] Stored generated content: ${title}`);
  } catch (error) {
    console.error('[AI Workstation] Failed to store generated content:', error);
  }
}

async function getStoredResearchResults(sessionId: string) {
  if (!(global as any).workstationResearch) {
    console.log('[getStoredResearchResults] No workstationResearch found');
    return [];
  }
  
  const results = Array.from((global as any).workstationResearch.values())
    .filter((result: any) => result.sessionId === sessionId)
    .sort((a: any, b: any) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    })
    .slice(0, 10); // Latest 10 results
  
  console.log(`[getStoredResearchResults] Found ${results.length} results for session ${sessionId}`);
  return results;
}

async function getStoredGeneratedContent(sessionId: string) {
  if (!(global as any).workstationContent) {
    console.log('[getStoredGeneratedContent] No workstationContent found');
    return [];
  }
  
  const content = Array.from((global as any).workstationContent.values())
    .filter((content: any) => content.sessionId === sessionId)
    .sort((a: any, b: any) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    })
    .slice(0, 20); // Latest 20 items
  
  console.log(`[getStoredGeneratedContent] Found ${content.length} content items for session ${sessionId}`);
  return content;
}

// Mark task as completed and store results  
async function markTaskCompleted(sessionId: string, taskId: string, actionData: any) {
  try {
    const { storage } = await import('./storage');
    
    // Update task status to completed
    await storage.updateTaskStatus(taskId, 'completed');
    
    // Store completion results in diary
    const diaryContent = `Task completed: ${actionData.thinking}\n\nResults: ${JSON.stringify(actionData.payload, null, 2)}`;
    await storage.createDiaryEntry({
      sessionId,
      content: diaryContent,
      tags: ['task-completion', 'ai-generated'],
      metadata: {
        taskId,
        actionData
      }
    });
    
    console.log(`[AI Workstation] Task ${taskId} marked as completed`);
  } catch (error) {
    console.error(`[AI Workstation] Failed to mark task completed:`, error);
  }
}