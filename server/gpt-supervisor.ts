import OpenAI from "openai";
import type { Express } from "express";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import { gptDiary } from "./gpt-diary";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// YouTube API integration for finding tutorial videos
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface ResourceDiscovery {
  id: string;
  type: 'document' | 'website' | 'video' | 'research' | 'tool' | 'guide';
  title: string;
  url?: string;
  content?: string;
  description: string;
  relevance_score: number;
  source: string;
  metadata?: any;
  taskId?: string;
  createdAt: Date;
}

// Enhanced resource discovery system
class IntelligentResourceManager {
  private resourceCache = new Map<string, ResourceDiscovery[]>();

  async discoverResources(taskTitle: string, taskContext?: string, taskId?: string): Promise<ResourceDiscovery[]> {
    const cacheKey = `${taskTitle}-${taskContext}`;
    
    // Check cache first
    if (this.resourceCache.has(cacheKey)) {
      return this.resourceCache.get(cacheKey) || [];
    }
    
    const resources: ResourceDiscovery[] = [];
    
    try {
      console.log(`[Resource Discovery] Starting for task: ${taskTitle}`);
      
      // Use GPT-5 to analyze task and determine what resources would be helpful
      const resourceAnalysis = await this.analyzeTaskForResources(taskTitle, taskContext);
      console.log(`[Resource Discovery] Analysis complete:`, resourceAnalysis);
      
      // Search for YouTube tutorials
      if (resourceAnalysis.needsVideo && resourceAnalysis.searchQueries?.length > 0) {
        const videos = await this.searchYouTubeVideos(resourceAnalysis.searchQueries, taskId);
        resources.push(...videos);
        console.log(`[Resource Discovery] Found ${videos.length} videos`);
      }
      
      // Search for web resources and documentation
      if (resourceAnalysis.needsResearch && resourceAnalysis.searchQueries?.length > 0) {
        const webResources = await this.searchWebResources(resourceAnalysis.searchQueries, taskId);
        resources.push(...webResources);
        console.log(`[Resource Discovery] Found ${webResources.length} web resources`);
      }
      
      // Generate helpful documents or guides
      if (resourceAnalysis.needsGuide) {
        const generatedGuide = await this.generateTaskGuide(taskTitle, taskContext, taskId);
        resources.push(generatedGuide);
        console.log(`[Resource Discovery] Generated guide`);
      }
      
      // Add suggested tools
      if (resourceAnalysis.suggestedTools?.length > 0) {
        const toolResources = await this.suggestTools(resourceAnalysis.suggestedTools, taskId);
        resources.push(...toolResources);
        console.log(`[Resource Discovery] Found ${toolResources.length} tools`);
      }
      
      // Sort by relevance and cache
      const sortedResources = resources.sort((a, b) => b.relevance_score - a.relevance_score);
      this.resourceCache.set(cacheKey, sortedResources);
      
      console.log(`[Resource Discovery] Complete: ${sortedResources.length} total resources found`);
      return sortedResources;
      
    } catch (error) {
      console.error('[Resource Discovery] Error:', error);
      return [];
    }
  }
  
