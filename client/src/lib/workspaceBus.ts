export type Source = 'human' | 'ai';
export type Cmd =
  | { type: 'OPEN_TOOL'; source: Source; tool: string; args?: any }
  | { type: 'FOCUS_TASK'; source: Source; taskId: string }
  | { type: 'INJECT_INPUT'; source: Source; target: string; payload: any };

type Listener = (cmd: Cmd) => void;
const listeners = new Set<Listener>();

export const emit = (cmd: Cmd) => { 
  console.log('[WorkspaceBus]', cmd);
  listeners.forEach(fn => fn(cmd)); 
};

export const subscribe = (fn: Listener) => { 
  listeners.add(fn); 
  return () => { 
    listeners.delete(fn); 
  }; 
};