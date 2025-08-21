import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Send, Brain, Clock, FileText, Calendar, Settings, Lightbulb, Upload, X, Code, Zap, Copy, Check, HelpCircle } from 'lucide-react';
import companyLogo from '@assets/IMG_3516_1755741839157.jpeg';

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    actionsTaken?: string[];
    filesAccessed?: string[];
    automationsCreated?: string[];
    reflections?: string[];
  };
}

interface DiaryEntry {
  id: string;
  timestamp: string;
  type: 'reflection' | 'idea' | 'problem' | 'solution' | 'assumption' | 'learning';
  content: string;
  tags: string[];
  sessionId?: string;
  taskId?: string;
}

interface AutonomousChatProps {
  sessionId: string;
}

export default function AutonomousChat({ sessionId }: AutonomousChatProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDiary, setShowDiary] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Get conversation history
  const { data: conversationData, isLoading } = useQuery({
    queryKey: ['/api/chat', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${sessionId}`);
      return response.json();
    },
    enabled: !!sessionId,
    refetchInterval: 3000
  });

  // Get diary/memory insights data
  const { data: insightsData } = useQuery({
    queryKey: ['/api/diary/insights', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/diary/insights/${sessionId}`);
      return response.json();
    },
    enabled: showDiary,
    refetchInterval: 30000 // Refresh insights every 30 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ messageText, files }: { messageText: string; files?: File[] }) => {
      const formData = new FormData();
      formData.append('message', messageText);
      
      if (files && files.length > 0) {
        files.forEach((file, index) => {
          formData.append(`file${index}`, file);
        });
      }

      const response = await fetch(`/api/chat/${sessionId}`, {
        method: 'POST',
        body: formData
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', sessionId] }); // Chat can modify tasks
      setMessage('');
      setUploadedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  });

  // Generate ideas mutation
  const generateIdeasMutation = useMutation({
    mutationFn: async (context: string) => {
      const response = await fetch('/api/diary/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/insights', sessionId] });
    }
  });

  const messages = conversationData?.messages || [];
  const memory = conversationData?.memory;
  const insights = conversationData?.insights || [];
  const trustLevel = conversationData?.trustLevel || 0.5;
  const allInsights = insightsData?.insights || [];
  const successfulPatterns = insightsData?.patterns || [];
  const userPreferences = insightsData?.preferences || [];

  // Auto-scroll to bottom when chat is expanded
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }, 100); // Small delay to ensure DOM is updated
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Smart auto-scroll - only scroll if user is near bottom and not actively typing
  useEffect(() => {
    if (messages.length > 0 && !isUserTyping && isExpanded) {
      const timer = setTimeout(() => {
        const scrollArea = scrollAreaRef.current;
        if (scrollArea) {
          // Check if user is near the bottom (within 100px)
          const { scrollTop, scrollHeight, clientHeight } = scrollArea;
          const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
          
          // Only auto-scroll if user is near bottom
          if (isNearBottom) {
            messagesEndRef.current?.scrollIntoView({ 
              behavior: 'smooth',
              block: 'end',
              inline: 'nearest'
            });
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isUserTyping, isExpanded]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || uploadedFiles.length > 0) && !sendMessageMutation.isPending) {
      setIsUserTyping(false); // User finished typing, allow auto-scroll
      sendMessageMutation.mutate({ 
        messageText: message.trim(), 
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined 
      });
    }
  };

  // Handle input focus/blur and typing to prevent unwanted scrolling
  const handleInputFocus = () => setIsUserTyping(true);
  const handleInputBlur = () => setIsUserTyping(false);
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsUserTyping(true);
    autoResizeTextarea();
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Max height of ~120px
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Auto-resize on message change
  useEffect(() => {
    autoResizeTextarea();
  }, [message]);

  // File upload handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'idea': return <Lightbulb className="h-3 w-3" />;
      case 'reflection': return <Brain className="h-3 w-3" />;
      case 'problem': return <Settings className="h-3 w-3" />;
      case 'solution': return <Settings className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  // Render markdown-style text formatting (bold, italic, etc.)
  const renderFormattedText = (text: string) => {
    // Handle **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    // Handle *italic* text
    const italicRegex = /\*(.*?)\*/g;
    
    let formatted = text;
    
    // Convert **bold** to JSX
    const parts = formatted.split(boldRegex);
    const elements: (string | JSX.Element)[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text, check for italics
        const italicParts = parts[i].split(italicRegex);
        for (let j = 0; j < italicParts.length; j++) {
          if (j % 2 === 0) {
            if (italicParts[j]) elements.push(italicParts[j]);
          } else {
            elements.push(<em key={`italic-${i}-${j}`}>{italicParts[j]}</em>);
          }
        }
      } else {
        // Bold text
        elements.push(<strong key={`bold-${i}`}>{parts[i]}</strong>);
      }
    }
    
    return elements.length > 0 ? elements : text;
  };

  if (!isExpanded) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800 dark:text-blue-200">Colby - AI Assistant</span>
              {memory?.relationships?.trustLevel && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Trust: {Math.round(memory.relationships.trustLevel * 100)}%
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(true)}
              data-testid="expand-chat"
            >
              💬 Chat
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            AI assistant with persistent memory. Click to chat and get autonomous help with tasks, research, and automation.
          </p>
          {insights.length > 0 && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Recent insights: {insights.slice(0, 2).map((insight: DiaryEntry) => insight.content.slice(0, 30)).join(', ')}...
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 flex flex-col h-[600px]">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={companyLogo} 
              alt="Emergent Intelligence Logo" 
              className="h-8 w-8 rounded-full object-cover shadow-sm border border-blue-300/30"
            />
            {memory?.relationships?.trustLevel && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Trust: {Math.round(memory.relationships.trustLevel * 100)}%
              </Badge>
            )}
          </div>
          <div className="flex gap-1 items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDiary(!showDiary)}
              data-testid="toggle-diary"
              className="h-8 w-8 p-0"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => generateIdeasMutation.mutate(`Session: ${sessionId}, Current tasks and projects`)}
              disabled={generateIdeasMutation.isPending}
              data-testid="generate-ideas"
              className="h-8 w-8 p-0"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.open('/code-analysis', '_blank')}
              data-testid="code-analysis"
              title="Open Code Analysis (GPT-5 powered)"
              className="h-8 w-8 p-0"
            >
              <Code className="h-4 w-4" />
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Dialog open={showHelp} onOpenChange={setShowHelp}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        data-testid="help-button"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        How to Use Colby
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Upload className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>File Upload:</strong> Upload screenshots, documents, or images. Colby can extract text, analyze content, and create tasks based on what's found.
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>Autonomous Actions:</strong> Colby can autonomously create tasks, research information, suggest automations, and learn from our interactions.
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Brain className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>Smart Assistance:</strong> Ask for help with project management, research, code analysis, or workflow automation. Colby has persistent memory and builds context over time.
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>
                <p>How to use Colby</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(false)}
              data-testid="collapse-chat"
              className="h-8 w-8 p-0 flex items-center justify-center"
            >
              ✕
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 p-4 gap-3 min-h-0">
        {/* Memory/Relationship Status */}
        {memory && memory.knowledgeBase.automationPatterns.length > 0 && (
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <div>⚡ Automation: {memory.knowledgeBase.automationPatterns.slice(0, 2).join(', ')}</div>
          </div>
        )}

        {showDiary && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
              <FileText className="h-4 w-4" />
              AI Memory & Insights
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Trust: {Math.round(trustLevel * 100)}%
              </Badge>
            </div>
            
            {/* User Preferences */}
            {userPreferences.length > 0 && (
              <div className="text-xs space-y-1">
                <div className="font-medium text-blue-700">Learned Preferences:</div>
                <div className="text-blue-600">
                  {userPreferences.slice(0, 3).join(' • ')}
                </div>
              </div>
            )}
            
            {/* Successful Patterns */}
            {successfulPatterns.length > 0 && (
              <div className="text-xs space-y-1">
                <div className="font-medium text-green-700">Successful Patterns:</div>
                <div className="text-green-600">
                  {successfulPatterns.slice(0, 2).join(' • ')}
                </div>
              </div>
            )}
            
            {/* Recent Insights */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {allInsights.slice(0, 5).map((entry: DiaryEntry) => (
                <div key={entry.id} className="text-xs p-2 bg-blue-100 dark:bg-blue-900 rounded">
                  <div className="flex items-center gap-1 mb-1">
                    {getTypeIcon(entry.type)}
                    <span className="font-medium">{entry.type}</span>
                    <span className="text-gray-500">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div>{entry.content}</div>
                  {entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {entry.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {allInsights.length === 0 && (
                <div className="text-xs text-gray-500 p-2">
                  No insights yet. Start chatting to build relationship memory.
                </div>
              )}
            </div>
            <Separator />
          </div>
        )}

        {/* Chat Messages - Scrollable area */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full w-full pr-2" ref={scrollAreaRef}>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center text-sm text-gray-500 py-8">Loading conversation...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">
                Start a conversation with your AI assistant
              </div>
            ) : (
              messages.map((msg: ChatMessage) => (
                <div key={msg.id} className={`p-3 rounded-lg shadow-sm ${
                  msg.role === 'assistant' 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 ml-2' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-2'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium">
                      {msg.role === 'assistant' ? '🤖 Colby' : '👤 You'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {renderFormattedText(msg.content)}
                  </div>
                  
                  {/* Copy button for assistant messages */}
                  {msg.role === 'assistant' && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="h-7 px-2 text-xs"
                        data-testid={`copy-message-${msg.id}`}
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Show actions taken */}
                  {msg.metadata?.actionsTaken && msg.metadata.actionsTaken.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-opacity-20 pt-2">
                      <div className="text-xs font-medium text-green-700 dark:text-green-300">Actions Taken:</div>
                      {msg.metadata.actionsTaken.map((action, idx) => (
                        <div key={idx} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          {action}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          </ScrollArea>
        </div>

        {/* File Upload Preview - Fixed position above input */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2 flex-shrink-0">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Files to upload:
            </div>
            <div className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-blue-100 dark:bg-blue-900 p-2 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>{file.name}</span>
                    <span className="text-gray-500">({Math.round(file.size / 1024)}KB)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input - Always visible at bottom */}
        <form onSubmit={handleSendMessage} className="flex-shrink-0 space-y-2 border-t border-blue-200 pt-3">
          {/* Full Width Text Area */}
          <div className="w-full">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Ask Colby to help with tasks, research, automation..."
              disabled={sendMessageMutation.isPending}
              className="w-full min-h-[64px] text-base px-4 py-3 resize-none rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 overflow-y-auto"
              data-testid="chat-input"
              rows={1}
            />
          </div>
          
          {/* Buttons Below Text Area */}
          <div className="flex flex-col gap-3">
            {/* Top Row: Action Buttons */}
            <div className="flex gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*,.pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                className="hidden"
              />
              <Button 
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={sendMessageMutation.isPending}
                data-testid="upload-file"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload File</span>
              </Button>

            </div>
            
            {/* Bottom Row: Send Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg"
                disabled={(!message.trim() && uploadedFiles.length === 0) || sendMessageMutation.isPending}
                data-testid="send-message"
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-2"
              >
                <Send className="h-4 w-4" />
                <span>Send Message</span>
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}