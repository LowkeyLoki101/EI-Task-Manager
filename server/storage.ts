import { randomUUID } from "crypto";
import type { 
  Session, Task, Step, Artifact, Memory, Conversation, Installation,
  Proposal, File, InsertSession, InsertTask, InsertStep, InsertArtifact, 
  InsertMemory, InsertConversation, InsertInstallation, InsertProposal, 
  InsertFile, GetTodoListAction, AddTaskAction, UpdateStepStatusAction
} from "@shared/schema";

// Updated storage interface based on memory anchors architecture
export interface IStorage {
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;

  // Tasks (Memory Anchors Architecture)
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  listTasks(sessionId: string, filters?: GetTodoListAction): Promise<Task[]>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Steps
  createStep(step: InsertStep): Promise<Step>;
  getStep(id: string): Promise<Step | undefined>;
  listSteps(taskId: string): Promise<Step[]>;
  updateStep(id: string, updates: Partial<InsertStep>): Promise<Step>;
  deleteStep(id: string): Promise<void>;

  // Artifacts
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  listArtifacts(stepId: string): Promise<Artifact[]>;

  // Memory (Domain-specific key-value store)
  setMemory(memory: InsertMemory): Promise<Memory>;
  getMemory(sessionId: string, domain: string, key: string): Promise<Memory | undefined>;
  listMemories(sessionId: string, domain?: string): Promise<Memory[]>;

  // Conversations
  createMessage(message: InsertConversation): Promise<Conversation>;
  listMessages(sessionId: string, limit?: number): Promise<Conversation[]>;

  // Installations
  createInstallation(installation: InsertInstallation): Promise<Installation>;
  listInstallations(sessionId: string): Promise<Installation[]>;
  updateInstallation(id: string, updates: Partial<InsertInstallation>): Promise<Installation>;

  // Legacy (backward compatibility)
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  listProposals(sessionId?: string): Promise<Proposal[]>;
  updateProposal(id: string, updates: Partial<InsertProposal>): Promise<Proposal>;
  deleteProposal(id: string): Promise<void>;

  createFile(file: InsertFile): Promise<File>;
  listFiles(sessionId: string): Promise<File[]>;
  deleteFile(id: string): Promise<void>;

  // Stats for dashboard
  getSystemStats(sessionId: string): Promise<{
    totalTasks: number;
    completedToday: number;
    activeProposal: string | null;
  }>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;
  private tasks: Map<string, Task>;
  private steps: Map<string, Step>;
  private artifacts: Map<string, Artifact>;
  private memories: Map<string, Memory>;
  private conversations: Map<string, Conversation>;
  private installations: Map<string, Installation>;
  private proposals: Map<string, Proposal>;
  private files: Map<string, File>;

  constructor() {
    this.sessions = new Map();
    this.tasks = new Map();
    this.steps = new Map();
    this.artifacts = new Map();
    this.memories = new Map();
    this.conversations = new Map();
    this.installations = new Map();
    this.proposals = new Map();
    this.files = new Map();
  }

