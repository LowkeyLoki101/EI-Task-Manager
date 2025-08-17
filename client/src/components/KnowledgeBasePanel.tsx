import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, Plus, FileText, MessageSquare, Code, BookOpen, 
  Download, Upload, Database, TrendingUp, Clock, Tag
} from 'lucide-react';

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  type: 'task' | 'conversation' | 'document' | 'code' | 'research' | 'file' | 'workflow' | 'project';
  sessionId: string;
  metadata: {
    tags: string[];
    category: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: string;
    source?: string;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface KnowledgeBasePanelProps {
  sessionId?: string;
  payload?: any;
  onUpdate?: (data: any) => void;
}

const typeIcons = {
  task: FileText,
  conversation: MessageSquare,
  document: BookOpen,
  code: Code,
  research: Search,
  file: FileText,
  workflow: Database,
  project: BookOpen,
};

export function KnowledgeBasePanel({ sessionId, payload, onUpdate }: KnowledgeBasePanelProps) {
  // Use provided sessionId or fallback
  const effectiveSessionId = sessionId || 's_default';
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('[KnowledgeBasePanel] Rendering with sessionId:', effectiveSessionId);
  console.log('[KnowledgeBasePanel] Payload:', payload);

  // Fetch knowledge base entries
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/kb/search', effectiveSessionId, selectedType, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        sessionId: effectiveSessionId,
        query: searchQuery,
        type: selectedType === 'all' ? '' : selectedType
      });
      console.log('[KnowledgeBasePanel] Fetching with params:', params.toString());
      const response = await fetch(`/api/kb/search?${params}`);
      if (!response.ok) throw new Error('Failed to search knowledge base');
      const result = await response.json();
      console.log('[KnowledgeBasePanel] API response:', result);
      return { results: result.results || [] };
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/kb/statistics', effectiveSessionId],
    queryFn: async () => {
      const response = await fetch(`/api/kb/statistics?sessionId=${effectiveSessionId}`);
      if (!response.ok) throw new Error('Failed to get statistics');
      return response.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const entries = searchResults?.results || [];

  console.log('[KnowledgeBasePanel] Rendering state:', {
    isSearching,
    entriesCount: entries.length,
    searchResults,
    stats
  });

  // Fallback UI for debugging if data isn't loading
  if (isSearching && entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <Database className="h-8 w-8 mx-auto mb-2 text-blue-400 animate-pulse" />
          <p className="text-sm">Loading knowledge base...</p>
          <p className="text-xs text-gray-400">SessionId: {effectiveSessionId}</p>
        </div>
      </div>
    );
  }

  // Force display for debugging - always show SOMETHING
  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <div className="text-center space-y-2">
          <Database className="h-8 w-8 mx-auto mb-2 text-amber-400 animate-pulse" />
          <p className="text-sm font-medium">Knowledge Base Debug</p>
          <div className="text-xs text-gray-300 space-y-1">
            <p>SessionId: {effectiveSessionId}</p>
            <p>Loading: {isSearching ? 'Yes' : 'No'}</p>
            <p>Stats: {stats?.totalEntries || 'Loading...'} total entries</p>
            <p>Entries: {entries.length} found</p>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => window.open('/knowledge-base', '_blank')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm"
            >
              Open Full Page View
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white border border-amber-500/20">
      {/* Header */}
      <div className="flex-none p-4 border-b border-amber-500/20 bg-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Knowledge Base
            </h3>
            {stats && (
              <Badge variant="secondary" className="ml-2">
                {stats.totalEntries} entries
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/knowledge-base', '_blank')}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Full View
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="conversation">Conversations</option>
            <option value="research">Research</option>
            <option value="document">Documents</option>
            <option value="code">Code</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="flex-none p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalEntries}</div>
              <div className="text-xs text-slate-500">Total Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(stats.entriesByType || {}).length}
              </div>
              <div className="text-xs text-slate-500">Content Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(stats.entriesByTag || {}).length}
              </div>
              <div className="text-xs text-slate-500">Unique Tags</div>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isSearching ? (
            <div className="text-center py-8 text-slate-500">
              Searching knowledge base...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchQuery ? 'No entries found for your search.' : 'Knowledge base is growing as AI diary and research runs...'}
            </div>
          ) : (
            entries.map((entry: KnowledgeBaseEntry) => {
              const IconComponent = typeIcons[entry.type] || FileText;
              return (
                <Card 
                  key={entry.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-slate-500" />
                        <CardTitle className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {entry.title}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {entry.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {entry.content.slice(0, 150)}...
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        {entry.metadata.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {(() => {
                  const IconComponent = typeIcons[selectedEntry.type] || FileText;
                  return <IconComponent className="h-5 w-5 text-slate-500" />;
                })()}
                <DialogTitle>{selectedEntry.title}</DialogTitle>
                <Badge variant="outline">{selectedEntry.type}</Badge>
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Content</h4>
                  <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 p-3 rounded">
                    {selectedEntry.content}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Metadata</h4>
                    <div className="text-xs space-y-1">
                      <div><strong>Category:</strong> {selectedEntry.metadata.category}</div>
                      <div><strong>Source:</strong> {selectedEntry.metadata.source || 'N/A'}</div>
                      <div><strong>Created:</strong> {formatDate(selectedEntry.createdAt)}</div>
                      <div><strong>Version:</strong> {selectedEntry.version}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntry.metadata.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}