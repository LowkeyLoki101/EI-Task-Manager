import type { Express } from "express";
import OpenAI from "openai";
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

// AI Autonomous Workstation Controller
export function registerAiWorkstationRoutes(app: Express) {
  
  // AI decides what action to take autonomously
  app.post('/api/workstation/ai-action/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { currentTool, lastAction } = req.body;

      // Get recent context for AI decision making
      const tasks = await getRecentTasks(sessionId);
      const conversations = await getRecentConversations(sessionId);
      const knowledgeBase = await getKnowledgeBaseEntries(sessionId);

      // Enhanced AI prompt with execution-focused research workflow
      const basePrompt = `You are Colby's autonomous AI assistant controlling a workstation with tools: diary, docs, calendar, media, browser, research.

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
1. RESEARCH: research + payload: {searchQuery: "specific query about solar/drone/AI industry"}
2. CREATE CONTENT: docs + payload: {title: "specific title", content: "actual content"}  
3. ANALYZE: diary + payload: {reflection: "specific insight"} + lensStep: "frame"
4. FIND VIDEOS: media + payload: {searchQuery: "specific tutorial or demo"}

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

Output format: {"tool": "research|docs|diary|media", "thinking": "what I'm doing now", "payload": {...}}

Respond in JSON format only.`;

      const prompt = getPersonalizedPrompt(basePrompt);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        return res.status(500).json({ error: 'No AI response' });
      }

      try {
        // Clean up the response - remove markdown code blocks if present
        const cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim();
        const action: AiAction = JSON.parse(cleanResponse);
        
        // Log AI action
        console.log(`[AI Workstation] Session ${sessionId}: ${action.thinking}`);
        
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
        
        res.json(action);
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
        // Fallback action - be more action-oriented
        const fallbackActions = [
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
    // Implement your storage logic here
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