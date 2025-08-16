// Blog Routes - AI Research Publications System
import type { Express } from "express";
import { storage } from "./storage";
import { insertBlogPostSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export function registerBlogRoutes(app: Express) {
  
  // Get all published blog posts
  app.get('/api/blog/posts', async (req, res) => {
    try {
      const { status = 'published', limit = 10, offset = 0 } = req.query;
      const posts = await storage.listBlogPosts(String(status), Number(limit), Number(offset));
      res.json({ posts, total: posts.length });
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  // Get blog post by slug
  app.get('/api/blog/posts/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);
      
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      
      res.json({ post });
    } catch (error) {
      console.error('Failed to fetch blog post:', error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  // Get blog posts by session (for management)
  app.get('/api/blog/session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { status } = req.query;
      
      const posts = await storage.listBlogPostsBySession(sessionId, String(status) || undefined);
      res.json({ posts });
    } catch (error) {
      console.error('Failed to fetch session blog posts:', error);
      res.status(500).json({ error: 'Failed to fetch session blog posts' });
    }
  });

  // Create new blog post (manual or AI-generated)
  app.post('/api/blog/posts', async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      
      // Generate slug if not provided
      if (!validatedData.slug) {
        validatedData.slug = generateSlug(validatedData.title);
      }
      
      // Generate excerpt if not provided
      if (!validatedData.excerpt && validatedData.content) {
        validatedData.excerpt = generateExcerpt(validatedData.content);
      }
      
      const post = await storage.createBlogPost({
        ...validatedData,
        publishedAt: validatedData.status === 'published' ? new Date() : null,
      });
      
      console.log(`[Blog] Created post: ${post.title} (${post.status})`);
      res.json({ post });
    } catch (error) {
      console.error('Failed to create blog post:', error);
      res.status(400).json({ error: 'Failed to create blog post', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Update blog post
  app.put('/api/blog/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBlogPostSchema.partial().parse(req.body);
      
      // Handle publishing
      if (validatedData.status === 'published' && !req.body.publishedAt) {
        validatedData.publishedAt = new Date();
      }
      
      const post = await storage.updateBlogPost(id, validatedData);
      
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      
      console.log(`[Blog] Updated post: ${post.title} (${post.status})`);
      res.json({ post });
    } catch (error) {
      console.error('Failed to update blog post:', error);
      res.status(400).json({ error: 'Failed to update blog post', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Publish a draft post
  app.post('/api/blog/posts/:id/publish', async (req, res) => {
    try {
      const { id } = req.params;
      
      const post = await storage.updateBlogPost(id, {
        status: 'published',
        publishedAt: new Date()
      });
      
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      
      console.log(`[Blog] Published post: ${post.title}`);
      res.json({ post, message: 'Post published successfully' });
    } catch (error) {
      console.error('Failed to publish blog post:', error);
      res.status(500).json({ error: 'Failed to publish blog post' });
    }
  });

  // Delete blog post
  app.delete('/api/blog/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await storage.deleteBlogPost(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      
      console.log(`[Blog] Deleted post: ${id}`);
      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Failed to delete blog post:', error);
      res.status(500).json({ error: 'Failed to delete blog post' });
    }
  });

  // AI-generated blog post from research results
  app.post('/api/blog/generate-from-research/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { researchTopics, completionCycleData } = req.body;
      
      // Generate blog post from research data
      const blogPost = await generateBlogFromResearch(sessionId, researchTopics, completionCycleData);
      
      console.log(`[Blog] AI-generated post: ${blogPost.title} from research`);
      res.json({ post: blogPost, message: 'Blog post generated from research' });
    } catch (error) {
      console.error('Failed to generate blog post from research:', error);
      res.status(500).json({ error: 'Failed to generate blog post from research' });
    }
  });
}

// Utility functions
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

function generateExcerpt(content: string): string {
  // Remove markdown formatting and get first paragraph
  const plainText = content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  const firstParagraph = plainText.split('\n\n')[0];
  return firstParagraph.length > 200 
    ? firstParagraph.substring(0, 200) + '...'
    : firstParagraph;
}

// AI Blog Generation from Research
async function generateBlogFromResearch(sessionId: string, researchTopics: string[], completionCycleData: any) {
  const { KnowledgeBaseManager } = await import('./knowledge-base');
  const knowledgeBaseManager = new KnowledgeBaseManager();
  
  // Get GPT to write a blog post from research
  const OpenAI = await import('openai');
  const openai = new OpenAI.default({ 
    apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
  });

  const prompt = `Write a professional blog post based on the following AI research data:

## Research Topics Covered:
${researchTopics.join(', ')}

## Completion Cycle Data:
${JSON.stringify(completionCycleData, null, 2)}

## Requirements:
- Professional, engaging tone
- Include key insights and actionable takeaways
- Structure with clear headings and sections
- Focus on business applications and implications
- 800-1200 words
- Include a compelling introduction and conclusion

Write the blog post in markdown format:`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', // newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content || '';
  const title = extractTitle(content) || `AI Research Insights - ${new Date().toLocaleDateString()}`;
  
  // Create the blog post
  const blogPost = await storage.createBlogPost({
    sessionId,
    title,
    slug: generateSlug(title),
    excerpt: generateExcerpt(content),
    content,
    status: 'published' as const, // Auto-publish AI research
    source: 'completion-cycle' as const,
    tags: [...researchTopics, 'ai-research', 'autonomous-agent'],
    metadata: {
      researchTopics,
      completionCycleData,
      generatedAt: new Date().toISOString(),
      aiGenerated: true
    },
    publishedAt: new Date(),
  });

  // Also save to knowledge base using the correct method
  await knowledgeBaseManager.addFromResearchDoc({
    id: randomUUID(),
    sessionId,
    projectId: null,
    title: `Blog Post: ${title}`,
    content,
    summary: blogPost.excerpt || null,
    sources: [],
    tags: ['blog-post', 'published', ...researchTopics],
    type: 'research',
    metadata: {
      blogPostId: blogPost.id,
      publishedAt: new Date().toISOString()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return blogPost;
}

function extractTitle(markdown: string): string | null {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}