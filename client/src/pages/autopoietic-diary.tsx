import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Play, 
  Pause, 
  Zap, 
  BookOpen, 
  MessageSquare, 
  Target, 
  Clock,
  TrendingUp,
  Lightbulb
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutopoieticStatus {
  isRunning: boolean;
  sessionId: string;
  kbEntries: number;
  selfQuestions: number;
  lastCycle?: string;
}

interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  source: string;
  tags: string[];
  timestamp: string;
  derivedTasks: string[];
}

interface SelfQuestion {
  id: string;
  text: string;
  category: string;
  useCount: string;
  effectiveness: string;
  lastUsed: string | null;
}

interface LensSession {
  id: string;
  trigger: string;
  frameStep: string;
  reframeStep: string;
  metaLensStep: string;
  recursiveStep: string;
  closureStep: string;
  generatedTasks: string[];
  generatedKbEntries: string[];
  generatedResearch: string[];
}

export default function AutopoieticDiary() {
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("sessionId");
    return stored || `s_${Math.random().toString(36).substr(2, 11)}`;
  });
  
  const [manualTrigger, setManualTrigger] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Status query
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: [`/api/autopoietic/status/${sessionId}`],
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Knowledge entries query
  const { data: kbData } = useQuery({
    queryKey: [`/api/kb/entries/${sessionId}`],
    refetchInterval: 10000,
  });

  // Self-questions query
  const { data: questionsData } = useQuery({
    queryKey: [`/api/kb/questions/${sessionId}`],
    refetchInterval: 10000,
  });

  // Start autopoietic loop
  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/autopoietic/start/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMinutes })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Autopoietic Diary Started",
        description: `Now thinking autonomously every ${intervalMinutes} minutes`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/autopoietic/status/${sessionId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stop autopoietic loop
  const stopMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/autopoietic/stop/${sessionId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to stop: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Autopoietic Diary Stopped",
        description: "Autonomous thinking loop has been stopped",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/autopoietic/status/${sessionId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Stop",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manual trigger
  const triggerMutation = useMutation({
    mutationFn: async (trigger: string) => {
      const response = await fetch(`/api/autopoietic/trigger/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to trigger: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thinking Cycle Triggered",
        description: "Manual thinking cycle completed successfully",
      });
      setManualTrigger("");
      queryClient.invalidateQueries({ queryKey: [`/api/autopoietic/status/${sessionId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/kb/entries/${sessionId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Trigger",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Evolve questions
  const evolveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/kb/questions/${sessionId}/evolve`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to evolve: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Questions Evolved",
        description: "Self-question pool has been enhanced",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/kb/questions/${sessionId}`] });
    },
  });

  if (statusLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <Brain className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading autopoietic system...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="w-8 h-8 text-blue-600" />
          Autopoietic Diary
        </h1>
        <p className="text-muted-foreground">
          Self-growing AI system that thinks, researches, and builds knowledge autonomously
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.isRunning ? (
              <Play className="w-5 h-5 text-green-500" />
            ) : (
              <Pause className="w-5 h-5 text-gray-500" />
            )}
            System Status
          </CardTitle>
          <CardDescription>
            Current state of the autopoietic thinking system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{status?.kbEntries || 0}</div>
              <div className="text-sm text-muted-foreground">Knowledge Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{status?.selfQuestions || 0}</div>
              <div className="text-sm text-muted-foreground">Self-Questions</div>
            </div>
            <div className="text-center">
              <Badge variant={status?.isRunning ? "default" : "secondary"}>
                {status?.isRunning ? "Running" : "Stopped"}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Loop Status</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">{intervalMinutes}min</div>
              <div className="text-sm text-muted-foreground">Interval</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>System Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="interval" className="text-sm font-medium">
                Interval (minutes):
              </label>
              <Input
                id="interval"
                type="number"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 30)}
                className="w-20"
                min={1}
                max={1440}
              />
            </div>
            
            {!status?.isRunning ? (
              <Button 
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Autonomous Loop
              </Button>
            ) : (
              <Button 
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Stop Loop
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="trigger" className="text-sm font-medium">
              Manual Trigger:
            </label>
            <div className="flex gap-2">
              <Textarea
                id="trigger"
                placeholder="What should the system think about? (e.g., 'What opportunities am I missing in renewable energy?')"
                value={manualTrigger}
                onChange={(e) => setManualTrigger(e.target.value)}
                rows={2}
              />
              <Button 
                onClick={() => triggerMutation.mutate(manualTrigger)}
                disabled={triggerMutation.isPending || !manualTrigger.trim()}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Think
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Content */}
      <Tabs defaultValue="knowledge" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="questions">Self-Questions</TabsTrigger>
          <TabsTrigger value="insights">System Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Knowledge Entries
              </CardTitle>
              <CardDescription>
                Self-generated research and insights from autonomous thinking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kbData?.entries?.length > 0 ? (
                <div className="space-y-4">
                  {kbData.entries.slice(0, 10).map((entry: KnowledgeEntry) => (
                    <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold">{entry.topic}</h4>
                        <Badge variant="outline">{entry.source}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {entry.content.slice(0, 200)}...
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {entry.derivedTasks?.length > 0 && (
                        <div className="text-xs text-blue-600">
                          Generated {entry.derivedTasks.length} task(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No knowledge entries yet. Start the autonomous loop to begin building knowledge.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Self-Question Pool
              </CardTitle>
              <CardDescription>
                Evolving collection of prompts that trigger autonomous thinking
              </CardDescription>
              <Button 
                onClick={() => evolveMutation.mutate()}
                disabled={evolveMutation.isPending}
                size="sm"
                className="self-start"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Evolve Questions
              </Button>
            </CardHeader>
            <CardContent>
              {questionsData?.questions?.length > 0 ? (
                <div className="space-y-3">
                  {questionsData.questions.map((question: SelfQuestion) => (
                    <div key={question.id} className="border rounded-lg p-3 space-y-2">
                      <div className="text-sm font-medium">{question.text}</div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Used: {question.useCount} times</span>
                        <span>Effectiveness: {question.effectiveness}/10</span>
                        <Badge variant="outline" className="text-xs">
                          {question.category}
                        </Badge>
                        {question.lastUsed && (
                          <span>Last: {new Date(question.lastUsed).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No self-questions loaded. The system will initialize with defaults when started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                System Insights
              </CardTitle>
              <CardDescription>
                Analytics and patterns from autonomous thinking cycles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Knowledge Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {kbData?.count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total entries created
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Question Pool</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {questionsData?.active || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active self-questions
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">How It Works</h4>
                <div className="text-sm space-y-2">
                  <p>• <strong>Frame:</strong> Direct problem identification</p>
                  <p>• <strong>Reframe:</strong> Alternative perspective exploration</p>
                  <p>• <strong>Meta-Lens:</strong> Self-reflection on thinking patterns</p>
                  <p>• <strong>Recursive:</strong> Deeper question generation and research</p>
                  <p>• <strong>Closure:</strong> Actionable conclusions and next steps</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}