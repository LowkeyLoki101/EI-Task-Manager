import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("med"),
  due: timestamp("due"),
  notes: text("notes").array().default([]),
  subtasks: json("subtasks").default([]),
  attachments: json("attachments").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey(),
  sessionId: varchar("session_id").notNull(),
  message: text("message").notNull(),
  diffSummary: text("diff_summary").array().default([]),
  previewUrl: text("preview_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey(),
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
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, timestamp: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ createdAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ createdAt: true });

// Types
export type Session = typeof sessions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type File = typeof files.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;

// Extended types for frontend
export interface TaskWithSubtasks extends Task {
  subtasks: Array<{
    id: string;
    title: string;
    status: 'todo' | 'done';
  }>;
  attachments: Array<{
    name: string;
    url: string;
    type: 'video' | 'document' | 'image';
  }>;
}

export interface SystemStats {
  totalTasks: number;
  completedToday: number;
  activeProposals: number;
  filesProcessed: number;
}
