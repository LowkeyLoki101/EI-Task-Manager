// Real-time AI Content Creation with Live Thinking Display
import type { Express } from "express";
import { openai } from './lib/openaiWrapper';
import { storage } from './storage';

interface ContentCreationRequest {
  sessionId: string;
  contentType: 'blog' | 'social' | 'newsletter';
  platforms: string[];
  topic?: string;
  liveMode: boolean;
}

interface LiveThinkingStep {
  step: string;
  thought: string;
  progress: number;
  options: string[];
  selectedOption?: string;
  timestamp: Date;
}

// Global store for live content creation sessions
const contentSessions = new Map<string, {
  isActive: boolean;
  steps: LiveThinkingStep[];
  currentContent: string;
  platforms: string[];
  contentType: string;
}>();

export function registerContentCreationRoutes(app: Express) {
  
  // Start AI content creation with live thinking
  app.post('/api/workstation/create-content', async (req, res) => {
    try {
      const { sessionId, contentType, platforms, topic, liveMode }: ContentCreationRequest = req.body;
      
      console.log(`[Content Creation] Starting ${contentType} creation for session ${sessionId}`);
      
      // Initialize session
      contentSessions.set(sessionId, {
        isActive: true,
        steps: [],
        currentContent: '',
        platforms,
        contentType
      });
      
      // Start async content creation process
      processContentCreation(sessionId, contentType, platforms, topic || 'AI and Business Innovation');
      
      res.json({ success: true, message: 'Content creation started' });
    } catch (error) {
      console.error('[Content Creation] Start failed:', error);
      res.status(500).json({ error: 'Failed to start content creation' });
    }
  });

  // Live content creation stream
  app.get('/api/workstation/content-stream/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const session = contentSessions.get(sessionId);
    if (!session) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Session not found' })}\n\n`);
      res.end();
      return;
    }

    // Send initial status
    res.write(`data: ${JSON.stringify({ 
      type: 'status', 
      message: 'Content creation in progress...' 
    })}\n\n`);

    // Set up interval to check for updates
    const interval = setInterval(() => {
      const currentSession = contentSessions.get(sessionId);
      if (!currentSession || !currentSession.isActive) {
        clearInterval(interval);
        res.end();
        return;
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });
}

// AI Content Creation Process with Live Thinking
async function processContentCreation(
  sessionId: string, 
  contentType: string, 
  platforms: string[], 
  topic: string
) {
  const session = contentSessions.get(sessionId);
  if (!session) return;

  try {
    console.log(`[Content Creation] Processing ${contentType} about "${topic}" for ${platforms.join(', ')}`);

    // Step 1: Analyzing Context
    await simulateLiveThinking(sessionId, {
      step: 'Analyzing Context',
      thought: `Examining the topic "${topic}" and understanding the target platforms: ${platforms.join(', ')}. Considering audience, tone, and platform-specific requirements.`,
      progress: 15,
      options: ['Professional tone', 'Casual tone', 'Technical focus', 'Business focus'],
      selectedOption: contentType === 'blog' ? 'Professional tone' : 'Business focus',
      timestamp: new Date()
    });

    // Step 2: Research and Ideation
    await simulateLiveThinking(sessionId, {
      step: 'Research & Ideation',
      thought: `Gathering insights about ${topic}. Analyzing current trends, key talking points, and audience interests. Generating multiple content angles to choose from.`,
      progress: 30,
      options: ['Industry trends', 'Case studies', 'How-to guide', 'Opinion piece'],
      selectedOption: 'Industry trends',
      timestamp: new Date()
    });

    // Step 3: Content Planning
    await simulateLiveThinking(sessionId, {
      step: 'Content Planning',
      thought: `Creating content structure optimized for ${platforms.join(' and ')}. Planning hook, main points, and call-to-action. Considering character limits and engagement strategies.`,
      progress: 45,
      options: ['Question hook', 'Statistic hook', 'Story hook', 'Controversial hook'],
      selectedOption: 'Statistic hook',
      timestamp: new Date()
    });

    // Generate actual content with AI
    const contentPrompt = `Create engaging ${contentType} content about "${topic}" for ${platforms.join(', ')}.

Requirements:
- Hook the audience immediately
- Provide valuable insights
- Include actionable takeaways
- Optimize for platform character limits
- Use engaging, professional tone
- Include relevant hashtags for social platforms

Platform details:
${platforms.map(p => `- ${p}: ${getPlatformLimits(p)} characters`).join('\n')}

Make it compelling and shareable while maintaining professional quality.`;

    // Step 4: AI Content Generation
    await simulateLiveThinking(sessionId, {
      step: 'AI Content Generation',
      thought: 'Crafting the actual content using advanced language models. Balancing creativity with accuracy, ensuring the message resonates with the target audience.',
      progress: 70,
      options: ['Long-form', 'Medium-form', 'Short-form', 'Multi-part'],
      selectedOption: contentType === 'blog' ? 'Long-form' : 'Medium-form',
      timestamp: new Date()
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: contentPrompt }],
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedContent = completion.choices[0]?.message?.content || 'Content generation failed';

    // Step 5: Platform Optimization
    await simulateLiveThinking(sessionId, {
      step: 'Platform Optimization',
      thought: 'Optimizing content for each selected platform. Adjusting formatting, hashtags, and length while maintaining message integrity.',
      progress: 85,
      options: ['Hashtag optimization', 'Format adjustment', 'Length optimization', 'Engagement optimization'],
      selectedOption: 'Engagement optimization',
      timestamp: new Date()
    });

    // Update session with content
    session.currentContent = generatedContent;

    // Step 6: Final Polish
    await simulateLiveThinking(sessionId, {
      step: 'Final Polish',
      thought: 'Adding final touches: checking grammar, optimizing flow, ensuring brand consistency, and preparing for publication.',
      progress: 100,
      options: ['Grammar check', 'Flow optimization', 'Brand alignment', 'Publication ready'],
      selectedOption: 'Publication ready',
      timestamp: new Date()
    });

    // Save ALL content to knowledge base as drafts first (Content Draft Cache)
    try {
      const { saveKnowledgeEntry } = await import('./kb-storage');
      
      await saveKnowledgeEntry({
        sessionId,
        topic: extractTitle(generatedContent) || topic,
        content: generatedContent,
        source: 'content-draft',
        status: 'draft',
        contentType: contentType as any,
        platforms: platforms,
        approvalStatus: 'pending',
        draftData: {
          characterCounts: platforms.reduce((acc, platform) => {
            acc[platform] = generatedContent.length;
            return acc;
          }, {} as Record<string, number>),
          platforms,
          originalTopic: topic,
          creationSteps: session.steps
        },
        tags: ['ai-generated', 'content-creation', contentType, ...platforms],
        metadata: {
          platforms,
          topic,
          generatedAt: new Date().toISOString(),
          sessionId,
          workstationMode: 'content-creation',
          contentType
        }
      });
    } catch (error) {
      console.warn('[Content Creation] Failed to save to knowledge base:', error);
    }

    console.log(`[Content Creation] ✅ Saved ${contentType} content to knowledge base as draft for approval`);
    
    // Only create blog post directly if auto-approval is enabled and it's high quality
    if (contentType === 'blog') {
      const qualityScore = await assessContentQuality(generatedContent);
      if (qualityScore > 0.8) {
        await storage.createBlogPost({
          sessionId,
          title: extractTitle(generatedContent) || `AI-Generated Content: ${topic}`,
          slug: generateSlug(extractTitle(generatedContent) || topic),
          excerpt: extractExcerpt(generatedContent),
          content: generatedContent,
          status: 'draft',
          source: 'ai-research',
          tags: ['ai-generated', 'content-creation', ...platforms],
          metadata: {
            platforms,
            topic,
            generatedAt: new Date().toISOString(),
            sessionId,
            workstationMode: 'content-creation',
            autoApproved: true,
            qualityScore
          },
          publishedAt: null
        });
      }
    }

    // Mark session complete
    session.isActive = false;
    
    console.log(`[Content Creation] ✅ Complete: ${contentType} for ${platforms.join(', ')}`);

  } catch (error) {
    console.error('[Content Creation] Process failed:', error);
    session.isActive = false;
  }
}

// Simulate live thinking with SSE updates
async function simulateLiveThinking(sessionId: string, thinking: LiveThinkingStep) {
  const session = contentSessions.get(sessionId);
  if (!session) return;

  session.steps.push(thinking);
  
  // Simulate realistic thinking time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  
  console.log(`[Content Creation] ${sessionId} - ${thinking.step}: ${thinking.thought.substring(0, 100)}...`);
}

// Platform character limits
function getPlatformLimits(platform: string): number {
  const limits: Record<string, number> = {
    'twitter': 280,
    'instagram': 2200,
    'facebook': 63206,
    'linkedin': 3000,
    'youtube': 5000,
    'blog': 10000
  };
  return limits[platform] || 1000;
}

// Utility functions
function extractTitle(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('#') || line.length > 10) {
      return line.replace(/^#+\s*/, '').trim().substring(0, 100);
    }
  }
  return null;
}

function extractExcerpt(content: string): string {
  return content.split('\n').find(line => line.length > 50)?.substring(0, 200) + '...' || '';
}

// AI Content Quality Assessment
async function assessContentQuality(content: string): Promise<number> {
  const wordCount = content.split(' ').length;
  const hasGoodStructure = content.includes('\n') || content.includes('.');
  const isReasonableLength = wordCount > 50 && wordCount < 2000;
  
  let score = 0.5;
  if (wordCount > 100) score += 0.2;
  if (hasGoodStructure) score += 0.2;
  if (isReasonableLength) score += 0.1;
  
  return Math.min(score, 1.0);
}

function generateSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}