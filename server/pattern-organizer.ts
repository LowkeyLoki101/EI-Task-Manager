import { storage } from './storage';
import type { Project, EnhancedTask } from '../shared/project-schema';

interface OrganizingPattern {
  id: string;
  name: string;
  themes: string[];
  signature: string;
  projectIds: string[];
  complexityThreshold: number;
  autoMergeEnabled: boolean;
}

interface FractalProjectNode {
  project: Project;
  children: FractalProjectNode[];
  parent?: FractalProjectNode;
  depth: number;
}

export class PatternOrganizer {
  private detectedPatterns: Map<string, OrganizingPattern> = new Map();
  private projectHierarchy: Map<string, FractalProjectNode> = new Map();

  // Analyze tasks and projects to detect larger organizing patterns
  async analyzeOrganizingPatterns(sessionId: string): Promise<OrganizingPattern[]> {
    const tasks = (await import('./storage')).storage.tasks.filter((task: any) => task.sessionId === sessionId);
    const projects = await this.getProjects(sessionId);
    
    console.log(`[PatternOrganizer] Analyzing ${tasks.length} tasks across ${projects.length} projects`);

    // Detect business domain patterns
    const businessPatterns = this.detectBusinessDomains(tasks, projects);
    
    // Detect workflow patterns  
    const workflowPatterns = this.detectWorkflowPatterns(tasks);
    
    // Detect technology patterns
    const technologyPatterns = this.detectTechnologyPatterns(tasks);
    
    // Detect temporal patterns
    const temporalPatterns = this.detectTemporalPatterns(tasks);

    const allPatterns = [...businessPatterns, ...workflowPatterns, ...technologyPatterns, ...temporalPatterns];
    
    // Store detected patterns
    allPatterns.forEach(pattern => {
      this.detectedPatterns.set(pattern.id, pattern);
    });

    console.log(`[PatternOrganizer] Detected ${allPatterns.length} organizing patterns`);
    return allPatterns;
  }

  // Auto-organize projects into fractal hierarchy
  async autoOrganizeProjects(sessionId: string): Promise<FractalProjectNode[]> {
    const patterns = await this.analyzeOrganizingPatterns(sessionId);
    const projects = await this.getProjects(sessionId);
    
    // Build initial hierarchy
    const hierarchy = this.buildProjectHierarchy(projects, patterns);
    
    // Apply fractal scaling rules
    await this.applyFractalScaling(hierarchy, sessionId);
    
    // Clean house - remove empty or redundant projects
    await this.cleanHouse(hierarchy, sessionId);
    
    console.log(`[PatternOrganizer] Auto-organized into ${hierarchy.length} top-level project clusters`);
    return hierarchy;
  }

  // Detect business domain patterns (SkyClaim, Starlight Solar, etc.)
  private detectBusinessDomains(tasks: any[], projects: Project[]): OrganizingPattern[] {
    const patterns: OrganizingPattern[] = [];
    
    // Group by business keywords
    const businessKeywords = {
      'drone-inspections': ['drone', 'roof', 'inspection', 'aerial', 'survey', 'skyclaim'],
      'solar-energy': ['solar', 'panel', 'renewable', 'energy', 'installation', 'starlight'],
      'ai-development': ['ai', 'artificial', 'intelligence', 'automation', 'emergent'],
      'customer-operations': ['customer', 'service', 'support', 'billing', 'communication'],
      'business-growth': ['marketing', 'sales', 'expansion', 'revenue', 'partnership']
    };

    Object.entries(businessKeywords).forEach(([domain, keywords]) => {
      const relevantTasks = tasks.filter((task: any) => 
        keywords.some(keyword => 
          task.title.toLowerCase().includes(keyword) || 
          task.tags?.some((tag: string) => tag.toLowerCase().includes(keyword))
        )
      );

      if (relevantTasks.length > 3) { // Threshold for pattern recognition
        patterns.push({
          id: `business_${domain}`,
          name: this.formatDomainName(domain),
          themes: keywords,
          signature: `business-domain:${domain}`,
          projectIds: [],
          complexityThreshold: 50,
          autoMergeEnabled: true
        });
      }
    });

    return patterns;
  }

  // Detect workflow patterns (research → analysis → implementation)
  private detectWorkflowPatterns(tasks: any[]): OrganizingPattern[] {
    const patterns: OrganizingPattern[] = [];
    
    const workflowStages = {
      'research-workflow': ['research', 'analyze', 'study', 'investigate', 'explore'],
      'development-workflow': ['implement', 'develop', 'build', 'create', 'design'],
      'optimization-workflow': ['optimize', 'improve', 'enhance', 'refine', 'streamline'],
      'deployment-workflow': ['deploy', 'launch', 'rollout', 'publish', 'release']
    };

    Object.entries(workflowStages).forEach(([workflow, keywords]) => {
      const workflowTasks = tasks.filter(task =>
        keywords.some(keyword => task.title.toLowerCase().includes(keyword))
      );

      if (workflowTasks.length > 5) {
        patterns.push({
          id: `workflow_${workflow}`,
          name: this.formatDomainName(workflow),
          themes: keywords,
          signature: `workflow:${workflow}`,
          projectIds: [],
          complexityThreshold: 25,
          autoMergeEnabled: true
        });
      }
    });

    return patterns;
  }

