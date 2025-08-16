import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, AlertCircle, Send } from "lucide-react";

type MicStatus = "idle" | "ready" | "error" | "need-permission" | "connecting";

interface VoiceFallbackProps {
  className?: string;
  onTextSubmit?: (text: string) => void;
}

export function VoiceFallback({ className = "", onTextSubmit }: VoiceFallbackProps) {
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [textInput, setTextInput] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const widget = document.getElementById('el-agent') as any;
    if (!widget) return;

    let errorTimer: NodeJS.Timeout;
    
    const handleReady = () => {
      setMicStatus("ready");
      setErrorCount(0);
      console.log("[VoiceFallback] Widget ready");
    };

    const handleError = (event: any) => {
      console.warn("[VoiceFallback] Widget error:", event.detail || event);
      setErrorCount(prev => prev + 1);
      
      // Log telemetry after 3 errors in 30 seconds
      if (errorCount >= 2) {
        logWidgetFailure(event.detail || "Unknown widget error");
        setMicStatus("error");
      } else {
        setMicStatus("connecting");
        // Clear error status after a brief moment if no more errors
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
          if (errorCount < 3) setMicStatus("ready");
        }, 2000);
      }
    };

    const handleConnecting = () => {
      setMicStatus("connecting");
    };

    // Check if widget is already ready
    if (widget.shadowRoot) {
      setMicStatus("ready");
    } else {
      setMicStatus("connecting");
    }

    widget.addEventListener("convai-ready", handleReady);
    widget.addEventListener("convai-error", handleError);
    widget.addEventListener("convai-connecting", handleConnecting);

    return () => {
      widget.removeEventListener("convai-ready", handleReady);
      widget.removeEventListener("convai-error", handleError);
      widget.removeEventListener("convai-connecting", handleConnecting);
      clearTimeout(errorTimer);
    };
  }, [errorCount]);

  const logWidgetFailure = async (detail: string) => {
    try {
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "widget_error",
          detail,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.warn("[VoiceFallback] Failed to log telemetry:", error);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      if (onTextSubmit) {
        await onTextSubmit(textInput);
      } else {
        // Default: send to supervisor
        await fetch("/api/supervisor/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            type: "message.user", 
            text: textInput,
            source: "text_fallback"
          })
        });
      }
      
      setTextInput("");
    } catch (error) {
      console.error("[VoiceFallback] Failed to submit text:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusInfo = () => {
    switch (micStatus) {
      case "ready":
        return {
          icon: <Mic className="h-4 w-4 text-green-500" />,
          text: "Voice ready",
          color: "text-green-500"
        };
      case "connecting":
        return {
          icon: <Mic className="h-4 w-4 text-yellow-500 animate-pulse" />,
          text: "Connecting...",
          color: "text-yellow-500"
        };
      case "need-permission":
        return {
          icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
          text: "Tap to allow mic",
          color: "text-orange-500"
        };
      case "error":
        return {
          icon: <MicOff className="h-4 w-4 text-red-500" />,
          text: "Voice unavailable",
          color: "text-red-500"
        };
      default:
        return {
          icon: <Mic className="h-4 w-4 text-gray-400" />,
          text: "Voice loading...",
          color: "text-gray-400"
        };
    }
  };

  const status = getStatusInfo();
  const showFallback = micStatus === "error" || micStatus === "need-permission";

  return (
    <div className={`space-y-4 ${className}`} data-testid="voice-fallback-container">
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm">
        {status.icon}
        <span className={status.color}>{status.text}</span>
      </div>

      {/* Text fallback - always show but emphasize when voice fails */}
      <Card className={showFallback ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" : ""}>
        <CardContent className="p-4">
          <form onSubmit={handleTextSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  showFallback 
                    ? "Voice is down - type your message here" 
                    : "Type to continue if needed"
                }
                disabled={isSubmitting}
                className="flex-1"
                data-testid="input-text-fallback"
              />
              <Button 
                type="submit" 
                disabled={!textInput.trim() || isSubmitting}
                size="sm"
                data-testid="button-send-text"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {showFallback && (
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Don't worry! You can continue using the assistant with text while we fix the voice connection.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}