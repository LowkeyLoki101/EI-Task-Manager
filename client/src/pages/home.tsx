import { useState, useEffect } from 'react';
import { useSessionId } from '@/hooks/useSessionId';
import VoiceWidget from '../components/VoiceWidget';
import ConversationHistory from '../components/ConversationHistory';
import TaskManager from '../components/TaskManager';
import FileUpload from '../components/FileUpload';
import CodeProposals from '../components/CodeProposals';
import SystemStatus from '../components/SystemStatus';
import VideoModal from '../components/VideoModal';
import CodePreviewModal from '../components/CodePreviewModal';
import EmergentLogo from '../components/EmergentLogo';
import ThemeToggle from '../components/ThemeToggle';
import type { VideoResource } from '@/lib/types';
import type { Proposal } from '@shared/schema';

export default function Home() {
  const sessionId = useSessionId();
  const [builderMode, setBuilderMode] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoResource | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  // Poll supervisor when builder mode is on
  useEffect(() => {
    if (!builderMode || !sessionId) return;
    
    const interval = setInterval(() => {
      fetch(`/api/supervisor/agent?sessionId=${sessionId}&slug=task-builder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      }).catch(console.error);
    }, 8000);

    return () => clearInterval(interval);
  }, [builderMode, sessionId]);

  const handleMessage = async (message: string) => {
    if (!sessionId) return;

    // Save user message
    await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        role: 'user',
        content: message
      })
    });

    // Process with AI supervisor
    await fetch('/api/supervisor/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });
  };

  const handleVideoSelect = (video: VideoResource) => {
    setSelectedVideo(video);
  };

  const handleProposalPreview = (proposal: Proposal) => {
    setSelectedProposal(proposal);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 animate-pulse">
            <EmergentLogo size="lg" showText={false} />
          </div>
          <p className="text-slate-600">Initializing Emergent Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 font-sans min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <EmergentLogo size="md" showText={true} />
              <span className="text-sm text-slate-500 hidden sm:inline">AI-Powered Task Intelligence</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">Builder Mode</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={builderMode}
                    onChange={(e) => setBuilderMode(e.target.checked)}
                    data-testid="toggle-builder-mode"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <ThemeToggle />
                <div className="text-sm text-slate-500 hidden sm:block">
                  Session: <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded" data-testid="session-id">{sessionId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel - Conversation & Voice Widget */}
          <div className="lg:col-span-5 space-y-6">
            <VoiceWidget onMessage={handleMessage} isConnected={true} />
            <ConversationHistory sessionId={sessionId} />
            <FileUpload sessionId={sessionId} onMessage={handleMessage} />
          </div>
          
          {/* Middle Panel - Tasks */}
          <div className="lg:col-span-4">
            <TaskManager sessionId={sessionId} onVideoSelect={handleVideoSelect} />
          </div>
          
          {/* Right Panel - Code Proposals & System */}
          <div className="lg:col-span-3 space-y-6">
            <CodeProposals sessionId={sessionId} onPreview={handleProposalPreview} />
            <SystemStatus sessionId={sessionId} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <VideoModal 
        video={selectedVideo} 
        onClose={() => setSelectedVideo(null)} 
      />
      <CodePreviewModal
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
        onApprove={(id: string) => {
          fetch(`/api/proposals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
          });
          setSelectedProposal(null);
        }}
        onReject={(id: string) => {
          fetch(`/api/proposals/${id}`, {
            method: 'DELETE'
          });
          setSelectedProposal(null);
        }}
      />
    </div>
  );
}
