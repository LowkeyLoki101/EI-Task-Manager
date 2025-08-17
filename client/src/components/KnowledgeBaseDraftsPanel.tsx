// Knowledge Base Drafts Panel - Content Approval Workflow
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Download, FileText, Clock } from "lucide-react";

interface KnowledgeDraft {
  id: string;
  topic: string;
  content: string;
  contentType: string;
  status: string;
  approvalStatus: string;
  platforms: string[];
  createdAt: string;
  tags: string[];
}

export function KnowledgeBaseDraftsPanel({ sessionId }: { sessionId: string }) {
  const [drafts, setDrafts] = useState<KnowledgeDraft[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/content-workflow/drafts/${sessionId}`);
      const data = await response.json();
      setDrafts(data.drafts || []);
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveDraft = async (entryId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/content-workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          action,
          approvedBy: 'human'
        })
      });

      if (response.ok) {
        fetchDrafts(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to approve draft:', error);
    }
  };

  const downloadDraft = async (entryId: string, format: string = 'markdown') => {
    try {
      const response = await fetch(`/api/content-workflow/download/${entryId}?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge-draft.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download draft:', error);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [sessionId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Knowledge Base Drafts</h3>
        <Button 
          onClick={fetchDrafts} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          {loading ? <Clock className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {drafts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No knowledge base drafts found</p>
              <p className="text-sm mt-2">Create content to see drafts here</p>
            </div>
          ) : (
            drafts.map((draft) => (
              <Card key={draft.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{draft.topic}</CardTitle>
                    <Badge className={getStatusColor(draft.approvalStatus)}>
                      {draft.approvalStatus}
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{draft.contentType}</Badge>
                    {draft.platforms?.map((platform) => (
                      <Badge key={platform} variant="secondary" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {draft.content.substring(0, 200)}...
                  </p>
                  
                  <div className="flex gap-2 justify-between items-center">
                    <div className="flex gap-2">
                      {draft.approvalStatus === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveDraft(draft.id, 'approve')}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveDraft(draft.id, 'reject')}
                            className="flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadDraft(draft.id)}
                      className="flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                    Created: {new Date(draft.createdAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}