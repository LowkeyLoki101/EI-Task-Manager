import { type Task, type InsertTask, type Conversation, type InsertConversation, type Proposal, type InsertProposal, type File, type InsertFile, type Session, type InsertSession, type SystemStats, type TaskWithSubtasks } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;

  // Tasks
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  listTasks(sessionId: string): Promise<TaskWithSubtasks[]>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Conversations
  createMessage(message: InsertConversation): Promise<Conversation>;
  listMessages(sessionId: string, limit?: number): Promise<Conversation[]>;

  // Proposals
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  listProposals(sessionId?: string): Promise<Proposal[]>;
  updateProposal(id: string, updates: Partial<InsertProposal>): Promise<Proposal>;
  deleteProposal(id: string): Promise<void>;

  // Files
  createFile(file: InsertFile): Promise<File>;
  listFiles(sessionId: string): Promise<File[]>;
  deleteFile(id: string): Promise<void>;

  // Stats
  getSystemStats(sessionId: string): Promise<SystemStats>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;
  private tasks: Map<string, Task>;
  private conversations: Map<string, Conversation>;
  private proposals: Map<string, Proposal>;
  private files: Map<string, File>;

  constructor() {
    this.sessions = new Map();
    this.tasks = new Map();
    this.conversations = new Map();
    this.proposals = new Map();
    this.files = new Map();
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const session: Session = {
      ...insertSession,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const task: Task = {
      ...insertTask,
      status: insertTask.status || 'todo',
      priority: insertTask.priority || 'med',
      notes: insertTask.notes || [],
      subtasks: insertTask.subtasks || [],
      attachments: insertTask.attachments || [],
      due: insertTask.due || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async listTasks(sessionId: string): Promise<TaskWithSubtasks[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.sessionId === sessionId)
      .map(task => ({
        ...task,
        subtasks: (task.subtasks as any[]) || [],
        attachments: (task.attachments as any[]) || []
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task> {
    const existing = this.tasks.get(id);
    if (!existing) {
      throw new Error("Task not found");
    }
    
    const updated: Task = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  async createMessage(insertMessage: InsertConversation): Promise<Conversation> {
    const message: Conversation = {
      ...insertMessage,
      id: randomUUID(),
      timestamp: new Date(),
    };
    this.conversations.set(message.id, message);
    return message;
  }

  async listMessages(sessionId: string, limit?: number): Promise<Conversation[]> {
    const messages = Array.from(this.conversations.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return limit ? messages.slice(-limit) : messages;
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const proposal: Proposal = {
      ...insertProposal,
      status: insertProposal.status || 'pending',
      diffSummary: insertProposal.diffSummary || [],
      previewUrl: insertProposal.previewUrl || null,
      createdAt: new Date(),
    };
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  async listProposals(sessionId?: string): Promise<Proposal[]> {
    const proposals = Array.from(this.proposals.values());
    return sessionId 
      ? proposals.filter(p => p.sessionId === sessionId)
      : proposals;
  }

  async updateProposal(id: string, updates: Partial<InsertProposal>): Promise<Proposal> {
    const existing = this.proposals.get(id);
    if (!existing) {
      throw new Error("Proposal not found");
    }
    
    const updated: Proposal = {
      ...existing,
      ...updates,
    };
    this.proposals.set(id, updated);
    return updated;
  }

  async deleteProposal(id: string): Promise<void> {
    this.proposals.delete(id);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const file: File = {
      ...insertFile,
      createdAt: new Date(),
    };
    this.files.set(file.id, file);
    return file;
  }

  async listFiles(sessionId: string): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.sessionId === sessionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteFile(id: string): Promise<void> {
    this.files.delete(id);
  }

  async getSystemStats(sessionId: string): Promise<SystemStats> {
    const sessionTasks = Array.from(this.tasks.values()).filter(t => t.sessionId === sessionId);
    const completedToday = sessionTasks.filter(t => 
      t.status === 'done' && 
      t.updatedAt.toDateString() === new Date().toDateString()
    ).length;

    return {
      totalTasks: sessionTasks.length,
      completedToday,
      activeProposals: Array.from(this.proposals.values()).filter(p => p.status === 'pending').length,
      filesProcessed: Array.from(this.files.values()).filter(f => f.sessionId === sessionId).length,
    };
  }
}

export const storage = new MemStorage();
