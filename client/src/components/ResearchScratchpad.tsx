import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, FileText, Search, Lightbulb, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResearchResult {
  id: string;
  query: string;
  summary: string;
  insights: string[];
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
  }>;
  timestamp: Date;
}

interface GeneratedContent {
  id: string;
  type: 'docs' | 'flyer' | 'analysis' | 'report';
  title: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface ResearchScratchpadProps {
  sessionId: string;
  isVisible: boolean;
}

export function ResearchScratchpad({ sessionId, isVisible }: ResearchScratchpadProps) {
  const [researchResults, setResearchResults] = useState<ResearchResult[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Poll for new research results and generated content
  useEffect(() => {
    if (!sessionId || !isVisible) return;

    const pollInterval = setInterval(async () => {
      try {
        // Fetch latest AI workstation actions
        const response = await fetch(`/api/workstation/results/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          
          // Update research results
          if (data.researchResults?.length > 0) {
            setResearchResults(prev => {
              const newResults = data.researchResults.filter((result: ResearchResult) => 
                !prev.some(existing => existing.id === result.id)
              );
              if (newResults.length > 0) {
                setIsExpanded(true); // Auto-expand when new content arrives
                return [...prev, ...newResults].slice(-10); // Keep latest 10
              }
              return prev;
            });
          }
          
          // Update generated content
          if (data.generatedContent?.length > 0) {
            setGeneratedContent(prev => {
              const newContent = data.generatedContent.filter((content: GeneratedContent) => 
                !prev.some(existing => existing.id === content.id)
              );
              if (newContent.length > 0) {
                setIsExpanded(true); // Auto-expand when new content arrives
                return [...prev, ...newContent].slice(-20); // Keep latest 20
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('[ResearchScratchpad] Failed to fetch results:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [sessionId, isVisible]);

  const copyToClipboard = async (text: string, format: 'plain' | 'json' = 'plain') => {
    try {
      let contentToCopy = text;
      if (format === 'json') {
        contentToCopy = JSON.stringify({ content: text, timestamp: new Date() }, null, 2);
      }
      
      await navigator.clipboard.writeText(contentToCopy);
      toast({
        title: "Copied to clipboard",
        description: `Content copied as ${format} text`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadContent = (content: string, filename: string, type: 'txt' | 'json' | 'md') => {
    let blob;
    let actualFilename = filename;
    
    switch (type) {
      case 'json':
        blob = new Blob([JSON.stringify({ content, timestamp: new Date() }, null, 2)], 
          { type: 'application/json' });
        actualFilename += '.json';
        break;
      case 'md':
        blob = new Blob([content], { type: 'text/markdown' });
        actualFilename += '.md';
        break;
      default:
        blob = new Blob([content], { type: 'text/plain' });
        actualFilename += '.txt';
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = actualFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className={`transition-all duration-300 ${isExpanded ? 'min-h-[400px]' : 'min-h-[120px]'}`}>
      <Card className="border border-yellow-500/30 bg-slate-900/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-sm text-yellow-500">Research Scratchpad</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-toggle-scratchpad"
            >
              {isExpanded ? '−' : '+'}
            </Button>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent>
            <Tabs defaultValue="research" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="research" className="text-xs">
                  <Search className="h-3 w-3 mr-1" />
                  Research ({researchResults.length})
                </TabsTrigger>
                <TabsTrigger value="content" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Content ({generatedContent.length})
                </TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Insights
                </TabsTrigger>
              </TabsList>

              <TabsContent value="research" className="space-y-3 mt-4">
                {researchResults.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>AI research and analysis will appear here...</p>
                  </div>
                ) : (
                  researchResults.map((research) => (
                    <div key={research.id} className="border border-slate-600/50 rounded-lg p-4 space-y-3 bg-slate-800/80">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-200">"{research.query}"</h4>
                          <p className="text-xs text-slate-400">
                            {new Date(research.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(research.summary)}
                            data-testid={`button-copy-research-${research.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadContent(
                              `Query: ${research.query}\n\nSummary: ${research.summary}\n\nInsights:\n${research.insights.map(i => `• ${i}`).join('\n')}`, 
                              `research_${research.query.replace(/\s+/g, '_').toLowerCase()}`, 
                              'txt'
                            )}
                            data-testid={`button-download-research-${research.id}`}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-slate-800/90 p-3 rounded border border-slate-700/30">
                        <p className="text-sm text-slate-300">{research.summary}</p>
                      </div>
                      
                      {research.insights.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-semibold text-yellow-500">Key Insights:</h5>
                          {research.insights.map((insight, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Lightbulb className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-slate-300">{insight}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="content" className="space-y-3 mt-4">
                {generatedContent.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Generated content will appear here...</p>
                  </div>
                ) : (
                  generatedContent.map((content) => (
                    <div key={content.id} className="border border-slate-600/50 rounded-lg p-4 space-y-3 bg-slate-800/80">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-200">{content.title}</h4>
                          <p className="text-xs text-slate-400 capitalize">
                            {content.type} • {new Date(content.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(content.content)}
                            data-testid={`button-copy-content-${content.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(content.content, 'json')}
                            data-testid={`button-copy-json-${content.id}`}
                          >
                            JSON
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadContent(content.content, content.title.replace(/\s+/g, '_').toLowerCase(), 'md')}
                            data-testid={`button-download-content-${content.id}`}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-slate-800/50 p-3 rounded max-h-48 overflow-y-auto">
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap">{content.content}</pre>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="insights" className="space-y-3 mt-4">
                <div className="space-y-2">
                  {researchResults.flatMap(r => r.insights).map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-slate-800/30 rounded">
                      <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-300">{insight}</p>
                    </div>
                  ))}
                  {researchResults.length === 0 && (
                    <div className="text-center text-slate-400 py-8">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>AI insights will appear here...</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
}