  // Sessions
  async createSession(insertSession: InsertSession): Promise<Session> {
    const session: Session = {
      ...insertSession,
      id: insertSession.id || randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  // Tasks (Memory Anchors Architecture)
  async createTask(insertTask: InsertTask): Promise<Task> {
    const task: Task = {
      ...insertTask,
      id: insertTask.id || randomUUID(),
      status: insertTask.status || 'backlog',
      context: insertTask.context || 'computer',
      timeWindow: insertTask.timeWindow || 'any',
      description: insertTask.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async listTasks(sessionId: string, filters?: GetTodoListAction): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values())
      .filter(task => task.sessionId === sessionId);

    // Apply context filter
    if (filters?.context) {
      tasks = tasks.filter(task => task.context === filters.context);
    }

    // Sort by priority and creation date
    return tasks.sort((a, b) => {
      // Prioritize "today" and "doing" status
      const statusPriority = { doing: 4, today: 3, backlog: 2, done: 1 };
      const aP = statusPriority[a.status] || 0;
      const bP = statusPriority[b.status] || 0;
      if (aP !== bP) return bP - aP;
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
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
    // Also delete related steps
    Array.from(this.steps.values())
      .filter(step => step.taskId === id)
      .forEach(step => this.steps.delete(step.id));
  }

  // Steps
  async createStep(insertStep: InsertStep): Promise<Step> {
    const step: Step = {
      ...insertStep,
      id: insertStep.id || randomUUID(),
      status: insertStep.status || 'pending',
      canAuto: insertStep.canAuto || false,
      context: insertStep.context || 'computer',
      timeWindow: insertStep.timeWindow || 'any',
      description: insertStep.description || null,
      toolHint: insertStep.toolHint || null,
      parentStepId: insertStep.parentStepId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.steps.set(step.id, step);
    return step;
  }

  async getStep(id: string): Promise<Step | undefined> {
    return this.steps.get(id);
  }

  async listSteps(taskId: string): Promise<Step[]> {
    return Array.from(this.steps.values())
      .filter(step => step.taskId === taskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateStep(id: string, updates: Partial<InsertStep>): Promise<Step> {
    const existing = this.steps.get(id);
    if (!existing) {
      throw new Error("Step not found");
    }
    
    const updated: Step = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.steps.set(id, updated);
    return updated;
  }

  async deleteStep(id: string): Promise<void> {
    this.steps.delete(id);
    // Also delete related artifacts
    Array.from(this.artifacts.values())
      .filter(artifact => artifact.stepId === id)
      .forEach(artifact => this.artifacts.delete(artifact.id));
  }

  // Artifacts
  async createArtifact(insertArtifact: InsertArtifact): Promise<Artifact> {
    const artifact: Artifact = {
      ...insertArtifact,
      id: insertArtifact.id || randomUUID(),
      metadata: insertArtifact.metadata || {},
      createdAt: new Date(),
    };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  async listArtifacts(stepId: string): Promise<Artifact[]> {
    return Array.from(this.artifacts.values())
      .filter(artifact => artifact.stepId === stepId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Memory (Domain-specific key-value store)
  async setMemory(insertMemory: InsertMemory): Promise<Memory> {
    const memory: Memory = {
      ...insertMemory,
      id: insertMemory.id || randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Use composite key for efficient lookups
    const compositeKey = `${memory.sessionId}:${memory.domain}:${memory.key}`;
    
    // Remove existing memory with same domain/key
    Array.from(this.memories.values())
      .filter(m => m.sessionId === memory.sessionId && m.domain === memory.domain && m.key === memory.key)
      .forEach(m => this.memories.delete(m.id));
    
    this.memories.set(memory.id, memory);
    return memory;
  }

  async getMemory(sessionId: string, domain: string, key: string): Promise<Memory | undefined> {
    return Array.from(this.memories.values())
      .find(m => m.sessionId === sessionId && m.domain === domain && m.key === key);
  }

  async listMemories(sessionId: string, domain?: string): Promise<Memory[]> {
    let memories = Array.from(this.memories.values())
      .filter(memory => memory.sessionId === sessionId);

    if (domain) {
      memories = memories.filter(memory => memory.domain === domain);
    }

    return memories.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Conversations
  async createMessage(insertMessage: InsertConversation): Promise<Conversation> {
    const message: Conversation = {
      ...insertMessage,
      id: randomUUID(),
      taskId: insertMessage.taskId || null,
      transcript: insertMessage.transcript || null,
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

  // Installations
  async createInstallation(insertInstallation: InsertInstallation): Promise<Installation> {
    const installation: Installation = {
      ...insertInstallation,
      id: insertInstallation.id || randomUUID(),
      domain: insertInstallation.domain || null,
      apiKeys: insertInstallation.apiKeys || {},
      config: insertInstallation.config || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.installations.set(installation.id, installation);
    return installation;
  }

  async listInstallations(sessionId: string): Promise<Installation[]> {
    return Array.from(this.installations.values())
      .filter(installation => installation.sessionId === sessionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateInstallation(id: string, updates: Partial<InsertInstallation>): Promise<Installation> {
    const existing = this.installations.get(id);
    if (!existing) {
      throw new Error("Installation not found");
    }
    
    const updated: Installation = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.installations.set(id, updated);
    return updated;
  }

  // Legacy (backward compatibility)
  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const proposal: Proposal = {
      ...insertProposal,
      id: insertProposal.id || randomUUID(),
      diffSummary: insertProposal.diffSummary || null,
      previewUrl: insertProposal.previewUrl || null,
      status: insertProposal.status || 'pending',
      createdAt: new Date(),
    };
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  async listProposals(sessionId?: string): Promise<Proposal[]> {
    let proposals = Array.from(this.proposals.values());
    if (sessionId) {
      proposals = proposals.filter(p => p.sessionId === sessionId);
    }
    return proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
      id: insertFile.id || randomUUID(),
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

  // Stats for dashboard
  async getSystemStats(sessionId: string): Promise<{
    totalTasks: number;
    completedToday: number;
    activeProposal: string | null;
  }> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.sessionId === sessionId);
    const proposals = Array.from(this.proposals.values()).filter(p => p.sessionId === sessionId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      totalTasks: tasks.length,
      completedToday: tasks.filter(t => 
        t.status === 'done' && 
        t.updatedAt >= today
      ).length,
      activeProposal: proposals.find(p => p.status === 'pending')?.id || null,
    };
  }
}

export const storage = new MemStorage();