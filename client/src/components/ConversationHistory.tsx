import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

interface ConversationHistoryProps {
  sessionId: string;
}

export default function ConversationHistory({ sessionId }: ConversationHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/conversations', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/conversations?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 3000,
    enabled: !!sessionId
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900">Conversation</h2>
      </div>
      
      <div 
        ref={scrollRef}
        className="h-96 overflow-y-auto conversation-scroll p-4 space-y-4"
        data-testid="conversation-history"
      >
        {isLoading && (
          <div className="text-center text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">Loading conversation...</p>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Start a conversation to see messages here</p>
          </div>
        )}

        {messages.map((message: any, index: number) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${message.role}-${index}`}
          >
            <div 
              className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                message.role === 'user' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              <p className="text-sm" data-testid="message-content">{message.content}</p>
              <span 
                className={`text-xs mt-1 block ${
                  message.role === 'user' ? 'opacity-75' : 'text-slate-500'
                }`}
                data-testid="message-timestamp"
              >
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>Ready for input...</span>
        </div>
      </div>
    </div>
  );
}
