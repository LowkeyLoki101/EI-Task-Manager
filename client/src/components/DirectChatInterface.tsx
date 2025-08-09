import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Send, Bot, User, FileText, X } from 'lucide-react';
import { useSessionId } from '@/hooks/useSessionId';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

export function DirectChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useSessionId();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newFile: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          content: content
        };
        setUploadedFiles(prev => [...prev, newFile]);
      };
      reader.readAsText(file);
    }
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;
    if (!sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      // Prepare message content with file context
      let messageWithFiles = inputMessage.trim();
      if (uploadedFiles.length > 0) {
        messageWithFiles += '\n\n[UPLOADED FILES]:';
        uploadedFiles.forEach(file => {
          messageWithFiles += `\n\nFile: ${file.name} (${file.type})\n${file.content}`;
        });
      }

      const response = await fetch('/api/chat/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageWithFiles,
          sessionId,
          hasFiles: uploadedFiles.length > 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || 'I received your message.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show task creation feedback if tasks were created
      if (result.tasksCreated > 0) {
        const taskFeedback: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ Created ${result.tasksCreated} task(s): ${result.tasks.map((t: any) => t.title).join(', ')}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, taskFeedback]);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-full" data-testid="direct-chat-interface">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-blue-600" />
          Direct Chat with GPT-5
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea className="h-64 w-full border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Start a conversation with GPT-5</p>
              <p className="text-sm">Upload documents and create tasks directly</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
              data-testid={`message-${message.role}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-white'
              }`}>
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`flex-1 max-w-[80%] ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}>
                <div className={`inline-block p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 border'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-400">
                      <div className="flex items-center gap-1 text-xs opacity-75">
                        <FileText className="w-3 h-3" />
                        {message.files.length} file(s) uploaded
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="bg-white dark:bg-gray-800 border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                    <span className="text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* File Upload Area */}
        {uploadedFiles.length > 0 && (
          <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Files to upload ({uploadedFiles.length})
              </span>
            </div>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)}KB)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    data-testid={`remove-file-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask GPT-5 anything, create tasks, or upload documents..."
              className="min-h-[80px] resize-none"
              disabled={isLoading}
              data-testid="chat-input"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              data-testid="upload-button"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={sendMessage}
              disabled={isLoading || (!inputMessage.trim() && uploadedFiles.length === 0)}
              data-testid="send-button"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.json,.csv,.xml,.html,.js,.ts,.py,.java,.cpp,.c,.h,.css,.sql,.log,.yaml,.yml"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          data-testid="file-input"
        />

        <div className="text-xs text-gray-500 text-center">
          Powered by GPT-5 • Upload documents up to 10MB • Creates tasks automatically
        </div>
      </CardContent>
    </Card>
  );
}