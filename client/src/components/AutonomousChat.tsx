import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, Brain, Clock, FileText, Calendar, Settings, Lightbulb, Upload, X } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Get diary/memory data
  const { data: diaryData } = useQuery({
    queryKey: ['/api/diary'],
    queryFn: async () => {
      const response = await fetch('/api/diary');
      return response.json();
    },
    enabled: showDiary
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
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
    }
  });

  const messages = conversationData?.messages || [];
  const memory = conversationData?.memory;
  const recentIdeas = diaryData?.memory?.diary?.filter((entry: DiaryEntry) => entry.type === 'idea').slice(0, 3) || [];

  // Auto-scroll to bottom with improved behavior
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure the message is rendered before scrolling
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || uploadedFiles.length > 0) && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate({ 
        messageText: message.trim(), 
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined 
      });
    }
  };

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
          {recentIdeas.length > 0 && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Recent ideas: {recentIdeas.map((idea: DiaryEntry) => idea.content.slice(0, 30)).join(', ')}...
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 dark:text-blue-200">Colby - Autonomous AI Assistant</span>
            {memory?.relationships?.trustLevel && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Trust: {Math.round(memory.relationships.trustLevel * 100)}%
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDiary(!showDiary)}
              data-testid="toggle-diary"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => generateIdeasMutation.mutate(`Session: ${sessionId}, Current tasks and projects`)}
              disabled={generateIdeasMutation.isPending}
              data-testid="generate-ideas"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(false)}
              data-testid="collapse-chat"
            >
              ✕
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Memory/Relationship Status */}
        {memory && (
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <div>💭 Communication: {memory.personalityProfile.communicationStyle}</div>
            <div>🧠 Skills: {memory.knowledgeBase.technicalSkills.slice(0, 3).join(', ')}</div>
            {memory.knowledgeBase.automationPatterns.length > 0 && (
              <div>⚡ Automation: {memory.knowledgeBase.automationPatterns.slice(0, 2).join(', ')}</div>
            )}
          </div>
        )}

        {showDiary && diaryData && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
              <FileText className="h-4 w-4" />
              Recent Insights
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {diaryData.memory.diary.slice(0, 5).map((entry: DiaryEntry) => (
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
            </div>
            <Separator />
          </div>
        )}

        {/* Chat Messages */}
        <ScrollArea className="h-96 w-full pr-4">
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

        {/* File Upload Preview */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
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

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Colby to help with tasks, research, automation..."
              disabled={sendMessageMutation.isPending}
              className="flex-1"
              data-testid="chat-input"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,.pdf,.txt,.doc,.docx"
              className="hidden"
            />
            <Button 
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMessageMutation.isPending}
              data-testid="upload-file"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button 
              type="submit" 
              disabled={(!message.trim() && uploadedFiles.length === 0) || sendMessageMutation.isPending}
              data-testid="send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            💡 Upload screenshots, documents, or images. Colby can extract text, analyze content, and create tasks based on what's found.
          </div>
        </form>

        <div className="text-xs text-blue-600 dark:text-blue-400">
          💡 Colby can autonomously create tasks, research information, suggest automations, and learn from our interactions.
        </div>
      </CardContent>
    </Card>
  );
}