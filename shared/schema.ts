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
  tags: text("tags").array().default([]),
  priority: text("priority", { enum: ['low', 'medium', 'high', 'urgent'] }).default('medium').notNull(),
  category: text("category").default('general'),
  dueDate: timestamp("due_date"),
  resources: json("resources").default([]), // URLs, file links, references
  notes: text("notes"),
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
  stepId: varchar("step_id"),
  projectId: varchar("project_id"), // New: associate with projects
  type: text("type", { enum: ['link', 'file', 'note', 'html', 'qr', 'excel', 'csv', 'audio', 'image', 'research'] }).notNull(),
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

// Event sourcing for persistent, adaptive sessions
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  kind: text("kind").notNull(), // e.g., 'task.created', 'conversation.message', 'protocol.updated'
  payloadJson: json("payload_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const snapshots = pgTable("snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  atEventId: varchar("at_event_id").notNull(),
  stateJson: json("state_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Adaptive notes and protocols for continuous learning
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  category: text("category").notNull(), // e.g., 'user_preference', 'workflow_pattern', 'context_hint'
  title: text("title").notNull(),
  content: text("content").notNull(),
  confidence: integer("confidence").default(1).notNull(), // 1-10 scale
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const protocols = pgTable("protocols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  name: text("name").notNull(), // e.g., 'task_organization', 'meeting_processing'
  rules: json("rules").notNull(), // adaptive rules that evolve
  successCount: integer("success_count").default(0).notNull(),
  version: integer("version").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Projects - New comprehensive project management
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active, paused, completed, archived
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  tags: text("tags").array().default([]),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Research Documents - For GPT-5 to create and save research
export const researchDocs = pgTable("research_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id"),
  sessionId: varchar("session_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  sources: text("sources").array().default([]),
  tags: text("tags").array().default([]),
  type: text("type").notNull().default("research"), // research, notes, analysis, proposal, draft
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Calendar Events - For scheduling and organization
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  projectId: varchar("project_id"),
  taskId: varchar("task_id"),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isAllDay: boolean("is_all_day").default(false),
  recurrence: text("recurrence"), // "daily", "weekly", "monthly", etc.
  location: text("location"),
  attendees: text("attendees").array().default([]),
  reminders: json("reminders").default([]),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project Files - Enhanced file management with project association
export const projectFiles = pgTable("project_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id"),
  sessionId: varchar("session_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().default("other"), // image, document, research, media, other
  description: text("description"),
  tags: text("tags").array().default([]),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStepSchema = createInsertSchema(steps).omit({ createdAt: true, updatedAt: true });
export const insertArtifactSchema = createInsertSchema(artifacts).omit({ createdAt: true });
export const insertMemorySchema = createInsertSchema(memories).omit({ createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, timestamp: true });
export const insertInstallationSchema = createInsertSchema(installations).omit({ createdAt: true, updatedAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ createdAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertSnapshotSchema = createInsertSchema(snapshots).omit({ id: true, createdAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true, lastUsed: true });
export const insertProtocolSchema = createInsertSchema(protocols).omit({ id: true, updatedAt: true });

// New project management schemas
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertResearchDocSchema = createInsertSchema(researchDocs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({ id: true, createdAt: true });

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
export type Event = typeof events.$inferSelect;
export type Snapshot = typeof snapshots.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Protocol = typeof protocols.$inferSelect;

// New project management types
export type Project = typeof projects.$inferSelect;
export type ResearchDoc = typeof researchDocs.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type ProjectFile = typeof projectFiles.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertStep = z.infer<typeof insertStepSchema>;
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertInstallation = z.infer<typeof insertInstallationSchema>;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertProtocol = z.infer<typeof insertProtocolSchema>;

// New project management insert types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertResearchDoc = z.infer<typeof insertResearchDocSchema>;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

// Select types for enhanced actions
export type SelectTask = typeof tasks.$inferSelect;
export type SelectStep = typeof steps.$inferSelect;

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
  view: z.enum(['items', 'steps', 'substeps', 'tasks']).optional(),
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

// Conversation transcription storage
export const conversationTranscripts = pgTable("conversation_transcripts", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant' 
  content: text("content").notNull(),
  transcript: text("transcript"), // Full ASR transcript if available
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  conversationId: text("conversation_id"), // ElevenLabs conversation ID
  duration: integer("duration"), // Audio duration in seconds
  metadata: json("metadata"), // Additional data (emotion, intent, etc.)
});

export const insertConversationTranscriptSchema = createInsertSchema(conversationTranscripts).omit({
  timestamp: true,
});

export type InsertConversationTranscript = z.infer<typeof insertConversationTranscriptSchema>;
export type ConversationTranscript = typeof conversationTranscripts.$inferSelect;

// Code Analysis and Recommendations System
export const codeRecommendations = pgTable("code_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  type: text("type", { enum: ['improvement', 'bug_fix', 'feature', 'optimization', 'security', 'refactor'] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  filePath: text("file_path"),
  codeSnippet: text("code_snippet"),
  recommendation: text("recommendation").notNull(),
  reasoning: text("reasoning").notNull(),
  priority: text("priority", { enum: ['low', 'medium', 'high', 'critical'] }).default('medium').notNull(),
  estimatedEffort: text("estimated_effort", { enum: ['quick', 'moderate', 'substantial', 'major'] }).default('moderate').notNull(),
  status: text("status", { enum: ['pending', 'approved', 'rejected', 'implemented'] }).default('pending').notNull(),
  votes: integer("votes").default(0).notNull(),
  confidence: integer("confidence").default(5).notNull(), // 1-10 scale
  tags: text("tags").array().default([]),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Voting system for recommendations
export const recommendationVotes = pgTable("recommendation_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recommendationId: varchar("recommendation_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  voteType: text("vote_type", { enum: ['up', 'down'] }).notNull(),
  feedback: text("feedback"), // Optional user feedback
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// File analysis results
export const fileAnalysis = pgTable("file_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  analysisType: text("analysis_type", { enum: ['code_review', 'security_scan', 'performance', 'architecture', 'documentation'] }).notNull(),
  summary: text("summary").notNull(),
  details: json("details").notNull(), // Detailed analysis results
  issues: json("issues").default([]), // List of issues found
  suggestions: json("suggestions").default([]), // List of suggestions
  complexity: integer("complexity").default(1).notNull(), // 1-10 scale
  maintainability: integer("maintainability").default(5).notNull(), // 1-10 scale
  status: text("status", { enum: ['analyzing', 'completed', 'error'] }).default('analyzing').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export requests tracking
export const exportRequests = pgTable("export_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  exportType: text("export_type", { enum: ['pdf', 'txt', 'json', 'ts', 'markdown'] }).notNull(),
  contentType: text("content_type", { enum: ['insights', 'recommendations', 'analysis', 'tasks', 'all'] }).notNull(),
  filters: json("filters").default({}), // Filter criteria for export
  status: text("status", { enum: ['pending', 'processing', 'completed', 'error'] }).default('pending').notNull(),
  fileUrl: text("file_url"), // URL to generated file
  fileName: text("file_name"),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Insert schemas for new tables
export const insertCodeRecommendationSchema = createInsertSchema(codeRecommendations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecommendationVoteSchema = createInsertSchema(recommendationVotes).omit({ id: true, createdAt: true });
export const insertFileAnalysisSchema = createInsertSchema(fileAnalysis).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExportRequestSchema = createInsertSchema(exportRequests).omit({ id: true, createdAt: true, completedAt: true });

// Types for new tables
export type CodeRecommendation = typeof codeRecommendations.$inferSelect;
export type RecommendationVote = typeof recommendationVotes.$inferSelect;
export type FileAnalysis = typeof fileAnalysis.$inferSelect;
export type ExportRequest = typeof exportRequests.$inferSelect;

export type InsertCodeRecommendation = z.infer<typeof insertCodeRecommendationSchema>;
export type InsertRecommendationVote = z.infer<typeof insertRecommendationVoteSchema>;
export type InsertFileAnalysis = z.infer<typeof insertFileAnalysisSchema>;
export type InsertExportRequest = z.infer<typeof insertExportRequestSchema>;

export type SelectConversationTranscript = typeof conversationTranscripts.$inferSelect;