import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Send, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  agentId: string;
}

export default function DirectChatWidget({ agentId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message immediately
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Send to our backend which will process via GPT-5 and ElevenLabs
      const response = await fetch('/api/chat/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          agentId,
          sessionId: 'direct-chat-' + Date.now()
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || 'I received your message and will help you with that task.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);

        // If there's audio, play it
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.play().catch(console.error);
        }
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
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
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-50"
        data-testid="button-open-chat"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-24 w-80 h-96 shadow-xl z-50" data-testid="card-chat-widget">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="font-medium">AI Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700 p-1 h-auto"
            data-testid="button-close-chat"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="messages-container">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Start a conversation!</p>
              <p className="text-xs">Type your task or question below.</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
                data-testid={`message-${message.role}-${index}`}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 resize-none min-h-0 h-10"
              disabled={isLoading}
              data-testid="input-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-3 h-10"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}