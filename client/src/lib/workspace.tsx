import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribe, emit, type Cmd, type Source } from './workspaceBus';

type Mode = 'human' | 'hybrid' | 'ai';
type Panel = { id: string; type: string; props?: any };

type WorkspaceCtx = {
  mode: Mode; 
  setMode: (m: Mode) => void;
  panels: Panel[]; 
  focused?: string;
  openTool: (tool: string, args?: any) => void;         // human action
  focusTask: (id: string) => void;                      // human action
  injectInput: (target: string, payload: any) => void;  // human action
  closeTool: (id: string) => void;                      // close panel
};

const Ctx = createContext<WorkspaceCtx | null>(null);

const allow = (mode: Mode, who: Source, action: Cmd['type']) => {
  if (mode === 'human')  return who === 'human';
  if (mode === 'hybrid') return true;
  if (mode === 'ai')     return who === 'ai';
  return false;
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('human');
  const [panels, setPanels] = useState<Panel[]>([]);
  const [focused, setFocused] = useState<string | undefined>(undefined);

  // React to AI or human commands
  useEffect(() => {
    const unsubscribe = subscribe((cmd) => {
      console.log('[WorkspaceProvider] Received command:', cmd, 'mode:', mode);
      
      if (!allow(mode, cmd.source, cmd.type)) {
        console.log('[WorkspaceProvider] Command blocked by mode permissions');
        return;
      }

      if (cmd.type === 'OPEN_TOOL') {
        const id = crypto.randomUUID();
        setPanels(p => [...p, { id, type: cmd.tool, props: cmd.args }]);
        setFocused(id);
        console.log('[WorkspaceProvider] Opened tool:', cmd.tool, 'with id:', id);
      }
      if (cmd.type === 'FOCUS_TASK') {
        setFocused(cmd.taskId);
        console.log('[WorkspaceProvider] Focused task:', cmd.taskId);
      }
      if (cmd.type === 'INJECT_INPUT') {
        console.log('[WorkspaceProvider] Injecting input:', cmd.payload, 'to:', cmd.target);
        // Route to a panel/task by target id; can be enhanced later
      }
    });
    
    return unsubscribe;
  }, [mode]);

  const api = useMemo<WorkspaceCtx>(() => ({
    mode, setMode,
    panels, focused,
    openTool: (tool, args) => {
      console.log('[WorkspaceProvider] Human opening tool:', tool);
      emit({ type:'OPEN_TOOL', source:'human', tool, args });
    },
    focusTask: (taskId) => {
      console.log('[WorkspaceProvider] Human focusing task:', taskId);
      emit({ type:'FOCUS_TASK', source:'human', taskId });
    },
    injectInput: (target, payload) => {
      console.log('[WorkspaceProvider] Human injecting input:', payload);
      emit({ type:'INJECT_INPUT', source:'human', target, payload });
    },
    closeTool: (id) => {
      console.log('[WorkspaceProvider] Closing tool:', id);
      setPanels(p => p.filter(panel => panel.id !== id));
      if (focused === id) {
        setFocused(undefined);
      }
    },
  }), [mode, panels, focused]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useWorkspace = () => {
  const v = useContext(Ctx); 
  if (!v) throw new Error('WorkspaceProvider missing');
  return v;
};