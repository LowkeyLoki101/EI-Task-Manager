import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, existsSync } from "fs";
import type { 
  Session, Task, Step, Artifact, Memory, Conversation, Installation,
  Proposal, File, Project, ResearchDoc, CalendarEvent, ProjectFile,
  InsertSession, InsertTask, InsertStep, InsertArtifact, 
  InsertMemory, InsertConversation, InsertInstallation, InsertProposal, 
  InsertFile, InsertProject, InsertResearchDoc, InsertCalendarEvent, InsertProjectFile,
  GetTodoListAction, AddTaskAction, UpdateStepStatusAction
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

  // **PROJECT MANAGEMENT**
  
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  listProjects(sessionId: string, filters?: { status?: string; priority?: string }): Promise<Project[]>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Research Documents
  createResearchDoc(doc: InsertResearchDoc): Promise<ResearchDoc>;
  getResearchDoc(id: string): Promise<ResearchDoc | undefined>;
  listResearchDocs(sessionId: string, projectId?: string): Promise<ResearchDoc[]>;
  updateResearchDoc(id: string, updates: Partial<InsertResearchDoc>): Promise<ResearchDoc>;
  deleteResearchDoc(id: string): Promise<void>;

  // Calendar Events
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  listCalendarEvents(sessionId: string, filters?: { 
    projectId?: string; 
    taskId?: string; 
    startDate?: Date; 
    endDate?: Date; 
  }): Promise<CalendarEvent[]>;
  updateCalendarEvent(id: string, updates: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string): Promise<void>;

  // Project Files
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  getProjectFile(id: string): Promise<ProjectFile | undefined>;
  listProjectFiles(sessionId: string, projectId?: string): Promise<ProjectFile[]>;
  deleteProjectFile(id: string): Promise<void>;

  // Stats for dashboard
  getSystemStats(sessionId: string): Promise<{
    totalTasks: number;
    completedToday: number;
    activeProposal: string | null;
    totalProjects: number;
    activeProjects: number;
    totalResearchDocs: number;
    upcomingEvents: number;
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
  // New project management storage
  private projects: Map<string, Project>;
  private researchDocs: Map<string, ResearchDoc>;
  private calendarEvents: Map<string, CalendarEvent>;
  private projectFiles: Map<string, ProjectFile>;

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
    // Initialize new project management storage
    this.projects = new Map();
    this.researchDocs = new Map();
    this.calendarEvents = new Map();
    this.projectFiles = new Map();
    
    // Load persisted data on startup
    this.loadFromFile();
  }

  private saveToFile() {
    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        tasks: Array.from(this.tasks.entries()),
        steps: Array.from(this.steps.entries()),
        artifacts: Array.from(this.artifacts.entries()),
        memories: Array.from(this.memories.entries()),
        conversations: Array.from(this.conversations.entries()),
        installations: Array.from(this.installations.entries()),
        proposals: Array.from(this.proposals.entries()),
        files: Array.from(this.files.entries()),
        projects: Array.from(this.projects.entries()),
        researchDocs: Array.from(this.researchDocs.entries()),
        calendarEvents: Array.from(this.calendarEvents.entries()),
        projectFiles: Array.from(this.projectFiles.entries()),
      };
      writeFileSync('data/storage.json', JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('[Storage] Failed to save to file:', error);
    }
  }

  private loadFromFile() {
    try {
      if (existsSync('data/storage.json')) {
        const data = JSON.parse(readFileSync('data/storage.json', 'utf8'));
        
        // Restore Maps from arrays, converting date strings back to Date objects
        this.sessions = new Map(data.sessions?.map(([k, v]: [string, any]) => [k, {
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }]) || []);
        
        this.tasks = new Map(data.tasks?.map(([k, v]: [string, any]) => [k, {
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }]) || []);
        
        this.steps = new Map(data.steps?.map(([k, v]: [string, any]) => [k, {
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }]) || []);
        
        this.artifacts = new Map(data.artifacts?.map(([k, v]: [string, any]) => [k, {
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }]) || []);
        
        this.memories = new Map(data.memories || []);
        this.conversations = new Map(data.conversations?.map(([k, v]: [string, any]) => [k, {
          ...v,
          timestamp: new Date(v.timestamp)
        }]) || []);
        this.installations = new Map(data.installations || []);
        this.proposals = new Map(data.proposals || []);
        this.files = new Map(data.files || []);
        this.projects = new Map(data.projects?.map(([k, v]: [string, any]) => [k, {
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }]) || []);
        this.researchDocs = new Map(data.researchDocs || []);
        this.calendarEvents = new Map(data.calendarEvents || []);
        this.projectFiles = new Map(data.projectFiles || []);
        
        console.log('[Storage] Loaded persisted data: tasks=', this.tasks.size, 'steps=', this.steps.size);
      }
    } catch (error) {
      console.warn('[Storage] Failed to load from file:', error);
    }
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
    this.saveToFile();
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
    this.saveToFile();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.delete(id);
    // Also delete related steps
    Array.from(this.steps.values())
      .filter(step => step.taskId === id)
      .forEach(step => this.steps.delete(step.id));
    this.saveToFile();
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
    this.saveToFile();
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
    this.saveToFile();
    return updated;
  }

  async deleteStep(id: string): Promise<void> {
    this.steps.delete(id);
    // Also delete related artifacts
    Array.from(this.artifacts.values())
      .filter(artifact => artifact.stepId === id)
      .forEach(artifact => this.artifacts.delete(artifact.id));
    this.saveToFile();
  }

  // Artifacts
  async createArtifact(insertArtifact: InsertArtifact): Promise<Artifact> {
    const artifact: Artifact = {
      ...insertArtifact,
      id: insertArtifact.id || randomUUID(),
      stepId: insertArtifact.stepId || null,
      projectId: insertArtifact.projectId || null,
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

  // Project management implementations need to be added before getSystemStats
  // **PROJECT MANAGEMENT IMPLEMENTATIONS**

  // Projects
  async createProject(insertProject: InsertProject): Promise<Project> {
    const project: Project = {
      ...insertProject,
      id: insertProject.id || randomUUID(),
      tags: insertProject.tags || [],
      metadata: insertProject.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async listProjects(sessionId: string, filters?: { status?: string; priority?: string }): Promise<Project[]> {
    let projects = Array.from(this.projects.values())
      .filter(project => project.sessionId === sessionId);

    if (filters?.status) {
      projects = projects.filter(p => p.status === filters.status);
    }
    if (filters?.priority) {
      projects = projects.filter(p => p.priority === filters.priority);
    }

    return projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) {
      throw new Error("Project not found");
    }
    
    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
    // Also delete related research docs and project files
    Array.from(this.researchDocs.values())
      .filter(doc => doc.projectId === id)
      .forEach(doc => this.researchDocs.delete(doc.id));
    Array.from(this.projectFiles.values())
      .filter(file => file.projectId === id)
      .forEach(file => this.projectFiles.delete(file.id));
  }

  // Research Documents
  async createResearchDoc(insertDoc: InsertResearchDoc): Promise<ResearchDoc> {
    const doc: ResearchDoc = {
      ...insertDoc,
      id: insertDoc.id || randomUUID(),
      sources: insertDoc.sources || [],
      tags: insertDoc.tags || [],
      metadata: insertDoc.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.researchDocs.set(doc.id, doc);
    return doc;
  }

  async getResearchDoc(id: string): Promise<ResearchDoc | undefined> {
    return this.researchDocs.get(id);
  }

  async listResearchDocs(sessionId: string, projectId?: string): Promise<ResearchDoc[]> {
    let docs = Array.from(this.researchDocs.values())
      .filter(doc => doc.sessionId === sessionId);

    if (projectId) {
      docs = docs.filter(doc => doc.projectId === projectId);
    }

    return docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateResearchDoc(id: string, updates: Partial<InsertResearchDoc>): Promise<ResearchDoc> {
    const existing = this.researchDocs.get(id);
    if (!existing) {
      throw new Error("Research document not found");
    }
    
    const updated: ResearchDoc = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.researchDocs.set(id, updated);
    return updated;
  }

  async deleteResearchDoc(id: string): Promise<void> {
    this.researchDocs.delete(id);
  }

  // Calendar Events
  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      ...insertEvent,
      id: insertEvent.id || randomUUID(),
      attendees: insertEvent.attendees || [],
      reminders: insertEvent.reminders || [],
      metadata: insertEvent.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.calendarEvents.set(event.id, event);
    return event;
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }

  async listCalendarEvents(sessionId: string, filters?: { 
    projectId?: string; 
    taskId?: string; 
    startDate?: Date; 
    endDate?: Date; 
  }): Promise<CalendarEvent[]> {
    let events = Array.from(this.calendarEvents.values())
      .filter(event => event.sessionId === sessionId);

    if (filters?.projectId) {
      events = events.filter(e => e.projectId === filters.projectId);
    }
    if (filters?.taskId) {
      events = events.filter(e => e.taskId === filters.taskId);
    }
    if (filters?.startDate) {
      events = events.filter(e => e.startTime >= filters.startDate!);
    }
    if (filters?.endDate) {
      events = events.filter(e => e.endTime <= filters.endDate!);
    }

    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async updateCalendarEvent(id: string, updates: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const existing = this.calendarEvents.get(id);
    if (!existing) {
      throw new Error("Calendar event not found");
    }
    
    const updated: CalendarEvent = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.calendarEvents.set(id, updated);
    return updated;
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    this.calendarEvents.delete(id);
  }

  // Project Files
  async createProjectFile(insertFile: InsertProjectFile): Promise<ProjectFile> {
    const file: ProjectFile = {
      ...insertFile,
      id: insertFile.id || randomUUID(),
      tags: insertFile.tags || [],
      metadata: insertFile.metadata || {},
      createdAt: new Date(),
    };
    this.projectFiles.set(file.id, file);
    return file;
  }

  async getProjectFile(id: string): Promise<ProjectFile | undefined> {
    return this.projectFiles.get(id);
  }

  async listProjectFiles(sessionId: string, projectId?: string): Promise<ProjectFile[]> {
    let files = Array.from(this.projectFiles.values())
      .filter(file => file.sessionId === sessionId);

    if (projectId) {
      files = files.filter(file => file.projectId === projectId);
    }

    return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteProjectFile(id: string): Promise<void> {
    this.projectFiles.delete(id);
  }

  // Enhanced stats with project management
  async getSystemStats(sessionId: string): Promise<{
    totalTasks: number;
    completedToday: number;
    activeProposal: string | null;
    totalProjects: number;
    activeProjects: number;
    totalResearchDocs: number;
    upcomingEvents: number;
  }> {
    const tasks = Array.from(this.tasks.values()).filter(t => t.sessionId === sessionId);
    const proposals = Array.from(this.proposals.values()).filter(p => p.sessionId === sessionId);
    const projects = Array.from(this.projects.values()).filter(p => p.sessionId === sessionId);
    const researchDocs = Array.from(this.researchDocs.values()).filter(d => d.sessionId === sessionId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const upcomingEvents = Array.from(this.calendarEvents.values())
      .filter(e => e.sessionId === sessionId && e.startTime >= today && e.startTime <= tomorrow);
    
    return {
      totalTasks: tasks.length,
      completedToday: tasks.filter(t => 
        t.status === 'done' && 
        t.updatedAt >= today
      ).length,
      activeProposal: proposals.find(p => p.status === 'pending')?.id || null,
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      totalResearchDocs: researchDocs.length,
      upcomingEvents: upcomingEvents.length,
    };
  }
}

export const storage = new MemStorage();

// Add conversation transcript storage methods
interface IConversationStorage {
  saveTranscript(transcript: any): Promise<any>;
  getTranscripts(sessionId?: string, agentId?: string): Promise<any[]>;
  searchTranscripts(query: string): Promise<any[]>;
}

class ConversationStorage implements IConversationStorage {
  private transcripts: Map<string, any[]> = new Map();

  async saveTranscript(transcript: any): Promise<any> {
    const id = `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestampedTranscript = {
      id,
      ...transcript,
      timestamp: new Date().toISOString()
    };
    
    const sessionKey = transcript.sessionId || 'default';
    const existing = this.transcripts.get(sessionKey) || [];
    existing.push(timestampedTranscript);
    this.transcripts.set(sessionKey, existing);
    
    console.log(`[Transcript] Saved: ${transcript.role} - ${transcript.content?.slice(0, 50)}...`);
    return timestampedTranscript;
  }

  async getTranscripts(sessionId?: string, agentId?: string): Promise<any[]> {
    if (sessionId) {
      return this.transcripts.get(sessionId) || [];
    }
    
    // Return all transcripts, optionally filtered by agentId
    const allTranscripts = Array.from(this.transcripts.values()).flat();
    if (agentId) {
      return allTranscripts.filter(t => t.agentId === agentId);
    }
    return allTranscripts;
  }

  async searchTranscripts(query: string): Promise<any[]> {
    const allTranscripts = Array.from(this.transcripts.values()).flat();
    return allTranscripts.filter(t => 
      t.content?.toLowerCase().includes(query.toLowerCase()) ||
      t.transcript?.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export const conversationStorage = new ConversationStorage();