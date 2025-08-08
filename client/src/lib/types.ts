export interface VideoResource {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  embedUrl: string;
}

export interface VoiceWidgetProps {
  onMessage: (message: string) => void;
  isConnected: boolean;
}

export interface TaskAction {
  type: 'create_task' | 'update_task' | 'complete_task';
  task?: any;
  id?: string;
  updates?: any;
}

export interface AIResponse {
  response: string;
  actions: TaskAction[];
  tools_used?: string[];
}
