import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceProvider } from "./lib/workspace";
import Home from "./pages/home";
import Proposals from "./pages/proposals";
import Preview from "./pages/preview";
import Assistant from "./pages/assistant";
import VoiceChatPage from "./pages/voice-chat";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import CodeAnalysis from "./pages/CodeAnalysis";
import DiaryPage from "./pages/diary";
import AutopoieticDiary from "./pages/autopoietic-diary";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/assistant" component={Assistant} />
      <Route path="/voice-chat" component={VoiceChatPage} />
      <Route path="/knowledge-base" component={KnowledgeBasePage} />
      <Route path="/proposals" component={Proposals} />
      <Route path="/preview/:id" component={Preview} />
      <Route path="/code-analysis" component={CodeAnalysis} />
      <Route path="/diary" component={DiaryPage} />
      <Route path="/autopoietic" component={AutopoieticDiary} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}

export default App;
