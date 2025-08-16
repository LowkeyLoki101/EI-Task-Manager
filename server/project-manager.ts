import { storage } from './storage';
import type { Project, ProjectNote, ResearchFootprint, EnhancedTask } from '../shared/project-schema';

export class ProjectManager {
  // Create a new project with smart task organization
  async createProject(data: Partial<Project>): Promise<Project> {
    const project: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name || 'New Project',
      description: data.description,
      status: data.status || 'active',
      priority: data.priority || 'medium',
      tags: data.tags || [],
      sessionId: data.sessionId!,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: data.metadata
    };

    // Store project
    if (!(global as any).projects) {
      (global as any).projects = new Map();
    }
    (global as any).projects.set(project.id, project);

    console.log(`[ProjectManager] Created project: ${project.name}`);
    return project;
  }

  // Get all projects for a session
  async getProjects(sessionId: string): Promise<Project[]> {
    if (!(global as any).projects) {
      return [];
    }
    
    return Array.from((global as any).projects.values())
      .filter((project: Project) => project.sessionId === sessionId)
      .sort((a: Project, b: Project) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Auto-organize tasks into projects based on content analysis
  async organizeTasksIntoProjects(sessionId: string): Promise<void> {
    const tasks = await storage.getTasks(sessionId);
    const projects = await this.getProjects(sessionId);

    // Create default projects if none exist
    if (projects.length === 0) {
      await this.createProject({
        name: 'SkyClaim Operations',
        description: 'Drone inspection and insurance claim processing',
        tags: ['skyclaim', 'drones', 'insurance'],
        sessionId,
        priority: 'high'
      });

      await this.createProject({
        name: 'Starlight Solar Growth',
        description: 'Solar installation business development',
        tags: ['solar', 'starlight', 'renewable-energy'],
        sessionId,
        priority: 'high'
      });

      await this.createProject({
        name: 'Emergent Intelligence Development',
        description: 'AI platform and tools development',
        tags: ['ai', 'emergent-intelligence', 'development'],
        sessionId,
        priority: 'medium'
      });

      await this.createProject({
        name: 'General Tasks',
        description: 'Uncategorized tasks and quick actions',
        tags: ['general', 'miscellaneous'],
        sessionId,
        priority: 'low'
      });
    }

    // Auto-categorize tasks into projects
    for (const task of tasks.filter(t => !t.projectId)) {
      const projectId = this.categorizeTaskToProject(task, projects);
      if (projectId) {
        // Update task with project association
        await storage.updateTaskProject(task.id, projectId);
      }
    }
  }

  // Smart task categorization based on content
  private categorizeTaskToProject(task: any, projects: Project[]): string | null {
    const title = task.title.toLowerCase();
    const description = (task.description || '').toLowerCase();
    const tags = task.tags || [];

    // SkyClaim project keywords
    if (title.includes('drone') || title.includes('roof') || title.includes('inspection') || 
        title.includes('insurance') || title.includes('claim') || tags.includes('skyclaim')) {
      return projects.find(p => p.name.includes('SkyClaim'))?.id || null;
    }

    // Solar project keywords  
    if (title.includes('solar') || title.includes('energy') || title.includes('installation') ||
        title.includes('renewable') || tags.includes('solar')) {
      return projects.find(p => p.name.includes('Solar'))?.id || null;
    }

    // AI/Tech project keywords
    if (title.includes('ai') || title.includes('automation') || title.includes('development') ||
        title.includes('integration') || tags.includes('ai-generated')) {
      return projects.find(p => p.name.includes('Intelligence'))?.id || null;
    }

    // Default to General project
    return projects.find(p => p.name.includes('General'))?.id || null;
  }

  // Complete a task with comprehensive logging
  async completeTask(taskId: string, completionData: {
    completionNotes?: string;
    researchFootprints?: string[];
    completedAt: Date;
  }): Promise<any> {
    try {
      // Update task status
      const updatedTask = await storage.updateTaskStatus(taskId, 'completed');
      
      if (updatedTask) {
        // Add completion metadata
        updatedTask.completionNotes = completionData.completionNotes;
        updatedTask.completedAt = completionData.completedAt;
        updatedTask.researchFootprints = completionData.researchFootprints;

        console.log(`[ProjectManager] Task completed: ${updatedTask.title}`);
        return updatedTask;
      }

      return null;
    } catch (error) {
      console.error('[ProjectManager] Error completing task:', error);
      throw error;
    }
  }

  // Add user notes for AI collaboration
  async addUserNote(projectId: string, sessionId: string, content: string): Promise<ProjectNote> {
    const note: ProjectNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      sessionId,
      content,
      type: 'user-note',
      tags: ['collaboration', 'user-input'],
      createdAt: new Date(),
      metadata: { source: 'user-interface' }
    };

    // Store note
    if (!(global as any).projectNotes) {
      (global as any).projectNotes = new Map();
    }
    (global as any).projectNotes.set(note.id, note);

    console.log(`[ProjectManager] User note added to project ${projectId}`);
    return note;
  }

  // Get project notes for collaboration view
  async getProjectNotes(projectId: string): Promise<ProjectNote[]> {
    if (!(global as any).projectNotes) {
      return [];
    }

    return Array.from((global as any).projectNotes.values())
      .filter((note: ProjectNote) => note.projectId === projectId)
      .sort((a: ProjectNote, b: ProjectNote) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Store research footprint with project association
  async storeResearchFootprint(data: Partial<ResearchFootprint>): Promise<ResearchFootprint> {
    const footprint: ResearchFootprint = {
      id: `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: data.sessionId!,
      projectId: data.projectId,
      query: data.query!,
      searchUrls: data.searchUrls || [],
      summary: data.summary!,
      insights: data.insights || [],
      results: data.results || [],
      timestamp: new Date(),
      aiThinking: data.aiThinking!,
      status: data.status || 'completed',
      userNotes: data.userNotes || []
    };

    // Store footprint
    if (!(global as any).researchFootprints) {
      (global as any).researchFootprints = new Map();
    }
    (global as any).researchFootprints.set(footprint.id, footprint);

    console.log(`[ProjectManager] Research footprint stored: ${footprint.query}`);
    return footprint;
  }
}

export const projectManager = new ProjectManager();