import React from "react";
import { useAiStatus } from "../hooks/useAiStatus";
import { Badge } from "./ui/badge";
import { Activity, Clock, AlertCircle, CheckCircle } from "lucide-react";

export function AiStatusIndicator() {
  const { status, loading } = useAiStatus();

  if (loading || !status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4 animate-spin" />
        <span>Loading AI status...</span>
      </div>
    );
  }

  const { queue, worker } = status;
  const breakerColor = 
    worker.breaker.state === 'open' ? 'destructive' : 
    worker.breaker.state === 'half-open' ? 'secondary' : 
    'default';

  const breakerIcon = 
    worker.breaker.state === 'open' ? AlertCircle : 
    worker.breaker.state === 'half-open' ? Clock : 
    CheckCircle;

  const BreakberIcon = breakerIcon;

  const queuedJobs = queue.queued || 0;
  const runningJobs = queue.running || 0;
  const failedJobs = queue.failed || 0;

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Queue Status */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">AI Jobs:</span>
        {queuedJobs > 0 && (
          <Badge variant="outline">
            {queuedJobs} waiting
          </Badge>
        )}
        {runningJobs > 0 && (
          <Badge variant="default">
            {runningJobs} processing
          </Badge>
        )}
        {failedJobs > 0 && (
          <Badge variant="destructive">
            {failedJobs} failed
          </Badge>
        )}
        {queuedJobs === 0 && runningJobs === 0 && failedJobs === 0 && (
          <Badge variant="outline">idle</Badge>
        )}
      </div>

      {/* Circuit Breaker Status */}
      <div className="flex items-center gap-2">
        <BreakberIcon className="h-4 w-4" />
        <Badge variant={breakerColor}>
          {worker.breaker.state === 'open' ? 'API Paused' :
           worker.breaker.state === 'half-open' ? 'Recovering' :
           'AI Active'}
        </Badge>
      </div>
    </div>
  );
}

export function AiQueueButton({ 
  onClick, 
  disabled = false,
  children = "Generate with AI" 
}: { 
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const { status } = useAiStatus();
  
  const isCircuitOpen = status?.worker.breaker.state === 'open';
  const hasQueuedJobs = (status?.queue.queued || 0) > 0;
  
  const buttonText = isCircuitOpen 
    ? "AI Temporarily Unavailable" 
    : hasQueuedJobs 
    ? "Add to AI Queue" 
    : children;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      data-testid="button-ai-generate"
    >
      {isCircuitOpen && <AlertCircle className="h-4 w-4" />}
      {hasQueuedJobs && !isCircuitOpen && <Clock className="h-4 w-4" />}
      {!isCircuitOpen && !hasQueuedJobs && <Activity className="h-4 w-4" />}
      {buttonText}
    </button>
  );
}