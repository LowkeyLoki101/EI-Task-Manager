import { randomUUID } from "crypto";
import { storage } from "./storage";
import type { Task, Step, Note, Protocol } from "@shared/schema";

export interface ShareableItem {
  id: string;
  type: 'task' | 'workflow' | 'note' | 'protocol' | 'session_snapshot';
  title: string;
  content: any;
  metadata: {
    creator: string;
    sessionId: string;
    createdAt: string;
    permissions: 'public' | 'private' | 'link_only';
    expiresAt?: string;
  };
}

export interface TinkerComponent {
  id: string;
  name: string;
  description: string;
  code: string;
  type: 'widget' | 'action' | 'filter' | 'automation';
  inputs: any[];
  outputs: any[];
  preview?: string;
}

export class SharingSystem {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REPLIT_URL || 'http://localhost:5000';
  }

  // Create shareable links for tasks, workflows, or entire sessions
  async createShareableLink(itemType: ShareableItem['type'], itemId: string, options: {
    permissions?: 'public' | 'private' | 'link_only';
    expiresIn?: number; // hours
    includeContext?: boolean;
  } = {}): Promise<{
    shareId: string;
    shareUrl: string;
    qrCode?: string;
  }> {
    const shareId = randomUUID();
    const expiresAt = options.expiresIn 
      ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000).toISOString()
      : undefined;

    let content: any = {};
    let title = '';

    // Gather the content based on type
    switch (itemType) {
      case 'task':
        const task = await storage.getTask(itemId);
        if (!task) throw new Error('Task not found');
        
        const taskSteps = await storage.listSteps(itemId);
        content = { task, steps: taskSteps };
        title = task.title;
        break;

      case 'workflow':
        // Get a collection of related tasks and steps
        const sessionTasks = await storage.listTasks(itemId);
        const sessionSteps = [];
        for (const task of sessionTasks) {
          const steps = await storage.listSteps(task.id);
          sessionSteps.push(...steps);
        }
        content = { tasks: sessionTasks, steps: sessionSteps };
        title = `Workflow - ${sessionTasks.length} tasks`;
        break;

      case 'session_snapshot':
        // Full session state for collaboration
        const sessionSnapshotTasks = await storage.listTasks(itemId);
        const sessionSnapshotSteps = [];
        for (const task of sessionSnapshotTasks) {
          const steps = await storage.listSteps(task.id);
          sessionSnapshotSteps.push(...steps);
        }
        
        content = {
          tasks: sessionSnapshotTasks,
          steps: sessionSnapshotSteps,
          metadata: {
            sessionId: itemId,
            snapshot_at: new Date().toISOString(),
            total_tasks: sessionSnapshotTasks.length
          }
        };
        title = `Session Snapshot - ${sessionSnapshotTasks.length} tasks`;
        break;

      default:
        throw new Error(`Unsupported share type: ${itemType}`);
    }

    const shareableItem: ShareableItem = {
      id: shareId,
      type: itemType,
      title,
      content,
      metadata: {
        creator: 'user', // TODO: Get from auth when available
        sessionId: itemType === 'session_snapshot' ? itemId : 'unknown',
        createdAt: new Date().toISOString(),
        permissions: options.permissions || 'link_only',
        expiresAt
      }
    };

    // Store the shareable item (in memory for now)
    await this.storeShareableItem(shareableItem);

    const shareUrl = `${this.baseUrl}/share/${shareId}`;

    return {
      shareId,
      shareUrl,
      qrCode: await this.generateQRCode(shareUrl)
    };
  }

  // Get shared content by share ID
  async getSharedContent(shareId: string): Promise<ShareableItem | null> {
    // TODO: Implement proper storage retrieval
    // For now, return mock data to show the concept
    return null;
  }

  // Import shared content into current session
  async importSharedContent(shareId: string, targetSessionId: string): Promise<{
    tasksImported: number;
    stepsImported: number;
    message: string;
  }> {
    const sharedItem = await this.getSharedContent(shareId);
    if (!sharedItem) {
      throw new Error('Shared content not found or expired');
    }

    let tasksImported = 0;
    let stepsImported = 0;

    // Import based on content type
    switch (sharedItem.type) {
      case 'task':
        const { task, steps: taskSteps } = sharedItem.content;
        
        // Create new task in target session
        const newTask = await storage.createTask({
          ...task,
          id: randomUUID(),
          sessionId: targetSessionId,
        });
        tasksImported++;

        // Create associated steps
        for (const step of taskSteps || []) {
          await storage.createStep({
            ...step,
            id: randomUUID(),
            taskId: newTask.id,
          });
          stepsImported++;
        }
        break;

      case 'workflow':
      case 'session_snapshot':
        const { tasks: importTasks, steps: importSteps } = sharedItem.content;
        
        // Create all tasks
        const taskIdMap = new Map<string, string>();
        for (const task of importTasks || []) {
          const newTaskId = randomUUID();
          await storage.createTask({
            ...task,
            id: newTaskId,
            sessionId: targetSessionId,
          });
          taskIdMap.set(task.id, newTaskId);
          tasksImported++;
        }

        // Create all steps with updated task IDs
        for (const step of importSteps || []) {
          const newTaskId = taskIdMap.get(step.taskId);
          if (newTaskId) {
            await storage.createStep({
              ...step,
              id: randomUUID(),
              taskId: newTaskId,
            });
            stepsImported++;
          }
        }
        break;
    }

    return {
      tasksImported,
      stepsImported,
      message: `Successfully imported ${tasksImported} tasks and ${stepsImported} steps from shared content: "${sharedItem.title}"`
    };
  }

  private async storeShareableItem(item: ShareableItem) {
    // TODO: Implement proper storage
    // For now, log it to show the concept
    console.log('Storing shareable item:', {
      id: item.id,
      type: item.type,
      title: item.title,
      permissions: item.metadata.permissions
    });
  }

  private async generateQRCode(url: string): Promise<string> {
    // Use QR generation - simplified for now
    try {
      // TODO: Implement proper QR code generation
      console.log('QR code requested for:', url);
      return url; // Return URL for now, can implement QR later
    } catch (error) {
      console.error('QR generation failed:', error);
      return url;
    }
  }
}

