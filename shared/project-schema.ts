import { z } from 'zod';

// Fractal Project Organization System - Self-organizing and scalable
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()),
  sessionId: z.string(),
  // Fractal nesting
  parentProjectId: z.string().optional(), // For hierarchical organization
  childProjectIds: z.array(z.string()).optional(), // Sub-projects
  nestingLevel: z.number().default(0), // Depth in hierarchy
  // Pattern recognition
  patternSignature: z.string().optional(), // AI-detected organizing pattern
  autoReorganized: z.boolean().optional(), // Whether system auto-organized this
  organizingThemes: z.array(z.string()).optional(), // Detected themes for grouping
  // Scaling metrics
  taskCount: z.number().default(0),
  researchCount: z.number().default(0),
  complexityScore: z.number().default(0), // For determining when to split/merge
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