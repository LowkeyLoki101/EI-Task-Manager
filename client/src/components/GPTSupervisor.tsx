import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Send, FileText, MessageSquare, Brain } from 'lucide-react';

interface GPTSupervisorProps {
  sessionId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'analysis' | 'suggestion' | 'chat';
}

export default function GPTSupervisor({ sessionId }: GPTSupervisorProps) {
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isActive, setIsActive] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Chat messages for direct communication with GPT-5
  const { data: chatMessages = [], isLoading: isChatLoading } = useQuery({
    queryKey: ['/api/gpt-supervisor/chat', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/gpt-supervisor/chat?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 2000,
    enabled: !!sessionId
  });

  // Get analysis and insights from GPT-5
  const { data: analysis, isLoading: isAnalysisLoading } = useQuery({
    queryKey: ['/api/gpt-supervisor/analysis', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/gpt-supervisor/analysis?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 8000, // Check for updates every 8 seconds as mentioned in the requirements
    enabled: isActive && !!sessionId
  });

  // Send message to GPT-5
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, files }: { message: string; files?: File[] }) => {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('message', message);
      
      if (files) {
        files.forEach((file, index) => {
          formData.append(`file${index}`, file);
        });
      }

      const response = await fetch('/api/gpt-supervisor/chat', {
        method: 'POST',
        body: formData
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gpt-supervisor/chat', sessionId] });
      setMessage('');
      setUploadedFiles([]);
    }
  });

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  // Send message handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || uploadedFiles.length > 0) {
      sendMessageMutation.mutate({ 
        message: message.trim(), 
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined 
      });
    }
  };

  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Format timestamp
  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4" data-testid="gpt-supervisor">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">GPT-5 Supervisor</h3>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Paused"}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsActive(!isActive)}
          data-testid="supervisor-toggle"
        >
          {isActive ? "Pause" : "Activate"} Monitoring
        </Button>
      </div>

      {/* Analysis Panel */}
      {isActive && analysis && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Analysis & Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isAnalysisLoading ? (
              <div className="text-sm text-gray-500">Analyzing your activity...</div>
            ) : (
              <div className="space-y-2">
                {analysis.suggestions && (
                  <div>
                    <div className="text-xs font-medium text-blue-700 mb-1">Suggestions:</div>
                    <div className="text-sm text-blue-800">{analysis.suggestions}</div>
                  </div>
                )}
                {analysis.patterns && (
                  <div>
                    <div className="text-xs font-medium text-blue-700 mb-1">Patterns Detected:</div>
                    <div className="text-sm text-blue-800">{analysis.patterns}</div>
                  </div>
                )}
                {analysis.nextActions && (
                  <div>
                    <div className="text-xs font-medium text-blue-700 mb-1">Recommended Next Actions:</div>
                    <div className="text-sm text-blue-800">{analysis.nextActions}</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Chat Interface */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Direct Chat with GPT-5</CardTitle>
          <p className="text-xs text-gray-500">
            Chat directly with GPT-5, upload files, and get assistance with your tasks
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chat Messages */}
          <ScrollArea className="h-64 w-full border rounded-lg p-3" data-testid="chat-messages">
            {isChatLoading ? (
              <div className="text-center text-gray-500 py-4">Loading chat...</div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No messages yet. Start a conversation with GPT-5!
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg: ChatMessage) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`chat-message-${msg.id}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : msg.role === 'system'
                          ? 'bg-gray-100 text-gray-700 border'
                          : 'bg-gray-50 text-gray-900 border'
                      }`}
                    >
                      {msg.type && (
                        <div className="text-xs opacity-75 mb-1">
                          {msg.type === 'analysis' && '🔍 Analysis'}
                          {msg.type === 'suggestion' && '💡 Suggestion'}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* File Upload Area */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Uploaded Files:</div>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {file.name}
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-1 text-red-500 hover:text-red-700"
                      data-testid={`remove-file-${index}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask GPT-5 anything, request analysis, or get help with your tasks..."
                className="flex-1 min-h-[60px]"
                data-testid="chat-input"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-file-button"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!message.trim() && uploadedFiles.length === 0}
                  data-testid="send-message-button"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf,.doc,.docx,.json,.csv,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
            data-testid="file-input"
          />
        </CardContent>
      </Card>
    </div>
  );
}