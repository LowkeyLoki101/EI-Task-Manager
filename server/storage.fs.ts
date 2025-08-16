import fs from "fs";
import path from "path";
import { IStorage, Task, Step, Artifact, Memory, Conversation, DiaryEntry, Installation, Proposal, File, Project, ResearchDoc, CalendarEvent, ProjectFile, BlogPost, CodeRecommendation, RecommendationVote, FileAnalysis, ExportRequest } from "./storage";
import type { InsertTask, InsertStep, InsertArtifact, InsertMemory, InsertConversation, InsertDiaryEntry, InsertInstallation, InsertProposal, InsertFile, InsertProject, InsertResearchDoc, InsertCalendarEvent, InsertProjectFile, InsertBlogPost, InsertCodeRecommendation, InsertRecommendationVote, InsertFileAnalysis, InsertExportRequest, GetTodoListAction } from "@shared/schema";
import { randomUUID } from "crypto";

const ROOT = path.join(process.cwd(), "data", "sessions");
fs.mkdirSync(ROOT, { recursive: true });

// Simple per-session write queue to avoid clobbers in bursts
const queues = new Map<string, Promise<void>>();

function withQueue(key: string, job: () => Promise<void>) {
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.then(job, job);
  queues.set(key, next.catch(() => {}));
  return next;
}

function sessionDir(sessionId: string) {
  const dir = path.join(ROOT, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function taskFile(sessionId: string) {
  return path.join(sessionDir(sessionId), "tasks.json");
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`[FSStorage] Failed to read ${filePath}:`, error);
    return defaultValue;
  }
}

function writeJsonAtomic(filePath: string, data: any) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath); // atomic replace on POSIX
}

