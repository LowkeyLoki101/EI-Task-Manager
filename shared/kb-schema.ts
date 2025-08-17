import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";

// Knowledge Base Entry Schema
export const knowledgeEntries = pgTable("knowledge_entries", {
  id: varchar("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  source: varchar("source", { enum: ["diary", "search", "simulation", "marketing", "research", "content-draft", "ai-creation"] }).notNull(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  // Enhanced content workflow fields
  status: varchar("status", { enum: ["active", "draft", "approved", "rejected", "archived"] }).default("active").notNull(),
  contentType: varchar("content_type", { enum: ["research", "blog", "social", "newsletter", "document"] }),
  platforms: jsonb("platforms").$type<string[]>().default([]), // target platforms for content
  approvalStatus: varchar("approval_status", { enum: ["pending", "approved", "rejected", "auto-approved"] }).default("pending"),
  approvedBy: varchar("approved_by"), // 'ai' or 'human' or user ID
  draftData: jsonb("draft_data").$type<{
    characterCounts?: Record<string, number>;
    platforms?: string[];
    originalTopic?: string;
    creationSteps?: any[];
  }>().default({}),
  tags: jsonb("tags").$type<string[]>().default([]),
  derivedTasks: jsonb("derived_tasks").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Self-Question Pool Schema
export const selfQuestions = pgTable("self_questions", {
  id: varchar("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  text: text("text").notNull(),
  category: varchar("category").default("general"),
  useCount: text("use_count").default("0"),
  lastUsed: timestamp("last_used"),
  effectiveness: text("effectiveness").default("5"), // 1-10 rating
  created: timestamp("created").defaultNow(),
  retired: timestamp("retired"),
});

// Lens Processing Sessions
export const lensProcessingSessions = pgTable("lens_processing_sessions", {
  id: varchar("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  trigger: text("trigger").notNull(),
  frameStep: text("frame_step"),
  reframeStep: text("reframe_step"),
  metaLensStep: text("meta_lens_step"),
  recursiveStep: text("recursive_step"),
  closureStep: text("closure_step"),
  generatedTasks: jsonb("generated_tasks").$type<string[]>().default([]),
  generatedKbEntries: jsonb("generated_kb_entries").$type<string[]>().default([]),
  generatedResearch: jsonb("generated_research").$type<string[]>().default([]),
  completed: timestamp("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;
export type InsertKnowledgeEntry = typeof knowledgeEntries.$inferInsert;

export type SelfQuestion = typeof selfQuestions.$inferSelect;
export type InsertSelfQuestion = typeof selfQuestions.$inferInsert;

export type LensProcessingSession = typeof lensProcessingSessions.$inferSelect;
export type InsertLensProcessingSession = typeof lensProcessingSessions.$inferInsert;

// Zod schemas for validation
export const insertKnowledgeEntrySchema = createInsertSchema(knowledgeEntries);
export const insertSelfQuestionSchema = createInsertSchema(selfQuestions);
export const insertLensProcessingSessionSchema = createInsertSchema(lensProcessingSessions);

// API request schemas
export const createKbEntrySchema = z.object({
  sessionId: z.string(),
  source: z.enum(["diary", "search", "simulation", "marketing", "research"]),
  topic: z.string(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
  derivedTasks: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateSelfQuestionSchema = z.object({
  effectiveness: z.string().optional(),
  useCount: z.string().optional(),
  retired: z.boolean().optional(),
});

export const triggerLensProcessingSchema = z.object({
  sessionId: z.string(),
  trigger: z.string(),
  mode: z.enum(["colby_lens", "random_jolt", "research_focused"]).optional(),
});

export type CreateKbEntryRequest = z.infer<typeof createKbEntrySchema>;
export type UpdateSelfQuestionRequest = z.infer<typeof updateSelfQuestionSchema>;
export type TriggerLensProcessingRequest = z.infer<typeof triggerLensProcessingSchema>;