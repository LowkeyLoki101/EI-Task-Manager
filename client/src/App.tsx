import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/home";
import Proposals from "./pages/proposals";
import Preview from "./pages/preview";
import Assistant from "./pages/assistant";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/assistant" component={Assistant} />
      <Route path="/knowledge-base" component={KnowledgeBasePage} />
      <Route path="/proposals" component={Proposals} />
      <Route path="/preview/:id" component={Preview} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
