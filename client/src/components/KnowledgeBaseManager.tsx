import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Search, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

declare global {
  interface FormData {
    append(name: string, value: string | Blob, fileName?: string): void;
  }
}

interface KnowledgeBaseDocument {
  id: string;
  sessionId: string;
  projectId?: string;
  title: string;
  content: string;
  format: 'text' | 'pdf' | 'docx' | 'html' | 'epub';
  source: 'gpt5' | 'user_upload' | 'manual_entry';
  elevenlabsDocId?: string;
  synced: boolean;
  tags: string[];
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface SyncStatus {
  total: number;
  synced: number;
  pending: number;
  failed: number;
}

interface KnowledgeBaseManagerProps {
  sessionId: string;
  projectId?: string;
}

export function KnowledgeBaseManager({ sessionId, projectId }: KnowledgeBaseManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocTags, setNewDocTags] = useState('');

  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<KnowledgeBaseDocument[]>({
    queryKey: ['/api/knowledge-base/documents', sessionId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ sessionId });
      if (projectId) params.append('projectId', projectId);
      const response = await fetch(`/api/knowledge-base/documents?${params}`);
      const data = await response.json();
      return data.documents || [];
    }
  });

  // Fetch sync status
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/knowledge-base/sync-status', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/knowledge-base/sync-status/${sessionId}`);
      return response.json();
    }
  });

  // Search documents
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<KnowledgeBaseDocument[]>({
    queryKey: ['/api/knowledge-base/search', sessionId, searchQuery, projectId],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const params = new URLSearchParams({ sessionId, query: searchQuery });
      if (projectId) params.append('projectId', projectId);
      const response = await fetch(`/api/knowledge-base/search?${params}`);
      const data = await response.json();
      return data.documents || [];
    },
    enabled: searchQuery.trim().length > 0
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/sync-status'] });
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      setNewDocTitle('');
    }
  });

  // Add text document mutation
  const addTextMutation = useMutation({
    mutationFn: async (data: { sessionId: string; title: string; content: string; projectId?: string; tags: string[] }) => {
      const response = await fetch('/api/knowledge-base/add-text', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/sync-status'] });
      setIsTextDialogOpen(false);
      setNewDocTitle('');
      setNewDocContent('');
      setNewDocTags('');
    }
  });

  // Retry sync mutation
  const retrySyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/knowledge-base/retry-sync', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/sync-status'] });
    }
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/knowledge-base/documents/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-base/sync-status'] });
    }
  });

  const handleFileUpload = () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('sessionId', sessionId);
    formData.append('title', newDocTitle || uploadFile.name);
    if (projectId) formData.append('projectId', projectId);

    uploadFileMutation.mutate(formData);
  };

  const handleTextSubmit = () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    const tags = newDocTags.split(',').map(tag => tag.trim()).filter(Boolean);

    addTextMutation.mutate({
      sessionId,
      title: newDocTitle,
      content: newDocContent,
      projectId,
      tags
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSyncStatusIcon = (doc: KnowledgeBaseDocument) => {
    if (doc.synced) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (doc.elevenlabsDocId && !doc.synced) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const displayDocuments = searchQuery.trim() ? searchResults : documents;

  return (
    <div className="space-y-6" data-testid="knowledge-base-manager">
      {/* Header and Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shared Knowledge Base</h2>
          <p className="text-gray-600">Documents accessible by GPT-5, users, and ElevenLabs agents</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-document">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document to Knowledge Base</DialogTitle>
                <DialogDescription>
                  Upload PDF, TXT, DOCX, HTML, or EPUB files. Documents will be synced with ElevenLabs.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.txt,.docx,.html,.epub"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    data-testid="input-file-upload"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="Auto-filled from filename"
                    data-testid="input-document-title"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleFileUpload} 
                    disabled={!uploadFile || uploadFileMutation.isPending}
                    data-testid="button-submit-upload"
                  >
                    {uploadFileMutation.isPending ? 'Uploading...' : 'Upload & Sync'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-text">
                <FileText className="w-4 h-4 mr-2" />
                Add Text
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Text Document</DialogTitle>
                <DialogDescription>
                  Create a text document that will be added to the shared knowledge base.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="doc-title">Title</Label>
                  <Input
                    id="doc-title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="Document title"
                    data-testid="input-text-title"
                  />
                </div>
                <div>
                  <Label htmlFor="doc-content">Content</Label>
                  <Textarea
                    id="doc-content"
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    placeholder="Document content"
                    rows={8}
                    data-testid="textarea-content"
                  />
                </div>
                <div>
                  <Label htmlFor="doc-tags">Tags (comma-separated)</Label>
                  <Input
                    id="doc-tags"
                    value={newDocTags}
                    onChange={(e) => setNewDocTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    data-testid="input-tags"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsTextDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleTextSubmit} 
                    disabled={!newDocTitle.trim() || !newDocContent.trim() || addTextMutation.isPending}
                    data-testid="button-submit-text"
                  >
                    {addTextMutation.isPending ? 'Adding...' : 'Add to Knowledge Base'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">ElevenLabs Sync Status</CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => retrySyncMutation.mutate()}
                disabled={retrySyncMutation.isPending}
                data-testid="button-retry-sync"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {retrySyncMutation.isPending ? 'Syncing...' : 'Retry Failed'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sync Progress</span>
                <span>{syncStatus.synced}/{syncStatus.total} documents</span>
              </div>
              <Progress 
                value={(syncStatus.synced / Math.max(syncStatus.total, 1)) * 100} 
                className="h-2"
              />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{syncStatus.synced} Synced</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span>{syncStatus.pending} Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>{syncStatus.failed} Failed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        {searchQuery && (
          <Button variant="outline" onClick={() => setSearchQuery('')}>
            Clear
          </Button>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {documentsLoading || searchLoading ? (
          <div className="text-center py-8">Loading documents...</div>
        ) : displayDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No documents found matching your search.' : 'No documents in knowledge base yet.'}
          </div>
        ) : (
          displayDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      {getSyncStatusIcon(doc)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <Badge variant="outline">{doc.format.toUpperCase()}</Badge>
                      <Badge variant="secondary">{doc.source.replace('_', ' ')}</Badge>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${doc.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-3 line-clamp-3">
                  {doc.metadata?.summary || doc.content.slice(0, 200) + '...'}
                </p>
                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}