  // Detect technology patterns
  private detectTechnologyPatterns(tasks: any[]): OrganizingPattern[] {
    const patterns: OrganizingPattern[] = [];
    
    const techStacks = {
      'ai-integration': ['gpt', 'openai', 'ai', 'machine learning', 'neural', 'llm'],
      'mobile-development': ['ios', 'android', 'mobile', 'app', 'smartphone'],
      'web-development': ['web', 'frontend', 'backend', 'api', 'database'],
      'automation-tools': ['automation', 'workflow', 'integration', 'webhook', 'trigger']
    };

    Object.entries(techStacks).forEach(([tech, keywords]) => {
      const techTasks = tasks.filter(task =>
        keywords.some(keyword => 
          task.title.toLowerCase().includes(keyword) ||
          task.description?.toLowerCase().includes(keyword)
        )
      );

      if (techTasks.length > 3) {
        patterns.push({
          id: `tech_${tech}`,
          name: this.formatDomainName(tech),
          themes: keywords,
          signature: `technology:${tech}`,
          projectIds: [],
          complexityThreshold: 30,
          autoMergeEnabled: true
        });
      }
    });

    return patterns;
  }

  // Detect temporal patterns (daily, weekly, project phases)
  private detectTemporalPatterns(tasks: any[]): OrganizingPattern[] {
    const patterns: OrganizingPattern[] = [];
    
    const timeBasedGroups = {
      'daily-operations': ['daily', 'routine', 'maintenance', 'monitoring'],
      'weekly-reviews': ['weekly', 'review', 'analysis', 'report'],
      'monthly-planning': ['monthly', 'planning', 'strategy', 'goals'],
      'quarterly-initiatives': ['quarterly', 'initiative', 'milestone', 'roadmap']
    };

    Object.entries(timeBasedGroups).forEach(([timeframe, keywords]) => {
      const timeTasks = tasks.filter(task =>
        keywords.some(keyword => task.title.toLowerCase().includes(keyword)) ||
        task.timeWindow === this.mapToTimeWindow(timeframe)
      );

      if (timeTasks.length > 2) {
        patterns.push({
          id: `temporal_${timeframe}`,
          name: this.formatDomainName(timeframe),
          themes: keywords,
          signature: `temporal:${timeframe}`,
          projectIds: [],
          complexityThreshold: 15,
          autoMergeEnabled: false // Don't auto-merge temporal patterns
        });
      }
    });

    return patterns;
  }

