import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Core entities based on memory anchors architecture
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ['backlog', 'today', 'doing', 'done'] }).default('backlog').notNull(),
  context: text("context", { enum: ['computer', 'phone', 'physical'] }).default('computer').notNull(),
  timeWindow: text("time_window", { enum: ['morning', 'midday', 'evening', 'any'] }).default('any').notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const steps = pgTable("steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  parentStepId: varchar("parent_step_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ['pending', 'running', 'blocked', 'done'] }).default('pending').notNull(),
  canAuto: boolean("can_auto").default(false).notNull(),
  toolHint: text("tool_hint"),
  context: text("context", { enum: ['computer', 'phone', 'physical'] }).default('computer').notNull(),
  timeWindow: text("time_window", { enum: ['morning', 'midday', 'evening', 'any'] }).default('any').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const artifacts = pgTable("artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stepId: varchar("step_id").notNull(),
  type: text("type", { enum: ['link', 'file', 'note', 'html', 'qr'] }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(), // URL, file path, text content, etc.
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memories = pgTable("memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  domain: text("domain").notNull(), // e.g., 'dns', 'print', 'kb'
  key: text("key").notNull(), // e.g., 'getskyclaim.com', 'sticker_export_profile'
  value: json("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  taskId: varchar("task_id"),
  role: text("role", { enum: ['user', 'assistant'] }).notNull(),
  content: text("content").notNull(),
  transcript: text("transcript"), // ASR text if from voice
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const installations = pgTable("installations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  platform: text("platform").notNull(), // e.g., 'elevenlabs', 'godaddy', 'github'
  domain: text("domain"),
  apiKeys: json("api_keys").default({}),
  config: json("config").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Legacy tables for backward compatibility (will migrate data)
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  message: text("message").notNull(),
  diffSummary: text("diff_summary").array().default([]),
  previewUrl: text("preview_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({ createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ createdAt: true, updatedAt: true });
export const insertStepSchema = createInsertSchema(steps).omit({ createdAt: true, updatedAt: true });
export const insertArtifactSchema = createInsertSchema(artifacts).omit({ createdAt: true });
export const insertMemorySchema = createInsertSchema(memories).omit({ createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, timestamp: true });
export const insertInstallationSchema = createInsertSchema(installations).omit({ createdAt: true, updatedAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ createdAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ createdAt: true });

// Types
export type Session = typeof sessions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Step = typeof steps.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Installation = typeof installations.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type File = typeof files.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertStep = z.infer<typeof insertStepSchema>;
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertInstallation = z.infer<typeof insertInstallationSchema>;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;

// Action schemas for ElevenLabs integration
export const addTaskActionSchema = z.object({
  title: z.string(),
  context: z.enum(['computer', 'phone', 'physical']).optional(),
  timeWindow: z.enum(['morning', 'midday', 'evening', 'any']).optional(),
  steps: z.array(z.string()).optional(),
});

export const updateStepStatusActionSchema = z.object({
  stepId: z.string(),
  status: z.enum(['pending', 'running', 'blocked', 'done']),
});

export const getTodoListActionSchema = z.object({
  context: z.enum(['computer', 'phone', 'physical']).optional(),
  view: z.enum(['items', 'steps', 'substeps']).optional(),
});

export const kbAttachDocActionSchema = z.object({
  agentId: z.string(),
  url: z.string().optional(),
  file: z.string().optional(),
});

export const postOpsUpdateActionSchema = z.object({
  message: z.string(),
  deltas: z.array(z.object({
    type: z.string(),
    id: z.string(),
    change: z.record(z.any()),
  })),
});

export type AddTaskAction = z.infer<typeof addTaskActionSchema>;
export type UpdateStepStatusAction = z.infer<typeof updateStepStatusActionSchema>;
export type GetTodoListAction = z.infer<typeof getTodoListActionSchema>;
export type KbAttachDocAction = z.infer<typeof kbAttachDocActionSchema>;
export type PostOpsUpdateAction = z.infer<typeof postOpsUpdateActionSchema>;