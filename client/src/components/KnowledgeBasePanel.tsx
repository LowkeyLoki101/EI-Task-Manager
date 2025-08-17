import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Search, FileText, MessageSquare, Code, BookOpen, Lightbulb, FolderOpen } from 'lucide-react';

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  sessionId: string;
  metadata: {
    tags: string[];
    category: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBasePanelProps {
  sessionId?: string;
}

const typeIcons = {
  task: FileText,
  conversation: MessageSquare,
  code: Code,
  research: BookOpen,
  document: FileText,
  idea: Lightbulb,
  project: FolderOpen,
};

export function KnowledgeBasePanel({ sessionId }: KnowledgeBasePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);

  // Use provided sessionId or generate one
  const effectiveSessionId = sessionId || 's_njlk7hja5y9';

  // Build query parameters
  const queryParams = new URLSearchParams({
    sessionId: effectiveSessionId,
    query: searchQuery || '',
    type: selectedType || '',
  }).toString();

  console.log('[KnowledgeBasePanel] Fetching with params:', queryParams);

  // Fetch search results
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/knowledge-base/search', effectiveSessionId, searchQuery, selectedType],
    queryFn: async () => {
      const response = await fetch(`/api/knowledge-base/search?${queryParams}`);
      if (!response.ok) throw new Error('Failed to search knowledge base');
      const data = await response.json();
      console.log('[KnowledgeBasePanel] Full API response:', JSON.stringify(data, null, 2));
      console.log('[KnowledgeBasePanel] Results array length:', data?.results?.length || 0);
      if (data?.results?.length > 0) {
        console.log('[KnowledgeBasePanel] First entry sample:', data.results[0]);
      }
      return data;
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
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
  });

  // Loading state
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

  // Main interface with data
  if (entries.length > 0) {
    return (
      <div className="h-full flex flex-col bg-slate-900 text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-semibold">Knowledge Base</h2>
          </div>
          <div className="text-xs text-slate-400">
            {entries.length} entries
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700">
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-2 mt-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1 bg-slate-800 text-white border border-slate-600 rounded text-sm"
            >
              <option value="all">All Types</option>
              <option value="task">Tasks</option>
              <option value="conversation">Conversations</option>
              <option value="document">Documents</option>
              <option value="code">Code</option>
              <option value="research">Research</option>
            </select>
          </div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {entries.map((entry: KnowledgeBaseEntry) => {
            const IconComponent = typeIcons[entry.type as keyof typeof typeIcons] || FileText;
            return (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <IconComponent className="h-4 w-4 mt-1 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{entry.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {entry.content.substring(0, 120)}...
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-blue-600 rounded text-white">
                        {entry.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(entry.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Entry Detail Modal */}
        {selectedEntry && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">{selectedEntry.title}</h2>
                  <p className="text-sm text-gray-400">{selectedEntry.type}</p>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-96">
                <pre className="whitespace-pre-wrap text-sm">{selectedEntry.content}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Empty state
  return (
    <div className="h-full flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No knowledge base entries found</p>
        <p className="text-xs text-gray-500 mt-2">Session: {effectiveSessionId}</p>
      </div>
    </div>
  );
}