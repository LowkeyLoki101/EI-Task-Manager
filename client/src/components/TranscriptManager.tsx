import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, Search, Mic, Volume2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Transcript {
  id: string;
  sessionId: string;
  speaker: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface TranscriptManagerProps {
  sessionId: string;
}

export default function TranscriptManager({ sessionId }: TranscriptManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTranscript, setEditingTranscript] = useState<Transcript | null>(null);
  const queryClient = useQueryClient();
  
  const { data: transcriptsResponse = { transcripts: [] }, isLoading } = useQuery({
    queryKey: ['/api/transcripts', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/transcripts?sessionId=${sessionId}`);
      return response.json();
    },
    refetchInterval: 3000,
    enabled: !!sessionId
  });

  // Extract transcripts array from response
  const transcripts = transcriptsResponse.transcripts || transcriptsResponse || [];
  
  // Filter transcripts based on search
  const filteredTranscripts = transcripts.filter((transcript: Transcript) => {
    if (!searchQuery.trim()) return true;
    return transcript.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
           transcript.speaker.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Transcript mutations
  const updateTranscriptMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transcript> }) => {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transcripts', sessionId] });
    }
  });

  const deleteTranscriptMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transcripts', sessionId] });
    }
  });

  const handleEditTranscript = (transcript: Transcript) => {
    setEditingTranscript(transcript);
  };

  const handleUpdateTranscript = (updates: Partial<Transcript>) => {
    if (editingTranscript) {
      updateTranscriptMutation.mutate({ id: editingTranscript.id, updates });
      setEditingTranscript(null);
    }
  };

  const handleDeleteTranscript = (transcriptId: string) => {
    if (confirm('Are you sure you want to delete this transcript?')) {
      deleteTranscriptMutation.mutate(transcriptId);
    }
  };

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSpeakerIcon = (speaker: string) => {
    if (speaker.toLowerCase().includes('user')) {
      return <Mic className="h-4 w-4 text-blue-500" />;
    }
    return <Volume2 className="h-4 w-4 text-green-500" />;
  };

  if (isLoading) {
    return <div className="p-4">Loading transcripts...</div>;
  }

  return (
    <div className="space-y-4" data-testid="transcript-manager">
      {/* Header with search */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Voice Transcripts</h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              data-testid="search-transcripts"
            />
          </div>
        </div>
      </div>

      {/* Transcript List */}
      <ScrollArea className="h-96 w-full">
        <div className="space-y-2">
          {filteredTranscripts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                {searchQuery 
                  ? `No transcripts found matching "${searchQuery}"` 
                  : "No voice transcripts yet. Start a conversation with ElevenLabs to see transcripts here."}
              </CardContent>
            </Card>
          ) : (
            filteredTranscripts.map((transcript: Transcript) => (
              <Card key={transcript.id} className="hover:shadow-md transition-shadow" data-testid={`transcript-card-${transcript.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-1">
                        {getSpeakerIcon(transcript.speaker)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            {transcript.speaker}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTime(transcript.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {transcript.content}
                        </p>
                        
                        {transcript.metadata && (
                          <div className="mt-2 text-xs text-gray-500">
                            {transcript.metadata.duration && `Duration: ${transcript.metadata.duration}s`}
                            {transcript.metadata.confidence && ` | Confidence: ${Math.round(transcript.metadata.confidence * 100)}%`}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTranscript(transcript)}
                        data-testid={`transcript-edit-${transcript.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTranscript(transcript.id)}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`transcript-delete-${transcript.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Edit Transcript Dialog */}
      {editingTranscript && (
        <Dialog open={!!editingTranscript} onOpenChange={() => setEditingTranscript(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transcript</DialogTitle>
            </DialogHeader>
            <EditTranscriptForm
              transcript={editingTranscript}
              onSubmit={handleUpdateTranscript}
              onCancel={() => setEditingTranscript(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Edit Transcript Form Component
function EditTranscriptForm({ transcript, onSubmit, onCancel }: { 
  transcript: Transcript; 
  onSubmit: (updates: Partial<Transcript>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    speaker: transcript.speaker,
    content: transcript.content
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-speaker">Speaker</Label>
        <Input
          id="edit-speaker"
          value={formData.speaker}
          onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
          required
          data-testid="edit-transcript-speaker"
        />
      </div>
      
      <div>
        <Label htmlFor="edit-content">Content</Label>
        <Textarea
          id="edit-content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          required
          className="min-h-[120px]"
          data-testid="edit-transcript-content"
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="edit-transcript-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="edit-transcript-submit">
          Update Transcript
        </Button>
      </div>
    </form>
  );
}