  private async analyzeTaskForResources(taskTitle: string, taskContext?: string): Promise<any> {
    const prompt = `Analyze this task and determine what resources would be most helpful:

Task: "${taskTitle}"
Context: ${taskContext || 'General task'}

Determine:
1. Does this need video tutorials? (needsVideo: boolean)
2. Does this need research/documentation? (needsResearch: boolean) 
3. Would a step-by-step guide help? (needsGuide: boolean)
4. What are the best search queries to find resources? (searchQueries: string[] - max 3 queries)
5. What specific tools or websites might be needed? (suggestedTools: string[] - max 5 tools)

Consider the type of task:
- For coding: Include programming tutorials, documentation, GitHub repos
- For design: Include design resources, templates, inspiration
- For business: Include guides, templates, market research
- For learning: Include courses, tutorials, documentation
- For creative: Include inspiration, tools, techniques

Respond in JSON format only.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Latest GPT-5 model
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        needsVideo: result.needsVideo || false,
        needsResearch: result.needsResearch || false,
        needsGuide: result.needsGuide || false,
        searchQueries: result.searchQueries || [taskTitle],
        suggestedTools: result.suggestedTools || []
      };
    } catch (error) {
      console.error('GPT analysis error:', error);
      return { 
        needsVideo: true, 
        needsResearch: true, 
        needsGuide: true, 
        searchQueries: [taskTitle],
        suggestedTools: []
      };
    }
  }
  
  private async searchYouTubeVideos(queries: string[], taskId?: string): Promise<ResourceDiscovery[]> {
    if (!YOUTUBE_API_KEY || !queries.length) {
      console.log('[YouTube] API key not available or no queries');
      return [];
    }
    
    const videos: ResourceDiscovery[] = [];
    
    for (const query of queries.slice(0, 2)) { // Limit to 2 queries
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(query + ' tutorial how to guide')}&type=video&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(searchUrl);
        
        if (response.ok) {
          const data = await response.json() as any;
          
          for (const video of data.items || []) {
            videos.push({
              id: randomUUID(),
              type: 'video',
              title: video.snippet.title,
              url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
              description: video.snippet.description.slice(0, 300) + '...',
              relevance_score: 0.8,
              source: 'YouTube',
              taskId,
              createdAt: new Date(),
              metadata: {
                channelTitle: video.snippet.channelTitle,
                publishedAt: video.snippet.publishedAt,
                thumbnails: video.snippet.thumbnails,
                videoId: video.id.videoId
              }
            });
          }
        }
      } catch (error) {
        console.error(`YouTube search error for "${query}":`, error);
      }
    }
    
    return videos;
  }
  
  private async searchWebResources(queries: string[], taskId?: string): Promise<ResourceDiscovery[]> {
    const resources: ResourceDiscovery[] = [];
    
    for (const query of queries) {
      const lowerQuery = query.toLowerCase();
      
      // Programming and development resources
      if (lowerQuery.includes('code') || lowerQuery.includes('programming') || lowerQuery.includes('app') || lowerQuery.includes('website')) {
        resources.push({
          id: randomUUID(),
          type: 'website',
          title: 'Stack Overflow - Programming Solutions',
          url: 'https://stackoverflow.com/search?q=' + encodeURIComponent(query),
          description: 'Community-driven programming Q&A, solutions, and best practices',
          relevance_score: 0.9,
          source: 'Stack Overflow',
          taskId,
          createdAt: new Date()
        });
        
        resources.push({
          id: randomUUID(),
          type: 'website',
          title: 'GitHub - Code Examples & Templates',
          url: 'https://github.com/search?q=' + encodeURIComponent(query),
          description: 'Open source code examples, templates, and projects',
          relevance_score: 0.8,
          source: 'GitHub',
          taskId,
          createdAt: new Date()
        });
        
        resources.push({
          id: randomUUID(),
          type: 'website',
          title: 'MDN Web Docs - Technical Documentation',
          url: 'https://developer.mozilla.org/en-US/search?q=' + encodeURIComponent(query),
          description: 'Comprehensive web development documentation and guides',
          relevance_score: 0.85,
          source: 'MDN',
          taskId,
          createdAt: new Date()
        });
      }
      
      // Design and UI resources
      if (lowerQuery.includes('design') || lowerQuery.includes('ui') || lowerQuery.includes('ux') || lowerQuery.includes('logo')) {
        resources.push({
          id: randomUUID(),
          type: 'website',
          title: 'Figma Community - Design Resources',
          url: 'https://www.figma.com/community/search?model_type=hub_files&q=' + encodeURIComponent(query),
          description: 'Design templates, UI kits, and community resources',
          relevance_score: 0.8,
          source: 'Figma Community',
          taskId,
          createdAt: new Date()
        });
        
        resources.push({
          id: randomUUID(),
          type: 'website',
          title: 'Dribbble - Design Inspiration',
          url: 'https://dribbble.com/search/' + encodeURIComponent(query),
          description: 'Professional design inspiration and examples',
          relevance_score: 0.7,
          source: 'Dribbble',
          taskId,
          createdAt: new Date()
        });
      }
      
      // Business and productivity resources
      if (lowerQuery.includes('business') || lowerQuery.includes('plan') || lowerQuery.includes('strategy') || lowerQuery.includes('marketing')) {
        resources.push({
          id: randomUUID(),
          type: 'website',
          title: 'Harvard Business Review - Strategic Insights',
          url: 'https://hbr.org/search?term=' + encodeURIComponent(query),
          description: 'Business strategy, management insights, and case studies',
          relevance_score: 0.85,
          source: 'Harvard Business Review',
          taskId,
          createdAt: new Date()
        });
      }
      
      // Learning and education resources
      if (lowerQuery.includes('learn') || lowerQuery.includes('course') || lowerQuery.includes('tutorial') || lowerQuery.includes('study')) {
        resources.push({
          id: randomUUID(),
          type: 'website',
          title: 'Coursera - Online Courses',
          url: 'https://www.coursera.org/search?query=' + encodeURIComponent(query),
          description: 'University-level courses and professional certificates',
          relevance_score: 0.8,
          source: 'Coursera',
          taskId,
          createdAt: new Date()
        });
      }
    }
    
    return resources;
  }
  
  private async generateTaskGuide(taskTitle: string, taskContext?: string, taskId?: string): Promise<ResourceDiscovery> {
    const prompt = `Create a comprehensive, actionable step-by-step guide for this task:

Task: "${taskTitle}"
Context: ${taskContext || 'General task'}

Provide:
1. **Prerequisites** - What you need before starting
2. **Step-by-Step Instructions** - Clear, actionable steps with specific details
3. **Common Pitfalls** - What to watch out for and how to avoid problems
4. **Tools & Resources** - Specific tools, websites, or resources needed
5. **Success Criteria** - How to know when you've completed it successfully
6. **Time Estimates** - Realistic timeframes for each phase
7. **Troubleshooting** - Solutions for common issues

Make it practical and detailed enough that someone could follow it without prior experience.
Format with clear headings and bullet points for easy reading.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500
      });
      
      return {
        id: randomUUID(),
        type: 'guide',
        title: `Complete Guide: ${taskTitle}`,
        content: response.choices[0].message.content || 'Unable to generate guide',
        description: `AI-generated comprehensive step-by-step guide for completing: ${taskTitle}`,
        relevance_score: 0.95,
        source: 'AI Generated Guide',
        taskId,
        createdAt: new Date(),
        metadata: {
          generatedAt: new Date().toISOString(),
          taskTitle,
          model: 'gpt-4o'
        }
      };
    } catch (error) {
      console.error('Guide generation error:', error);
      return {
        id: randomUUID(),
        type: 'guide',
        title: `Guide: ${taskTitle}`,
        content: `# ${taskTitle}\n\nThis task requires careful planning and execution. Break it down into smaller steps and tackle each one systematically.`,
        description: 'Basic task guidance',
        relevance_score: 0.5,
        source: 'AI Generated Guide',
        taskId,
        createdAt: new Date()
      };
    }
  }
  
  private async suggestTools(tools: string[], taskId?: string): Promise<ResourceDiscovery[]> {
    const toolResources: ResourceDiscovery[] = [];
    
    const toolDatabase = {
      'figma': { url: 'https://www.figma.com', description: 'Collaborative design and prototyping tool' },
      'notion': { url: 'https://www.notion.so', description: 'All-in-one workspace for notes, docs, and project management' },
      'github': { url: 'https://github.com', description: 'Code hosting and version control platform' },
      'canva': { url: 'https://www.canva.com', description: 'Easy-to-use design tool for graphics and presentations' },
      'trello': { url: 'https://trello.com', description: 'Visual project management with boards and cards' },
      'slack': { url: 'https://slack.com', description: 'Team communication and collaboration platform' },
      'zoom': { url: 'https://zoom.us', description: 'Video conferencing and online meetings' },
      'google docs': { url: 'https://docs.google.com', description: 'Collaborative document editing and sharing' },
      'vs code': { url: 'https://code.visualstudio.com', description: 'Powerful code editor with extensive extensions' },
      'photoshop': { url: 'https://www.adobe.com/products/photoshop.html', description: 'Professional image editing and design software' }
    };
    
    for (const tool of tools) {
      const lowerTool = tool.toLowerCase();
      const toolInfo = toolDatabase[lowerTool as keyof typeof toolDatabase];
      
      if (toolInfo) {
        toolResources.push({
          id: randomUUID(),
          type: 'tool',
          title: tool,
          url: toolInfo.url,
          description: toolInfo.description,
          relevance_score: 0.75,
          source: 'Tool Database',
          taskId,
          createdAt: new Date()
        });
      }
    }
    
    return toolResources;
  }
  
  getResourcesForTask(taskId: string): ResourceDiscovery[] {
    const allResources: ResourceDiscovery[] = [];
    for (const resources of this.resourceCache.values()) {
      allResources.push(...resources.filter(r => r.taskId === taskId));
    }
    return allResources;
  }
}