  // Build fractal project hierarchy
  private buildProjectHierarchy(projects: Project[], patterns: OrganizingPattern[]): FractalProjectNode[] {
    const rootNodes: FractalProjectNode[] = [];
    const nodeMap: Map<string, FractalProjectNode> = new Map();

    // Create nodes for each project
    projects.forEach(project => {
      const node: FractalProjectNode = {
        project,
        children: [],
        depth: project.nestingLevel || 0
      };
      nodeMap.set(project.id, node);
    });

    // Build parent-child relationships
    projects.forEach(project => {
      const node = nodeMap.get(project.id)!;
      
      if (project.parentProjectId) {
        const parent = nodeMap.get(project.parentProjectId);
        if (parent) {
          parent.children.push(node);
          node.parent = parent;
          node.depth = parent.depth + 1;
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  // Apply fractal scaling - split large projects, merge small ones
  private async applyFractalScaling(hierarchy: FractalProjectNode[], sessionId: string): Promise<void> {
    for (const node of hierarchy) {
      await this.processNodeForScaling(node, sessionId);
    }
  }

  private async processNodeForScaling(node: FractalProjectNode, sessionId: string): Promise<void> {
    const { project } = node;
    
    // Check if project should be split (too complex)
    if (project.complexityScore > 100 && node.children.length === 0) {
      await this.splitProject(project, sessionId);
    }
    
    // Check if children should be merged (too small)
    if (node.children.length > 1) {
      const smallChildren = node.children.filter(child => 
        child.project.complexityScore < 10 && child.project.taskCount < 3
      );
      
      if (smallChildren.length > 2) {
        await this.mergeProjects(smallChildren.map(c => c.project), sessionId);
      }
    }

    // Process children recursively
    for (const child of node.children) {
      await this.processNodeForScaling(child, sessionId);
    }
  }

  // Split large project into sub-projects
  private async splitProject(project: Project, sessionId: string): Promise<Project[]> {
    const tasks = await storage.getTasks(sessionId);
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    
    // Group tasks by theme for splitting
    const taskGroups = this.groupTasksByTheme(projectTasks);
    const subProjects: Project[] = [];
    
    for (const [theme, tasks] of Object.entries(taskGroups)) {
      if (tasks.length > 2) { // Only create sub-project if substantial
        const subProject = await this.createSubProject(project, theme, tasks, sessionId);
        subProjects.push(subProject);
      }
    }

    console.log(`[PatternOrganizer] Split "${project.name}" into ${subProjects.length} sub-projects`);
    return subProjects;
  }

  // Clean house - remove empty/redundant projects
  private async cleanHouse(hierarchy: FractalProjectNode[], sessionId: string): Promise<void> {
    const projectsToArchive: string[] = [];
    
    const checkNode = (node: FractalProjectNode) => {
      // Archive empty projects with no children
      if (node.project.taskCount === 0 && node.children.length === 0) {
        projectsToArchive.push(node.project.id);
      }
      
      // Process children
      node.children.forEach(checkNode);
    };

    hierarchy.forEach(checkNode);
    
    // Archive empty projects
    for (const projectId of projectsToArchive) {
      await this.archiveProject(projectId, sessionId);
    }

    console.log(`[PatternOrganizer] Cleaned house - archived ${projectsToArchive.length} empty projects`);
  }

  // Helper methods
  private formatDomainName(domain: string): string {
    return domain.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private mapToTimeWindow(timeframe: string): string {
    const mapping: Record<string, string> = {
      'daily-operations': 'any',
      'weekly-reviews': 'any',
      'monthly-planning': 'any',
      'quarterly-initiatives': 'any'
    };
    return mapping[timeframe] || 'any';
  }

  private groupTasksByTheme(tasks: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    tasks.forEach(task => {
      const themes = this.extractThemes(task);
      themes.forEach(theme => {
        if (!groups[theme]) groups[theme] = [];
        groups[theme].push(task);
      });
    });
    
    return groups;
  }

  private extractThemes(task: any): string[] {
    const themes: string[] = [];
    const title = task.title.toLowerCase();
    
    // Extract themes from title and tags
    if (title.includes('research') || title.includes('analyze')) themes.push('research');
    if (title.includes('implement') || title.includes('develop')) themes.push('development');
    if (title.includes('customer') || title.includes('client')) themes.push('customer');
    if (title.includes('marketing') || title.includes('sales')) themes.push('growth');
    
    return themes.length > 0 ? themes : ['general'];
  }

  private async createSubProject(parent: Project, theme: string, tasks: any[], sessionId: string): Promise<Project> {
    const subProject: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${parent.name} - ${this.formatDomainName(theme)}`,
      description: `Auto-generated sub-project for ${theme} tasks`,
      status: 'active' as const,
      priority: parent.priority,
      tags: [...parent.tags, theme, 'auto-generated'],
      sessionId,
      parentProjectId: parent.id,
      nestingLevel: (parent.nestingLevel || 0) + 1,
      taskCount: tasks.length,
      researchCount: 0,
      complexityScore: tasks.length * 5,
      autoReorganized: true,
      organizingThemes: [theme],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store sub-project
    if (!(global as any).projects) {
      (global as any).projects = new Map();
    }
    (global as any).projects.set(subProject.id, subProject);

    // Update tasks to point to new sub-project
    for (const task of tasks) {
      await storage.updateTaskProject(task.id, subProject.id);
    }

    return subProject;
  }

  private async mergeProjects(projects: Project[], sessionId: string): Promise<Project> {
    // Implementation for merging small projects
    const mergedProject: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Consolidated ${projects[0].name.split(' - ')[0]}`,
      description: `Merged project from ${projects.length} smaller projects`,
      status: 'active' as const,
      priority: 'medium' as const,
      tags: Array.from(new Set(projects.flatMap(p => p.tags))),
      sessionId,
      nestingLevel: 0,
      taskCount: projects.reduce((sum, p) => sum + p.taskCount, 0),
      researchCount: projects.reduce((sum, p) => sum + (p.researchCount || 0), 0),
      complexityScore: projects.reduce((sum, p) => sum + p.complexityScore, 0),
      autoReorganized: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store merged project and archive old ones
    if (!(global as any).projects) {
      (global as any).projects = new Map();
    }
    (global as any).projects.set(mergedProject.id, mergedProject);

    // Archive original projects
    for (const project of projects) {
      await this.archiveProject(project.id, sessionId);
    }

    return mergedProject;
  }

  private async archiveProject(projectId: string, sessionId: string): Promise<void> {
    if ((global as any).projects?.has(projectId)) {
      const project = (global as any).projects.get(projectId);
      project.status = 'archived';
      project.updatedAt = new Date();
      console.log(`[PatternOrganizer] Archived project: ${project.name}`);
    }
  }

  private async getProjects(sessionId: string): Promise<Project[]> {
    if (!(global as any).projects) {
      return [];
    }
    
    return Array.from((global as any).projects.values())
      .filter((project: any) => project.sessionId === sessionId && project.status !== 'archived')
      .sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

export const patternOrganizer = new PatternOrganizer();