export const fsStorage: IStorage = {
  // Sessions
  async createSession(session) {
    const sessionData = {
      id: session.id || randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const dir = sessionDir(sessionData.id);
    const sessionFile = path.join(dir, "session.json");
    writeJsonAtomic(sessionFile, sessionData);
    
    return sessionData;
  },

  async getSession(id) {
    const sessionFile = path.join(sessionDir(id), "session.json");
    const data = readJson(sessionFile, null);
    if (!data) return undefined;
    
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  },

  // Tasks with migration-on-read defaults
  async readTasks(sessionId) {
    const f = taskFile(sessionId);
    const data = readJson(f, { tasks: [] });
    const tasks = data.tasks || data || [];
    
    return tasks.map((t: any) => ({
      id: t.id,
      sessionId: t.sessionId || sessionId,
      title: t.title,
      status: t.status ?? "backlog",
      context: t.context ?? "computer",
      timeWindow: t.timeWindow ?? "any",
      description: t.description || null,
      tags: t.tags || [],
      priority: t.priority ?? "medium",
      category: t.category ?? "general",
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      resources: t.resources || [],
      notes: t.notes || null,
      createdAt: new Date(t.createdAt || Date.now()),
      updatedAt: new Date(t.updatedAt || Date.now()),
      // Add steps inline if they exist
      steps: (t.steps || []).map((s: any) => ({
        id: s.id ?? randomUUID(),
        taskId: t.id,
        title: s.title,
        status: s.status ?? "pending",
        canAuto: !!s.canAuto,
        context: s.context ?? "computer",
        timeWindow: s.timeWindow ?? "any",
        description: s.description || null,
        toolHint: s.toolHint || null,
        parentStepId: s.parentStepId || null,
        createdAt: new Date(s.createdAt || Date.now()),
        updatedAt: new Date(s.updatedAt || Date.now()),
      }))
    }));
  },

  async writeTasks(sessionId, tasks) {
    const f = taskFile(sessionId);
    await withQueue(sessionId, async () => {
      writeJsonAtomic(f, { tasks });
    });
  },

  // Task CRUD operations
  async createTask(insertTask) {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      status: insertTask.status || 'backlog',
      context: insertTask.context || 'computer',
      timeWindow: insertTask.timeWindow || 'any',
      description: insertTask.description || null,
      tags: insertTask.tags || [],
      priority: insertTask.priority || 'medium',
      category: insertTask.category || 'general',
      dueDate: insertTask.dueDate || null,
      resources: insertTask.resources || [],
      notes: insertTask.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tasks = await this.readTasks(insertTask.sessionId);
    tasks.push(task);
    await this.writeTasks(insertTask.sessionId, tasks);
    return task;
  },

  async getTask(id) {
    // We'd need to scan all sessions - for now, this is simplified
    // In practice, you'd maintain an index or pass sessionId
    throw new Error("getTask requires sessionId - use listTasks instead");
  },

  async listTasks(sessionId, filters) {
    let tasks = await this.readTasks(sessionId);

    // Apply context filter
    if (filters?.context) {
      tasks = tasks.filter(task => task.context === filters.context);
    }

    // Sort by priority and creation date
    return tasks.sort((a, b) => {
      // First sort by status priority
      const statusPriority = { doing: 4, today: 3, backlog: 2, done: 1 };
      const aStatus = statusPriority[a.status as keyof typeof statusPriority] || 0;
      const bStatus = statusPriority[b.status as keyof typeof statusPriority] || 0;
      if (aStatus !== bStatus) return bStatus - aStatus;
      
      // Then sort by task priority
      const taskPriority = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = taskPriority[a.priority as keyof typeof taskPriority] || 2;
      const bPriority = taskPriority[b.priority as keyof typeof taskPriority] || 2;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  },

  async updateTask(id, updates) {
    // For now, we need to scan sessions to find the task
    // In a real implementation, you'd maintain an index
    throw new Error("updateTask requires sessionId - implement session-specific updates");
  },

  async deleteTask(id) {
    throw new Error("deleteTask requires sessionId - implement session-specific deletes");
  },

  // Placeholder implementations for other methods
  // These would be implemented similar to tasks with proper file storage
  async createStep(step) { 
    throw new Error("Steps storage not implemented in fsStorage yet");
  },
  async getStep(id) { return undefined; },
  async listSteps(taskId) { return []; },
  async updateStep(id, updates) { 
    throw new Error("Steps storage not implemented in fsStorage yet");
  },
  async deleteStep(id) {},

  async createArtifact(artifact) {
    throw new Error("Artifacts storage not implemented in fsStorage yet");
  },
  async listArtifacts(stepId) { return []; },

  async setMemory(memory) {
    throw new Error("Memory storage not implemented in fsStorage yet");
  },
  async getMemory(sessionId, domain, key) { return undefined; },
  async listMemories(sessionId, domain) { return []; },

  async createMessage(message) {
    throw new Error("Messages storage not implemented in fsStorage yet");
  },
  async listMessages(sessionId, limit) { return []; },

  async createDiaryEntry(entry) {
    throw new Error("Diary storage not implemented in fsStorage yet");
  },
  async listDiaryEntries(sessionId, limit) { return []; },

  async createBlogPost(post) {
    throw new Error("Blog storage not implemented in fsStorage yet");
  },
  async getBlogPost(id) { return undefined; },
  async getBlogPostBySlug(slug) { return undefined; },
  async listBlogPosts(status, limit, offset) { return []; },
  async listBlogPostsBySession(sessionId, status) { return []; },
  async updateBlogPost(id, updates) { return undefined; },
  async deleteBlogPost(id) { return false; },

  async createInstallation(installation) {
    throw new Error("Installation storage not implemented in fsStorage yet");
  },
  async listInstallations(sessionId) { return []; },
  async updateInstallation(id, updates) {
    throw new Error("Installation storage not implemented in fsStorage yet");
  },

  // Legacy compatibility stubs
  async createProposal(proposal) {
    throw new Error("Proposal storage not implemented in fsStorage yet");
  },
  async listProposals(sessionId) { return []; },
  async updateProposal(id, updates) {
    throw new Error("Proposal storage not implemented in fsStorage yet");
  },
  async deleteProposal(id) {},

  async createFile(file) {
    throw new Error("File storage not implemented in fsStorage yet");
  },
  async listFiles(sessionId) { return []; },
  async deleteFile(id) {},

  async createProject(project) {
    throw new Error("Project storage not implemented in fsStorage yet");
  },
  async getProject(id) { return undefined; },
  async listProjects(sessionId, filters) { return []; },
  async updateProject(id, updates) {
    throw new Error("Project storage not implemented in fsStorage yet");
  },
  async deleteProject(id) {},

  async createResearchDoc(doc) {
    throw new Error("Research doc storage not implemented in fsStorage yet");
  },
  async getResearchDoc(id) { return undefined; },
  async listResearchDocs(sessionId, projectId) { return []; },
  async updateResearchDoc(id, updates) {
    throw new Error("Research doc storage not implemented in fsStorage yet");
  },
  async deleteResearchDoc(id) {},

  async createCalendarEvent(event) {
    throw new Error("Calendar event storage not implemented in fsStorage yet");
  },
  async getCalendarEvent(id) { return undefined; },
  async listCalendarEvents(sessionId, filters) { return []; },
  async updateCalendarEvent(id, updates) {
    throw new Error("Calendar event storage not implemented in fsStorage yet");
  },
  async deleteCalendarEvent(id) {},

  async createProjectFile(file) {
    throw new Error("Project file storage not implemented in fsStorage yet");
  },
  async getProjectFile(id) { return undefined; },
  async listProjectFiles(sessionId, projectId) { return []; },
  async deleteProjectFile(id) {},

  async createCodeRecommendation(recommendation) {
    throw new Error("Code recommendation storage not implemented in fsStorage yet");
  },
  async getCodeRecommendation(id) { return undefined; },
  async listCodeRecommendations(sessionId, filters) { return []; },
  async updateCodeRecommendation(id, updates) {
    throw new Error("Code recommendation storage not implemented in fsStorage yet");
  },
  async deleteCodeRecommendation(id) {},

  async createRecommendationVote(vote) {
    throw new Error("Recommendation vote storage not implemented in fsStorage yet");
  },
  async listRecommendationVotes(recommendationId) { return []; },
  async getUserVoteForRecommendation(recommendationId, sessionId) { return undefined; },

  async createFileAnalysis(analysis) {
    throw new Error("File analysis storage not implemented in fsStorage yet");
  },
  async getFileAnalysis(id) { return undefined; },
  async listFileAnalysis(sessionId, filePath) { return []; },
  async updateFileAnalysis(id, updates) {
    throw new Error("File analysis storage not implemented in fsStorage yet");
  },

  async createExportRequest(request) {
    throw new Error("Export request storage not implemented in fsStorage yet");
  },
  async getExportRequest(id) { return undefined; },
  async listExportRequests(sessionId) { return []; },
  async updateExportRequest(id, updates) {
    throw new Error("Export request storage not implemented in fsStorage yet");
  },

  async getSystemStats(sessionId) {
    // Return basic stats based on what we can compute
    const tasks = await this.readTasks(sessionId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      totalTasks: tasks.length,
      completedToday: tasks.filter(t => 
        t.status === 'done' && t.updatedAt >= today
      ).length,
      activeProposal: null,
      totalProjects: 0,
      activeProjects: 0,
      totalResearchDocs: 0,
      upcomingEvents: 0,
      totalRecommendations: 0,
      pendingRecommendations: 0,
      approvedRecommendations: 0,
    };
  },
};