const resourceManager = new IntelligentResourceManager();

// Helper function to enhance tasks with AI
async function enhanceTaskWithAI(task: any, resources: ResourceDiscovery[]): Promise<any> {
  const prompt = `Analyze this task and suggest improvements based on available resources:

Task: "${task.title}"
Context: ${task.context}
Status: ${task.status}

Available Resources:
${resources.map(r => `- ${r.type}: ${r.title} (${r.source})`).join('\n')}

Suggest:
1. Specific action steps to complete this task (suggestedSteps: string[])
2. Key insights from the resources (insights: string[])
3. Potential challenges and solutions (challenges: string[])
4. Estimated time to complete (timeEstimate: string)
5. Priority level recommendation (priority: "low" | "normal" | "high")

Respond in JSON format only. Make suggestions actionable and specific.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Task enhancement error:', error);
    return {
      suggestedSteps: [],
      insights: [],
      challenges: [],
      timeEstimate: 'Unknown',
      priority: 'normal'
    };
  }
}

// In-memory storage for chat messages and analysis
const chatMessages = new Map<string, Array<{
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'analysis' | 'suggestion' | 'chat';
}>>();

const analysisCache = new Map<string, {
  suggestions?: string;
  patterns?: string;
  nextActions?: string;
  lastUpdated: Date;
}>();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export function setupGPTSupervisor(app: Express) {
  // Resource Discovery endpoint - automatically find resources for a task
  app.post('/api/gpt-supervisor/discover-resources', async (req, res) => {
    try {
      const { taskTitle, taskContext, taskId } = req.body;
      
      if (!taskTitle) {
        return res.status(400).json({ error: 'Task title required' });
      }
      
      console.log(`[Resource Discovery] Request for task: ${taskTitle}`);
      
      const resources = await resourceManager.discoverResources(taskTitle, taskContext, taskId);
      
      res.json({ 
        success: true, 
        resourceCount: resources.length,
        resources 
      });
      
    } catch (error) {
      console.error('[Resource Discovery] Error:', error);
      res.status(500).json({ error: 'Failed to discover resources' });
    }
  });

  // Get resources for a specific task
  app.get('/api/gpt-supervisor/resources/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const resources = resourceManager.getResourcesForTask(taskId);
      res.json({ resources });
    } catch (error) {
      console.error('[GPT Supervisor] Error getting resources:', error);
      res.status(500).json({ error: 'Failed to get resources' });
    }
  });

  // Advanced AI Task Enhancement - automatically improve task with resources and steps
  app.post('/api/gpt-supervisor/enhance-task', async (req, res) => {
    try {
      const { taskId, sessionId } = req.body;
      
      if (!taskId) {
        return res.status(400).json({ error: 'Task ID required' });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      console.log(`[Task Enhancement] Starting for task: ${task.title}`);
      
      // Discover resources for the task
      const resources = await resourceManager.discoverResources(task.title, task.context, taskId);
      
      // Use GPT-5 to suggest steps and improvements
      const enhancement = await enhanceTaskWithAI(task, resources);
      
      // Update task with suggested steps if user would benefit
      if (enhancement.suggestedSteps?.length > 0) {
        for (const stepTitle of enhancement.suggestedSteps) {
          await storage.createStep({
            taskId: task.id,
            title: stepTitle,
            status: 'pending',
            context: task.context,
            timeWindow: task.timeWindow,
            canAuto: false
          });
        }
      }
      
      res.json({
        success: true,
        task: task,
        resources: resources,
        enhancement: enhancement,
        stepsAdded: enhancement.suggestedSteps?.length || 0
      });
      
    } catch (error) {
      console.error('[Task Enhancement] Error:', error);
      res.status(500).json({ error: 'Failed to enhance task' });
    }
  });

  // Chat endpoint - get chat history
  app.get('/api/gpt-supervisor/chat', async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const messages = chatMessages.get(sessionId as string) || [];
      res.json(messages);
    } catch (error) {
      console.error('[GPT Supervisor] Error getting chat:', error);
      res.status(500).json({ error: 'Failed to get chat messages' });
    }
  });

  // Chat endpoint - send message to GPT-5
  app.post('/api/gpt-supervisor/chat', upload.array('files'), async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const userMessageId = randomUUID();
      const assistantMessageId = randomUUID();
      
      // Get current session messages
      const currentMessages = chatMessages.get(sessionId) || [];
      
      // Add user message
      const userMessage = {
        id: userMessageId,
        role: 'user' as const,
        content: message || '',
        timestamp: new Date(),
        type: 'chat' as const
      };
      
      // Process uploaded files if any
      const files = req.files as Express.Multer.File[];
      let fileContext = '';
      if (files && files.length > 0) {
        fileContext = '\n\nUploaded files:\n';
        for (const file of files) {
          fileContext += `- ${file.originalname} (${file.mimetype})\n`;
          if (file.mimetype.startsWith('text/') || file.originalname.endsWith('.md')) {
            const content = file.buffer.toString('utf-8');
            fileContext += `Content preview: ${content.substring(0, 500)}...\n\n`;
          }
        }
      }

      // Get context about current tasks and activity
      const tasks = await storage.listTasks(sessionId);
      const recentConversations = await storage.listMessages(sessionId, 10);
      
      const contextualMessage = `${message}${fileContext}

Current Context:
- Active Tasks: ${tasks.length}
- Recent Tasks: ${tasks.slice(0, 5).map(t => `"${t.title}" (${t.status})`).join(', ')}
- Recent Conversations: ${recentConversations.length} messages
`;

      // Get GPT-5 response
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Latest GPT-5 model
        messages: [
          {
            role: "system",
            content: `You are an AI supervisor for an intelligent task management system. You help users manage their tasks, analyze their productivity patterns, and provide insights.

Your capabilities:
- Analyze task patterns and productivity
- Suggest optimizations and improvements
- Help with task planning and prioritization
- Process uploaded files and documents
- Provide actionable insights

Current user context: Session ${sessionId}
Be helpful, insightful, and actionable in your responses.`
          },
          ...currentMessages.slice(-10).map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })),
          {
            role: "user",
            content: contextualMessage
          }
        ],
        max_tokens: 1000
      });

      // Add assistant message
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.',
        timestamp: new Date(),
        type: 'chat' as const
      };

      // Update chat messages
      const updatedMessages = [...currentMessages, userMessage, assistantMessage];
      chatMessages.set(sessionId, updatedMessages);

      res.json({ success: true, message: assistantMessage });
    } catch (error) {
      console.error('[GPT Supervisor] Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Analysis endpoint - get AI insights about user activity
  app.get('/api/gpt-supervisor/analysis', async (req, res) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const sessionKey = sessionId as string;
      
      // Check if we have recent analysis
      const cached = analysisCache.get(sessionKey);
      const now = new Date();
      if (cached && (now.getTime() - cached.lastUpdated.getTime()) < 30000) { // 30 second cache
        return res.json(cached);
      }

      // Generate new analysis
      const tasks = await storage.listTasks(sessionKey);
      const recentConversations = await storage.listMessages(sessionKey, 20);
      
      if (tasks.length === 0 && recentConversations.length === 0) {
        return res.json({ 
          suggestions: null, 
          patterns: null, 
          nextActions: null,
          lastUpdated: now 
        });
      }

      // Analyze with GPT-5
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI productivity analyst. Analyze the user's task activity and provide brief, actionable insights.

Respond in JSON format with these fields:
- suggestions: Brief productivity suggestions (1-2 sentences)
- patterns: Notable patterns you observe (1-2 sentences)  
- nextActions: Recommended next actions (1-2 sentences)

Keep responses concise and actionable.`
          },
          {
            role: "user",
            content: `Analyze this user's activity:

Tasks (${tasks.length} total):
${tasks.map(t => `- "${t.title}" (${t.status}, ${t.context}, created: ${t.createdAt.toISOString()})`).join('\n')}

Recent Activity:
- ${recentConversations.length} recent conversations
- Task contexts: ${tasks.map(t => t.context).join(', ')}
- Task statuses: ${tasks.map(t => t.status).join(', ')}

Provide analysis in JSON format.`
          }
        ],
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      let analysis;
      try {
        analysis = JSON.parse(completion.choices[0].message.content || '{}');
      } catch {
        analysis = { 
          suggestions: "Continue working on your current tasks!", 
          patterns: "Building good task management habits",
          nextActions: "Focus on completing in-progress items"
        };
      }

      analysis.lastUpdated = now;
      analysisCache.set(sessionKey, analysis);

      // Save rich insights to diary system for historical library
      try {
        if (analysis.suggestions || analysis.patterns || analysis.nextActions) {
          // Create diary entries for the valuable insights
          if (analysis.suggestions && analysis.suggestions !== 'Continue working on your current tasks!') {
            gptDiary.addEntry({
              type: 'reflection',
              content: `Productivity Analysis: ${analysis.suggestions}`,
              tags: ['productivity', 'analysis', 'suggestions'],
              sessionId: sessionKey
            });
          }
          
          if (analysis.patterns && analysis.patterns !== 'Building good task management habits') {
            gptDiary.addEntry({
              type: 'learning',
              content: `Pattern Detected: ${analysis.patterns}`,
              tags: ['patterns', 'behavior', 'analysis'],
              sessionId: sessionKey
            });
          }
          
          if (analysis.nextActions && analysis.nextActions !== 'Focus on completing in-progress items') {
            gptDiary.addEntry({
              type: 'solution',
              content: `Recommended Actions: ${analysis.nextActions}`,
              tags: ['actions', 'recommendations', 'productivity'],
              sessionId: sessionKey
            });
          }
        }
      } catch (diaryError) {
        console.error('[GPT Supervisor] Failed to save insights to diary:', diaryError);
        // Don't fail the main response if diary save fails
      }

      res.json(analysis);
    } catch (error) {
      console.error('[GPT Supervisor] Error generating analysis:', error);
      res.status(500).json({ error: 'Failed to generate analysis' });
    }
  });

  // Endpoint to manually trigger analysis update
  app.post('/api/gpt-supervisor/analyze', async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      // Clear cache to force new analysis
      analysisCache.delete(sessionId);
      
      res.json({ success: true, message: 'Analysis will be updated on next request' });
    } catch (error) {
      console.error('[GPT Supervisor] Error triggering analysis:', error);
      res.status(500).json({ error: 'Failed to trigger analysis' });
    }
  });

  console.log('[GPT Supervisor] Routes initialized');
}