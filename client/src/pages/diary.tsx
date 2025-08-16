import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSessionId } from '@/hooks/useSessionId';
import { apiRequest } from '@/lib/queryClient';
import { BookOpen, Brain, Search, Plus, TrendingUp, Clock, Target, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedDiaryEntry {
  id: string;
  timestamp: string;
  title: string;
  content: string;
  mode: 'directive' | 'exploratory' | 'reflective' | 'casual';
  type: 'active' | 'passive';
  tags: string[];
  sessionId: string;
  autonomyDecision: {
    shouldWrite: boolean;
    reason: string;
    noveltyScore?: number;
    relevanceScore?: number;
  };
  metadata: Record<string, any>;
}

interface DiaryStats {
  total: {
    enhanced: number;
    legacy: number;
  };
  recent: {
    thisWeek: number;
    thisMonth: number;
  };
  distribution: {
    modes: Record<string, number>;
    types: Record<string, number>;
  };
  autonomy: {
    config: {
      minIntervalSeconds: number;
      maxPerHour: number;
      noveltyThreshold: number;
      relevanceThreshold: number;
    };
    recentEntriesCount: number;
    entriesLastHour: number;
    lastAutonomousEntry: string | null;
    totalEnhancedEntries: number;
    totalLegacyEntries: number;
  };
}

export default function DiaryPage() {
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('');

  // Fetch enhanced diary entries
  const { data: diaryData, isLoading } = useQuery({
    queryKey: ['/api/diary/enhanced', sessionId],
    enabled: !!sessionId,
  });

  // Fetch diary statistics
  const { data: statsData } = useQuery({
    queryKey: ['/api/diary/stats'],
  });

  // Search diary entries
  const { data: searchResults, refetch: searchDiary } = useQuery({
    queryKey: ['/api/diary/search', searchQuery],
    enabled: false,
  });

  // Create manual diary entry
  const createEntryMutation = useMutation({
    mutationFn: async (data: { sessionId: string; mode?: string }) => {
      return await apiRequest('/api/diary/manual', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/stats'] });
    },
  });

  const entries: EnhancedDiaryEntry[] = (diaryData as any)?.entries || [];
  const stats: DiaryStats | undefined = (statsData as any)?.stats;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchDiary();
    }
  };

  const handleCreateEntry = () => {
    if (!sessionId) return;
    createEntryMutation.mutate({
      sessionId,
      mode: selectedMode || undefined,
    });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'directive': return <Target className="w-4 h-4" />;
      case 'exploratory': return <Eye className="w-4 h-4" />;
      case 'reflective': return <Brain className="w-4 h-4" />;
      case 'casual': return <BookOpen className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'directive': return 'bg-blue-100 text-blue-800';
      case 'exploratory': return 'bg-green-100 text-green-800';
      case 'reflective': return 'bg-purple-100 text-purple-800';
      case 'casual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            AI Diary System
          </h1>
          <p className="text-gray-600 mt-1">
            Autonomous reflections and insights with contextual awareness
          </p>
        </div>
        
        <Button
          onClick={handleCreateEntry}
          disabled={!sessionId || createEntryMutation.isPending}
          data-testid="button-create-entry"
        >
          <Plus className="w-4 h-4 mr-2" />
          {createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
        </Button>
      </div>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries">Recent Entries</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={selectedMode} onValueChange={setSelectedMode}>
              <SelectTrigger className="w-48" data-testid="select-mode">
                <SelectValue placeholder="Filter by mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All modes</SelectItem>
                <SelectItem value="directive">Directive</SelectItem>
                <SelectItem value="exploratory">Exploratory</SelectItem>
                <SelectItem value="reflective">Reflective</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {entries
              .filter(entry => !selectedMode || entry.mode === selectedMode)
              .map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow" data-testid={`card-entry-${entry.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getModeIcon(entry.mode)}
                        <CardTitle className="text-lg">{entry.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getModeColor(entry.mode)}>
                          {entry.mode}
                        </Badge>
                        <Badge variant="secondary">
                          {entry.type}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-3" data-testid={`text-content-${entry.id}`}>
                      {entry.content}
                    </p>
                    
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {entry.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {entry.autonomyDecision.noveltyScore !== undefined && (
                      <div className="text-xs text-gray-500 border-t pt-2">
                        <span className="font-medium">Autonomy:</span> {entry.autonomyDecision.reason}
                        {entry.autonomyDecision.noveltyScore !== undefined && (
                          <span className="ml-2">
                            Novelty: {(entry.autonomyDecision.noveltyScore * 100).toFixed(1)}%
                          </span>
                        )}
                        {entry.autonomyDecision.relevanceScore !== undefined && (
                          <span className="ml-2">
                            Relevance: {(entry.autonomyDecision.relevanceScore * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

            {entries.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No diary entries yet</h3>
                  <p className="text-gray-500 mb-4">
                    The AI will automatically create diary entries based on system activity and context.
                  </p>
                  <Button onClick={handleCreateEntry} disabled={!sessionId}>
                    Create First Entry
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search diary entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              data-testid="input-search"
            />
            <Button type="submit" disabled={!searchQuery.trim()}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>

          {(searchResults as any)?.entries && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Found {(searchResults as any).entries.length} entries for "{(searchResults as any).query}"
              </p>
              {(searchResults as any).entries.map((entry: EnhancedDiaryEntry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{entry.title}</CardTitle>
                      <Badge variant="outline" className={getModeColor(entry.mode)}>
                        {entry.mode}
                      </Badge>
                    </div>
                    <CardDescription>
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{entry.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Entries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total.enhanced}</div>
                    <p className="text-xs text-gray-500">Enhanced diary entries</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.recent.thisWeek}</div>
                    <p className="text-xs text-gray-500">New entries</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Rate Limit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.autonomy.entriesLastHour}/{stats.autonomy.config.maxPerHour}
                    </div>
                    <p className="text-xs text-gray-500">Entries this hour</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Last Entry</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-bold">
                      {stats.autonomy.lastAutonomousEntry 
                        ? formatDistanceToNow(new Date(stats.autonomy.lastAutonomousEntry), { addSuffix: true })
                        : 'Never'
                      }
                    </div>
                    <p className="text-xs text-gray-500">Autonomous generation</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Mode Distribution</CardTitle>
                    <CardDescription>How entries are categorized by thinking mode</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.distribution.modes).map(([mode, count]) => (
                        <div key={mode} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {getModeIcon(mode)}
                            <span className="capitalize">{mode}</span>
                          </div>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Autonomy Settings</CardTitle>
                    <CardDescription>Current autonomous writing configuration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>Min Interval:</span>
                        <span>{Math.round(stats.autonomy.config.minIntervalSeconds / 60)} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max per Hour:</span>
                        <span>{stats.autonomy.config.maxPerHour} entries</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Novelty Threshold:</span>
                        <span>{(stats.autonomy.config.noveltyThreshold * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Relevance Threshold:</span>
                        <span>{(stats.autonomy.config.relevanceThreshold * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}