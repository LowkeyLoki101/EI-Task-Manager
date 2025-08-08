import { useState, useEffect } from 'react';
import { useSessionId } from '@/hooks/useSessionId';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mic, Settings, Brain, Zap, ExternalLink, Volume2 } from 'lucide-react';
import EmergentLogo from '../components/EmergentLogo';
import ThemeToggle from '../components/ThemeToggle';

// Global types for ElevenLabs web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id'?: string;
      };
    }
  }
}

export default function HomePage() {
  const sessionId = useSessionId();
  const [builderMode, setBuilderMode] = useState(false);
  const [widgetStatus, setWidgetStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [widgetError, setWidgetError] = useState<string | null>(null);

  // Initialize ElevenLabs widget with diagnostics
  useEffect(() => {
    // Supervisor processing for Builder Mode
    if (!builderMode || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/supervisor/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            conversation: 'Builder mode supervision check',
            builderMode: true
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.tasksCreated > 0) {
            console.log(`Builder mode: Created ${result.tasksCreated} tasks`);
          }
        }
      } catch (error) {
        console.error('Supervisor processing error:', error);
      }
    }, 8000); // 8-second intervals as specified

    return () => clearInterval(interval);
  }, [builderMode, sessionId]);

  // ElevenLabs widget diagnostics
  useEffect(() => {
    // Check for AudioWorklet support (common mobile issue)
    const checkAudioSupport = () => {
      if (typeof AudioWorkletNode === 'undefined') {
        setWidgetStatus('error');
        setWidgetError('AudioWorklets not supported. Try using Chrome or Firefox on desktop for full voice features.');
        return false;
      }
      return true;
    };

    function waitForWidget() {
      const el = document.getElementById('el-agent') as any;
      if (!el || typeof el.addEventListener !== 'function') {
        return setTimeout(waitForWidget, 150);
      }

      // Event listeners for diagnostics
      el.addEventListener('convai-ready', () => {
        console.log('[EL] Widget ready');
        setWidgetStatus('ready');
        setWidgetError(null);
      });

      el.addEventListener('convai-error', (e: any) => {
        console.error('[EL] Widget error:', e.detail);
        setWidgetStatus('error');
        
        // Provide helpful error messages for common issues
        let errorMessage = e.detail?.message || 'Unknown widget error';
        if (errorMessage.includes('raw-audio-processor') || errorMessage.includes('AudioWorklet')) {
          errorMessage = 'AudioWorklets not supported on this browser. Please use Chrome or Firefox on desktop for full voice features.';
        } else if (errorMessage.includes('domain')) {
          errorMessage = 'Domain not authorized. Contact admin to add this domain to ElevenLabs allowlist.';
        } else if (errorMessage.includes('agent')) {
          errorMessage = 'Agent configuration issue. Please check the agent ID and permissions.';
        }
        
        setWidgetError(errorMessage);
      });

      el.addEventListener('convai-opened', () => {
        console.log('[EL] Widget opened');
      });

      el.addEventListener('convai-closed', () => {
        console.log('[EL] Widget closed');
      });

      // Failsafe check
      setTimeout(() => {
        if (!el.shadowRoot) {
          console.error('[EL] Widget not upgraded (no shadowRoot). Check CSP/allowlist/SDK.');
          setWidgetStatus('error');
          setWidgetError('Widget not upgraded - check console for CSP or SDK loading issues');
        }
      }, 3000);
    }

    // Check audio support first
    if (checkAudioSupport()) {
      waitForWidget();
    }
  }, []);

  const openWidget = () => {
    const el = document.getElementById('el-agent') as any;
    if (el?.dispatchEvent) {
      el.dispatchEvent(new Event('convai-open'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <EmergentLogo className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Emergent Intelligence
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Conversational AI Task Management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="builder-mode" className="text-sm">Builder Mode</Label>
            <Switch
              id="builder-mode"
              checked={builderMode}
              onCheckedChange={setBuilderMode}
              data-testid="switch-builder-mode"
            />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your AI-Powered Task Assistant
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Speak naturally to create, organize, and manage your tasks. 
              The system learns your patterns and automates workflows.
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Voice Assistant Status */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-blue-500" />
                  <CardTitle className="text-lg">Voice Assistant</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={widgetStatus === 'ready' ? 'default' : widgetStatus === 'error' ? 'destructive' : 'secondary'}
                    data-testid="badge-widget-status"
                  >
                    {widgetStatus === 'ready' ? 'Ready' : widgetStatus === 'error' ? 'Error' : 'Loading'}
                  </Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Agent: 8201k251883jf0hr1ym7d6dbymxc
                  </span>
                </div>
                
                {widgetError && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                    <div className="font-medium mb-1">Voice Assistant Error</div>
                    <div className="mb-2">{widgetError}</div>
                    {widgetError.includes('AudioWorklets') && (
                      <div className="text-xs text-red-500 dark:text-red-400">
                        <strong>Mobile users:</strong> The voice features work best on desktop browsers. 
                        You can still use the text-based Actions API below.
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Button 
                    onClick={openWidget} 
                    className="w-full" 
                    variant="outline"
                    disabled={widgetStatus === 'error'}
                    data-testid="button-open-voice"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    {widgetStatus === 'error' ? 'Voice Unavailable' : 'Start Voice Conversation'}
                  </Button>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Open in external tab for full permissions
                    {navigator.userAgent.includes('Mobile') && (
                      <><br />📱 Mobile detected: Desktop recommended for voice features</>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Builder Mode Status */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-green-500" />
                  <CardTitle className="text-lg">Builder Mode</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={builderMode ? 'default' : 'secondary'}>
                    {builderMode ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    GPT-5 Ops Manager
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {builderMode 
                    ? 'Processing conversations every 8 seconds to create structured tasks and steps'
                    : 'Voice conversations will be logged but not processed into tasks'
                  }
                </div>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-500" />
                  <CardTitle className="text-lg">Session</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
                  {sessionId}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Memory Anchors</Badge>
                  <Badge variant="outline">Context Routing</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                System Features
              </CardTitle>
              <CardDescription>
                Comprehensive AI-powered task management architecture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Core Architecture</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>✓ ElevenLabs Voice Assistant Integration</li>
                    <li>✓ GPT-5 Ops Manager with Intent Processing</li>
                    <li>✓ Memory Anchors Database Schema</li>
                    <li>✓ Context Routing (Computer/Phone/Physical)</li>
                    <li>✓ Time Window Management</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">API Surface</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>✓ ElevenLabs Actions API</li>
                    <li>✓ Task/Step CRUD Operations</li>
                    <li>✓ Domain-Specific Memory Storage</li>
                    <li>✓ Webhook Integration</li>
                    <li>✓ Public API for Integrators</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>Available Actions</CardTitle>
              <CardDescription>
                Test the ElevenLabs Actions API directly{widgetStatus === 'error' ? ' (Alternative to voice interface)' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <code className="text-sm font-medium">add_task</code>
                  <p className="text-xs text-gray-500 mt-1">Create tasks with steps and context</p>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">POST /api/actions/add_task</div>
                </div>
                <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <code className="text-sm font-medium">update_step_status</code>
                  <p className="text-xs text-gray-500 mt-1">Mark steps as pending/running/done</p>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">POST /api/actions/update_step_status</div>
                </div>
                <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <code className="text-sm font-medium">get_todo_list</code>
                  <p className="text-xs text-gray-500 mt-1">Retrieve filtered task lists</p>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">POST /api/actions/get_todo_list</div>
                </div>
                <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <code className="text-sm font-medium">kb_attach_doc</code>
                  <p className="text-xs text-gray-500 mt-1">Upload documents to knowledge base</p>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">POST /api/actions/kb_attach_doc</div>
                </div>
                <div className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <code className="text-sm font-medium">post_ops_update</code>
                  <p className="text-xs text-gray-500 mt-1">Send operational status updates</p>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">POST /api/actions/post_ops_update</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href="/api/health" target="_blank" className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      API Health
                    </a>
                  </Button>
                  <div className="text-xs text-gray-500 mt-1">System status endpoint</div>
                </div>
              </div>
              
              {widgetStatus === 'error' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note for mobile users:</strong> While voice features may not work on your device, 
                    all the core functionality is available through the API endpoints above. The system still 
                    provides complete task management, memory storage, and workflow automation.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* ElevenLabs Widget - Official Implementation */}
      <elevenlabs-convai
        id="el-agent"
        agent-id="agent_8201k251883jf0hr1ym7d6dbymxc"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          zIndex: 9999
        }}
      />
    </div>
  );
}