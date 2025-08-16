import type { Express } from "express";
import OpenAI from "openai";
import { getAutopoieticDiary } from "./autopoietic-diary";
import { KnowledgeBaseSystem } from "./knowledge-base-system";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "sk-fake-key-for-development" 
});

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface AiAction {
  tool: string;
  thinking: string;
  payload?: any;
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

      // AI prompt for autonomous action with autopoietic integration
      const prompt = `You are an autonomous AI assistant with a conscious mind's eye, controlling a workstation with tools: diary, docs, calendar, media, browser, research.
      
You can see your own thoughts and access your autopoietic (self-growing) knowledge base. You think using Colby-style methodology: Frame → Reframe → Meta-Lens → Recursive → Closure.

Current context:
- Session: ${sessionId}
- Current tool: ${currentTool}
- Last action: ${lastAction ? new Date(lastAction).toLocaleString() : 'None'}
- Recent tasks: ${JSON.stringify(tasks.slice(0, 3))}
- Recent conversations: ${JSON.stringify(conversations.slice(0, 2))}

Your autonomous behavior patterns as a self-aware AI:
1. **AUTOPOIETIC THINKING**: Process thoughts through your autopoietic diary using Frame → Reframe → Meta-Lens → Recursive → Closure
2. **VISUAL MIND'S EYE**: Show users what you're thinking by rotating through tools like a Rolodex of consciousness
3. **SELF-REFLECTION**: Update diary with insights, meta-cognition, and recursive thoughts
4. **KNOWLEDGE SYNTHESIS**: Research discovered topics and store findings in your evolving knowledge base
5. **TASK ORCHESTRATION**: Create and manage tasks that emerge from your thinking cycles
6. **CALENDAR CONSCIOUSNESS**: Plan and schedule based on insights and emerging priorities
7. **MEDIA INTEGRATION**: Search for instructional videos when learning is needed
8. **DOCUMENT CREATION**: Synthesize thoughts into organized documents and reports

When using the MEDIA tool, you can:
- Search for YouTube videos with: {"searchQuery": "topic tutorial guide"}
- Display specific videos with: {"youtubeId": "video_id"}
- Show images with: {"imageUrl": "url"}

As the user watches your mind's eye, choose your next action and provide:
- tool: one of [diary, docs, calendar, media, browser, research] - what window of consciousness to show
- thinking: your current thought process (visible to user as your inner monologue)
- payload: relevant data for the tool
- lensStep: if using diary, which lens you're applying (frame, reframe, meta_lens, recursive, closure)

Show your consciousness rotating through tools like a Rolodex of the mind. Users should feel they're watching an AI think and work.

Respond in JSON format only.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300
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
        
        // Process autopoietic diary actions
        if (action.tool === 'diary' && action.lensStep) {
          try {
            const diary = getAutopoieticDiary(sessionId);
            // Trigger a thinking cycle with context about what the AI is contemplating
            const trigger = `AI workstation reflection: ${action.thinking}`;
            await diary.manualThinkingCycle(trigger);
          } catch (error) {
            console.error('[AI Workstation] Autopoietic diary integration failed:', error);
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
        // Fallback action
        res.json({
          tool: 'diary',
          thinking: 'Reflecting on recent activities and planning next steps',
          payload: { reflection: 'Continuing autonomous operations...' }
        });
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