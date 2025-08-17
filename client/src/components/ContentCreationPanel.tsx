import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  PenTool, 
  Brain, 
  Sparkles, 
  Eye, 
  Zap, 
  Clock,
  Share2,
  FileText,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface ContentCreationPanelProps {
  sessionId?: string;
  payload?: any;
  onUpdate?: (data: any) => void;
}

interface CreationStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'complete';
  thinking?: string;
  content?: string;
  timestamp?: Date;
}

interface LiveThinking {
  step: string;
  thought: string;
  progress: number;
  options: string[];
  selectedOption?: string;
  timestamp: Date;
}

export default function ContentCreationPanel({ sessionId = 's_default', payload, onUpdate }: ContentCreationPanelProps) {
  const [contentType, setContentType] = useState<'blog' | 'social' | 'newsletter'>('blog');
  const [isCreating, setIsCreating] = useState(false);
  const [liveThinking, setLiveThinking] = useState<LiveThinking | null>(null);
  const [creationSteps, setCreationSteps] = useState<CreationStep[]>([]);
  const [currentContent, setCurrentContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter']);

  // Content creation pipeline steps
  const contentSteps = [
    { id: 'analyze', name: 'Analyzing Context', icon: Brain },
    { id: 'research', name: 'Gathering Research', icon: Eye },
    { id: 'ideate', name: 'Generating Ideas', icon: Sparkles },
    { id: 'outline', name: 'Creating Outline', icon: FileText },
    { id: 'write', name: 'Crafting Content', icon: PenTool },
    { id: 'optimize', name: 'Optimizing for Platform', icon: Zap },
    { id: 'finalize', name: 'Final Polish', icon: Share2 }
  ];

  // Platform configurations
  const platforms = [
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, limit: 280, color: 'blue' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, limit: 2200, color: 'pink' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, limit: 63206, color: 'blue' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, limit: 3000, color: 'blue' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, limit: 5000, color: 'red' },
    { id: 'blog', name: 'Blog Post', icon: FileText, limit: 10000, color: 'gray' }
  ];

  // Start AI content creation with live thinking
  const startAICreation = async () => {
    setIsCreating(true);
    setCreationSteps([]);
    setCurrentContent('');
    
    try {
      // Initialize creation steps
      const initialSteps = contentSteps.map((step, index) => ({
        id: step.id,
        name: step.name,
        status: index === 0 ? 'active' as const : 'pending' as const
      }));
      setCreationSteps(initialSteps);

      // Start the AI content creation process
      const response = await fetch('/api/workstation/create-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          contentType,
          platforms: selectedPlatforms,
          topic: title || 'AI and Business Innovation',
          liveMode: true
        })
      });

      if (response.ok) {
        // Set up EventSource for live thinking updates
        const eventSource = new EventSource(`/api/workstation/content-stream/${sessionId}`);
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'thinking') {
            setLiveThinking({
              step: data.step,
              thought: data.thought,
              progress: data.progress,
              options: data.options || [],
              selectedOption: data.selectedOption,
              timestamp: new Date()
            });
          } else if (data.type === 'step_complete') {
            setCreationSteps(prev => prev.map(step => 
              step.id === data.stepId 
                ? { ...step, status: 'complete', content: data.content }
                : step.id === data.nextStepId
                ? { ...step, status: 'active' }
                : step
            ));
          } else if (data.type === 'content_update') {
            setCurrentContent(data.content);
          } else if (data.type === 'complete') {
            setCurrentContent(data.finalContent);
            setIsCreating(false);
            eventSource.close();
            onUpdate?.({
              content: data.finalContent,
              title: data.title,
              platforms: selectedPlatforms,
              type: contentType
            });
          }
        };

        eventSource.onerror = () => {
          console.error('Content creation stream error');
          setIsCreating(false);
          eventSource.close();
        };
      }
    } catch (error) {
      console.error('Content creation failed:', error);
      setIsCreating(false);
    }
  };

  // Platform toggle
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-800/20 to-gray-900/20 overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-amber-500/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-200">AI Content Creator</h3>
            {isCreating && (
              <Badge variant="outline" className="bg-amber-900/30 border-amber-500/50 text-amber-300 animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Creating...
              </Badge>
            )}
          </div>
          
          {/* Content Type Toggle */}
          <div className="flex gap-1">
            {['blog', 'social', 'newsletter'].map((type) => (
              <Button
                key={type}
                variant={contentType === type ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setContentType(type as any)}
                className="text-xs"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Platform Selection */}
        <div className="space-y-2">
          <label className="text-sm text-amber-300">Target Platforms:</label>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const isSelected = selectedPlatforms.includes(platform.id);
              return (
                <Button
                  key={platform.id}
                  variant={isSelected ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => togglePlatform(platform.id)}
                  className={`text-xs flex items-center gap-1 ${
                    isSelected 
                      ? 'bg-amber-900/30 border-amber-500/50 text-amber-200' 
                      : 'text-gray-400 hover:text-amber-300'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {platform.name}
                  <span className="text-xs opacity-60">({platform.limit})</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Topic Input */}
        <div className="mt-3">
          <Input
            placeholder="Content topic or let AI choose..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-slate-700/20 border-amber-500/20 text-amber-100 placeholder-amber-300/40"
          />
        </div>

        {/* Start Creation Button */}
        <Button
          onClick={startAICreation}
          disabled={isCreating || selectedPlatforms.length === 0}
          className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-black font-medium"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              AI is Creating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Start AI Content Creation
            </>
          )}
        </Button>
      </div>

      {/* Live AI Thinking Display */}
      {liveThinking && (
        <div className="flex-none p-4 border-b border-amber-500/10 bg-gradient-to-r from-amber-900/20 to-orange-900/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Brain className="h-4 w-4 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-amber-300 uppercase tracking-wide">
                  {liveThinking.step}
                </span>
                <ChevronRight className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-200">
                  {liveThinking.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-amber-100 leading-relaxed">
                {liveThinking.thought}
              </p>
              {liveThinking.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {liveThinking.options.map((option, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`text-xs ${
                        option === liveThinking.selectedOption
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-700/30 border-slate-600 text-slate-300'
                      }`}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              )}
              <Progress 
                value={liveThinking.progress} 
                className="mt-2 h-1" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Creation Steps Progress */}
      {creationSteps.length > 0 && (
        <div className="flex-none p-4 border-b border-amber-500/10">
          <div className="grid grid-cols-7 gap-2">
            {creationSteps.map((step, idx) => {
              const StepIcon = contentSteps.find(s => s.id === step.id)?.icon || Clock;
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center p-2 rounded text-center ${
                    step.status === 'complete' 
                      ? 'bg-green-900/30 border border-green-500/50' 
                      : step.status === 'active'
                      ? 'bg-amber-900/30 border border-amber-500/50 animate-pulse'
                      : 'bg-slate-700/20 border border-slate-600/30'
                  }`}
                >
                  <StepIcon className={`h-4 w-4 mb-1 ${
                    step.status === 'complete' ? 'text-green-400' :
                    step.status === 'active' ? 'text-amber-400' : 'text-gray-500'
                  }`} />
                  <span className={`text-xs ${
                    step.status === 'complete' ? 'text-green-300' :
                    step.status === 'active' ? 'text-amber-300' : 'text-gray-500'
                  }`}>
                    {step.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Preview */}
      <div className="flex-1 p-4 overflow-auto">
        {currentContent ? (
          <Card className="bg-slate-700/20 border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-amber-200 text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Live Content Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                className="min-h-[300px] bg-slate-800/30 border-amber-500/30 text-amber-100 resize-none"
                placeholder="AI-generated content will appear here as it's being created..."
              />
              
              {/* Character Count for Selected Platforms */}
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPlatforms.map(platformId => {
                  const platform = platforms.find(p => p.id === platformId);
                  if (!platform) return null;
                  
                  const charCount = currentContent.length;
                  const isOverLimit = charCount > platform.limit;
                  
                  return (
                    <div
                      key={platformId}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                        isOverLimit 
                          ? 'bg-red-900/30 text-red-300 border border-red-500/50'
                          : 'bg-slate-700/30 text-slate-300 border border-slate-600/30'
                      }`}
                    >
                      <platform.icon className="h-3 w-3" />
                      {charCount}/{platform.limit}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PenTool className="h-16 w-16 text-amber-400/30 mb-4" />
            <h3 className="text-amber-200 text-lg font-medium mb-2">Ready to Create</h3>
            <p className="text-amber-300/60 text-sm max-w-md">
              Choose your platforms, set a topic, and watch the AI craft content in real-time. 
              You'll see every thought, decision, and creative step as it happens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}