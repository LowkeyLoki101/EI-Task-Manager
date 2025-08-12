import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Upload, Plus, FileText, MessageSquare, Code, BookOpen, Zap, BarChart3 } from "lucide-react";

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

interface KnowledgeBaseManagerProps {
  sessionId: string;
}

const typeIcons = {
  task: FileText,
  conversation: MessageSquare,
  document: BookOpen,
  code: Code,
  research: Search,
  file: FileText,
  workflow: Zap,
  project: BookOpen,
};

export function KnowledgeBaseManager({ sessionId }: KnowledgeBaseManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    type: "document" as KnowledgeBaseEntry['type'],
    tags: "",
    category: "",
    priority: "medium" as const
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search knowledge base
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['/api/knowledge-base/search', sessionId, searchQuery, selectedType],
    enabled: !!sessionId,
  });

  // Get statistics
  const { data: statistics } = useQuery({
    queryKey: ['/api/knowledge-base/statistics', sessionId],
    enabled: !!sessionId,
  });

  // Get available exports
  const { data: exports } = useQuery({
    queryKey: ['/api/knowledge-base/exports'],
  });

  // Add new entry mutation
  const addEntryMutation = useMutation({
    mutationFn: async (entry: any) => {
      const response = await fetch('/api/knowledge-base/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!response.ok) throw new Error('Failed to add entry');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Entry added to knowledge base",
      });
      setShowAddDialog(false);
      setNewEntry({
        title: "",
        content: "",
        type: "document",
        tags: "",
        category: "",
        priority: "medium"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/search'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/statistics'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive",
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async ({ description }: { description?: string }) => {
      const response = await fetch('/api/knowledge-base/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, description }),
      });
      if (!response.ok) throw new Error('Failed to export');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Export Complete",
        description: `Knowledge base exported as ${data.filename}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/exports'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to export knowledge base",
        variant: "destructive",
      });
    },
  });

  const handleAddEntry = () => {
    if (!newEntry.title || !newEntry.content) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    addEntryMutation.mutate({
      ...newEntry,
      sessionId,
      metadata: {
        tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
        category: newEntry.category || 'General',
        priority: newEntry.priority,
        source: 'manual'
      }
    });
  };

  const handleExport = () => {
    exportMutation.mutate({ description: `Knowledge base export - ${new Date().toLocaleDateString()}` });
  };

  const entries = searchResults?.results || [];
  const stats = statistics || {};

  return (
    <div className="space-y-6" data-testid="knowledge-base-manager">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Base</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Organize and search all your tasks, conversations, and documents
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-entry">
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Knowledge Base Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Entry title"
                    data-testid="input-entry-title"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newEntry.type}
                    onValueChange={(value: KnowledgeBaseEntry['type']) => 
                      setNewEntry(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-entry-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="conversation">Conversation</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={newEntry.category}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Development, Research, Personal"
                    data-testid="input-entry-category"
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={newEntry.tags}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="tag1, tag2, tag3"
                    data-testid="input-entry-tags"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newEntry.content}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter the content..."
                    className="min-h-[200px]"
                    data-testid="textarea-entry-content"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleAddEntry} 
                    disabled={addEntryMutation.isPending}
                    data-testid="button-save-entry"
                  >
                    {addEntryMutation.isPending ? 'Adding...' : 'Add Entry'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleExport} disabled={exportMutation.isPending} data-testid="button-export-kb">
            <Download className="w-4 h-4 mr-2" />
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats.totalEntries !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEntries}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.entriesByCategory || {}).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.entriesByTag || {}).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.entriesByType || {}).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Search Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-query"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48" data-testid="select-search-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="conversation">Conversations</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="workflow">Workflows</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="space-y-4">
        {searchLoading && (
          <div className="text-center py-8">
            <div className="text-gray-500">Searching knowledge base...</div>
          </div>
        )}
        
        {entries.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} found
            </h3>
            {entries.map((entry: KnowledgeBaseEntry) => {
              const IconComponent = typeIcons[entry.type];
              return (
                <Card key={entry.id} data-testid={`entry-${entry.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <IconComponent className="w-5 h-5 mt-1 text-gray-500" />
                        <div>
                          <CardTitle className="text-lg">{entry.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {entry.metadata.category} • {new Date(entry.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">{entry.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                      {entry.content}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entry.metadata.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        {!searchLoading && entries.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <div className="text-gray-500">No entries found for "{searchQuery}"</div>
          </div>
        )}
        
        {!searchLoading && entries.length === 0 && !searchQuery && (
          <div className="text-center py-8">
            <div className="text-gray-500">
              No entries yet. Add your first entry or let the system automatically capture tasks and conversations.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeBaseManager;