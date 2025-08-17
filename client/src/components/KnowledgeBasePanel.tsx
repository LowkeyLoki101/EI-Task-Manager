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

// SIMPLIFIED: One pathway for everyone - human, AI, tools - all the same
export function KnowledgeBasePanel({ sessionId }: KnowledgeBasePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null);

  const effectiveSessionId = sessionId || 's_njlk7hja5y9';

  // Simple fetch - no complex conditions
  const { data: searchResults } = useQuery({
    queryKey: ['/api/knowledge-base/search', effectiveSessionId, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        sessionId: effectiveSessionId,
        query: searchQuery || '',
      });
      const response = await fetch(`/api/knowledge-base/search?${params}`);
      const data = await response.json();
      return data;
    },
    refetchInterval: 5000,
  });

  const entries = searchResults?.results || [];

  // SIMPLE RENDER - Always show the interface, just like Diary panel
  return (
    <div className="h-full p-4 bg-gradient-to-b from-slate-800/20 to-gray-900/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-amber-400" />
          <span className="text-amber-100 font-semibold">Knowledge Base</span>
          {entries.length > 0 && (
            <span className="text-xs px-2 py-1 bg-green-600/30 text-green-300 rounded">
              {entries.length} entries
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search knowledge..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700/50 text-amber-100 border border-amber-500/20 rounded-lg placeholder-amber-300/50 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      {/* Entries List - Simple and Always Visible */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-amber-300/60">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No entries yet</p>
          </div>
        ) : (
          entries.map((entry: KnowledgeBaseEntry) => {
            const Icon = typeIcons[entry.type as keyof typeof typeIcons] || FileText;
            return (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="p-3 bg-slate-700/30 border border-amber-500/20 rounded-lg hover:bg-slate-700/50 hover:border-amber-500/40 cursor-pointer transition-all"
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 mt-1 text-amber-400/80" />
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-amber-100">{entry.title}</h3>
                    <p className="text-xs text-amber-200/60 mt-1 line-clamp-2">
                      {entry.content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-600/30 rounded text-amber-300">
                        {entry.type}
                      </span>
                      <span className="text-xs text-amber-300/40">
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Entry Detail Modal - Simple Overlay */}
      {selectedEntry && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEntry(null)}
        >
          <div 
            className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex justify-between">
              <div>
                <h2 className="text-lg font-semibold text-amber-100">{selectedEntry.title}</h2>
                <p className="text-sm text-amber-300/60">{selectedEntry.type}</p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-amber-300/60 hover:text-amber-100"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap text-sm text-amber-100/80">
                {selectedEntry.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}