export class TinkerFramework {
  private components: Map<string, TinkerComponent> = new Map();

  // Register a lightweight component that can be used in the system
  async registerComponent(component: Omit<TinkerComponent, 'id'>): Promise<string> {
    const id = randomUUID();
    const fullComponent: TinkerComponent = {
      id,
      ...component
    };

    this.components.set(id, fullComponent);
    
    console.log(`Registered Tinker component: ${component.name} (${component.type})`);
    return id;
  }

  // Execute a component with given inputs
  async executeComponent(componentId: string, inputs: any): Promise<any> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not found`);
    }

    try {
      // Create a safe execution environment
      const context = {
        inputs,
        storage,
        console: console,
        // Add other safe APIs as needed
      };

      // Execute the component code (simplified - in production would use VM)
      const fn = new Function('context', `
        const { inputs, storage, console } = context;
        ${component.code}
        return result;
      `);

      const result = fn(context);
      
      console.log(`Executed component ${component.name}:`, { inputs, result });
      return result;
    } catch (error) {
      console.error(`Component execution failed for ${component.name}:`, error);
      throw error;
    }
  }

  // List available components
  getComponents(type?: TinkerComponent['type']): TinkerComponent[] {
    const allComponents = Array.from(this.components.values());
    return type ? allComponents.filter(c => c.type === type) : allComponents;
  }

  // Create a simple widget component
  async createWidget(name: string, description: string, renderCode: string): Promise<string> {
    return this.registerComponent({
      name,
      description,
      code: renderCode,
      type: 'widget',
      inputs: [{ name: 'props', type: 'object' }],
      outputs: [{ name: 'html', type: 'string' }],
      preview: `<!-- ${description} -->`
    });
  }

  // Create an automation component
  async createAutomation(name: string, description: string, actionCode: string): Promise<string> {
    return this.registerComponent({
      name,
      description,
      code: actionCode,
      type: 'automation',
      inputs: [{ name: 'trigger', type: 'object' }],
      outputs: [{ name: 'result', type: 'object' }]
    });
  }
}

// Export singleton instances
export const sharingSystem = new SharingSystem();
export const tinkerFramework = new TinkerFramework();

// Initialize with some default components
export async function initializeTinkerFramework() {
  // Task summary widget
  await tinkerFramework.createWidget(
    'Task Summary',
    'Displays a clean summary of current tasks',
    `
    const tasks = inputs.tasks || [];
    const summary = tasks.map(task => 
      \`<div class="task-item">
        <h3>\${task.title}</h3>
        <span class="status">\${task.status}</span>
        <span class="context">\${task.context}</span>
      </div>\`
    ).join('');
    
    const result = \`<div class="task-summary">\${summary}</div>\`;
    `
  );

  // Auto-organize automation
  await tinkerFramework.createAutomation(
    'Auto Organize Tasks',
    'Automatically organizes tasks by priority and context',
    `
    const tasks = inputs.tasks || [];
    const result = {
      urgent: tasks.filter(t => t.timeWindow === 'morning'),
      work: tasks.filter(t => t.context === 'computer'),
      mobile: tasks.filter(t => t.context === 'phone'),
      physical: tasks.filter(t => t.context === 'physical')
    };
    
    console.log('Auto-organized tasks:', result);
    `
  );

  console.log('Tinker Framework initialized with default components');
}