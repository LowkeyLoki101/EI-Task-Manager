import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeRecommendations } from "@/components/CodeRecommendations";
import { InsightsExport } from "@/components/InsightsExport";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Brain, 
  FileText, 
  BarChart3, 
  Download,
  Lightbulb,
  TrendingUp,
  Code
} from "lucide-react";

export default function CodeAnalysis() {
  const [location, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Generate or get session ID
    const stored = localStorage.getItem('sessionId');
    if (stored) {
      setSessionId(stored);
    } else {
      const newSessionId = `s_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', newSessionId);
      setSessionId(newSessionId);
    }
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Brain className="h-6 w-6 text-blue-600" />
                  Intelligent Code Analysis
                </h1>
                <p className="text-muted-foreground">
                  AI-powered development insights with GPT-5 analysis
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                Session: {sessionId.slice(-6)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              System Insights
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export & Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                  <CardDescription>
                    Our intelligent code analysis system uses GPT-5 to examine your codebase and provide actionable recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <Brain className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <h3 className="font-medium mb-1">AI Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        GPT-5 analyzes your code for improvements, bugs, and optimizations
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <h3 className="font-medium mb-1">Vote & Learn</h3>
                      <p className="text-sm text-muted-foreground">
                        Vote on recommendations to help the AI learn your preferences
                      </p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <h3 className="font-medium mb-1">Approve & Implement</h3>
                      <p className="text-sm text-muted-foreground">
                        Approved recommendations are sent directly to your development agent
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <CodeRecommendations sessionId={sessionId} />
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Development Insights</CardTitle>
                <CardDescription>
                  Comprehensive overview of your development patterns and AI recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  View detailed analytics about your codebase, recommendation patterns, and development trends.
                  This data helps the AI provide more targeted and relevant suggestions over time.
                </p>
              </CardContent>
            </Card>
            
            <InsightsExport sessionId={sessionId} />
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Your Data</CardTitle>
                <CardDescription>
                  Download your analysis results in multiple formats for external use
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Available Formats</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• JSON - Raw data for programmatic use</li>
                      <li>• Text Report - Human-readable summary</li>
                      <li>• TypeScript - Type-safe data structures</li>
                      <li>• Markdown - Documentation-ready format</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Export Options</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• All data - Complete analysis export</li>
                      <li>• Recommendations only - Just the AI suggestions</li>
                      <li>• File analysis - Technical code analysis</li>
                      <li>• System insights - High-level metrics</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <InsightsExport sessionId={sessionId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}