import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Clock, User, Bot } from 'lucide-react';

interface Transcript {
  id: string;
  agentId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  transcript?: string;
  conversationId: string;
  duration?: number;
  timestamp: string;
}

interface ConversationHistoryProps {
  sessionId: string;
}

export function ConversationHistory({ sessionId }: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSessions, setShowAllSessions] = useState(false);

  // Fetch transcripts for current session or all sessions
  const { data = [], isLoading } = useQuery({
    queryKey: ['/api/transcripts', showAllSessions ? null : sessionId],
    queryFn: async () => {
      const url = showAllSessions 
        ? '/api/transcripts' 
        : `/api/transcripts?sessionId=${sessionId}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.transcripts || [];
    },
    refetchInterval: 3000, // Refresh every 3 seconds
    refetchOnWindowFocus: true
  });

  // Ensure transcripts is always an array
  const transcripts = Array.isArray(data) ? data : [];

  // Filter transcripts based on search query
  const filteredTranscripts = transcripts.filter((transcript: Transcript) =>
    transcript.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transcript.transcript?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group transcripts by conversation or date
  const groupedTranscripts = filteredTranscripts.reduce((groups: any, transcript: Transcript) => {
    const date = new Date(transcript.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transcript);
    return groups;
  }, {});

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
      case 'agent':
        return <Bot className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'assistant':
      case 'agent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full" data-testid="conversation-history-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conversation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading conversations...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="conversation-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Conversation History
          <Badge variant="outline" className="ml-auto">
            {filteredTranscripts.length} conversations
          </Badge>
        </CardTitle>
        
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="search-conversations"
            />
          </div>
          <Button
            variant={showAllSessions ? "default" : "outline"}
            onClick={() => setShowAllSessions(!showAllSessions)}
            size="sm"
            data-testid="toggle-all-sessions"
          >
            {showAllSessions ? "This Session Only" : "All Sessions"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTranscripts.length === 0 ? (
          <div className="text-center py-8" data-testid="no-conversations">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-500">
              {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Start a voice conversation with the chat button to see transcripts here
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {Object.entries(groupedTranscripts).map(([date, transcripts]) => (
                <div key={date} className="space-y-2">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 border-b pb-1">
                    {date}
                  </div>
                  
                  {(transcripts as Transcript[]).map((transcript) => (
                    <div
                      key={transcript.id}
                      className="border rounded-lg p-3 space-y-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      data-testid={`transcript-${transcript.id}`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(transcript.role)}
                          <Badge 
                            variant="secondary" 
                            className={getRoleBadgeColor(transcript.role)}
                          >
                            {transcript.role}
                          </Badge>
                          {transcript.duration && (
                            <Badge variant="outline" className="text-xs">
                              {transcript.duration}s
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTime(transcript.timestamp)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="text-sm">
                        {transcript.content || transcript.transcript || 'No content'}
                      </div>

                      {/* Metadata */}
                      {showAllSessions && (
                        <div className="text-xs text-gray-400 border-t pt-2">
                          Session: {transcript.sessionId} • Conversation: {transcript.conversationId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}