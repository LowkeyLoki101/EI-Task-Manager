import { z } from 'zod';

// Project Organization System - Scalable task and research management
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()),
  sessionId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any()).optional()
});

export const ProjectNoteSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sessionId: z.string(),
  content: z.string(),
  type: z.enum(['user-note', 'ai-insight', 'research-finding', 'task-completion']),
  tags: z.array(z.string()),
  createdAt: z.date(),
  metadata: z.record(z.any()).optional()
});

export const ResearchFootprintSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  projectId: z.string().optional(),
  query: z.string(),
  searchUrls: z.array(z.string()),
  summary: z.string(),
  insights: z.array(z.string()),
  results: z.array(z.any()),
  timestamp: z.date(),
  aiThinking: z.string(),
  status: z.enum(['in-progress', 'completed', 'archived']),
  userNotes: z.array(z.string()).optional()
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectNote = z.infer<typeof ProjectNoteSchema>;
export type ResearchFootprint = z.infer<typeof ResearchFootprintSchema>;

// Enhanced Task with Project Association
export const EnhancedTaskSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['today', 'pending', 'in-progress', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  context: z.enum(['computer', 'phone', 'physical']),
  timeWindow: z.enum(['morning', 'midday', 'evening', 'any']),
  sessionId: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
  dueDate: z.date().optional(),
  completionNotes: z.string().optional(),
  researchFootprints: z.array(z.string()).optional(), // References to ResearchFootprint IDs
  aiGenerated: z.boolean().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type EnhancedTask = z.infer<typeof EnhancedTaskSchema>;