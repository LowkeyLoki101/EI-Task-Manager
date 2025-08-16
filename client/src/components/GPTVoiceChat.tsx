import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, MessageSquare, Headphones } from "lucide-react";
import { createRealtimeSession, connectRealtime } from "@/lib/realtime";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GPTVoiceChatProps {
  sessionId: string;
  className?: string;
}

export function GPTVoiceChat({ sessionId, className = "" }: GPTVoiceChatProps) {
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();

  // Handle text chat - existing endpoint
  async function sendText(text: string) {
    if (!text.trim()) return;
    
    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setTextInput("");
    
    try {
      // Use existing chat processing endpoint
      const response = await fetch("/api/chat/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId,
          message: text 
        })
      });
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant", 
        content: data?.response || data?.reply || "Sorry, I couldn't process that.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Text chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  }

  // Start GPT Realtime voice connection
  async function startVoice() {
    try {
      setConnecting(true);
      console.log("[GPT Voice] Starting realtime session...");
      
      const session = await createRealtimeSession();
      const token = session?.client_secret?.value;
      
      if (!token) {
        throw new Error("No client token returned from session");
      }
      
      console.log("[GPT Voice] Connecting to realtime...");
      const { pc, audioEl } = await connectRealtime(token);
      pcRef.current = pc;
      
      // Add audio element to DOM for playback
      audioEl.style.display = "none";
      document.body.appendChild(audioEl);
      
      setReady(true);
      console.log("[GPT Voice] Voice connection established");
      
      toast({
        title: "Voice Connected",
        description: "You can now speak with GPT-4o directly!",
      });
      
    } catch (error) {
      console.error("[GPT Voice] Connection failed:", error);
      toast({
        title: "Voice Connection Failed", 
        description: "Check microphone permissions and try again.",
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  }

  // Stop voice connection
  function stopVoice() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Remove audio elements
    document.querySelectorAll('audio[autoplay]').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    setReady(false);
    console.log("[GPT Voice] Voice connection stopped");
    
    toast({
      title: "Voice Disconnected",
      description: "Voice chat has been stopped.",
    });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          GPT-4o Voice & Text Chat
          {ready && (
            <Badge variant="secondary" className="bg-green-900/30 text-green-400 animate-pulse">
              <Headphones className="h-3 w-3 mr-1" />
              Voice Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Voice Controls */}
        <div className="flex items-center gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-600/30">
          <div className="flex items-center gap-2 flex-1">
            <Mic className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-300">
              {ready ? "Voice chat active - speak naturally" : "Click to start voice conversation"}
            </span>
          </div>
          {!ready ? (
            <Button
              onClick={startVoice}
              disabled={connecting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-start-voice"
            >
              {connecting ? (
                <>
                  <Mic className="h-4 w-4 mr-2 animate-pulse" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Voice
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopVoice}
              size="sm"
              variant="destructive"
              data-testid="button-stop-voice"
            >
              <MicOff className="h-4 w-4 mr-2" />
              Stop Voice
            </Button>
          )}
        </div>

        {/* Text Input - Always Available */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendText(textInput);
          }}
          className="flex gap-2"
        >
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message or use voice above..."
            className="flex-1 bg-slate-700/20 border-slate-600/30 text-slate-100 placeholder-slate-400"
            data-testid="input-text-message"
          />
          <Button 
            type="submit" 
            disabled={!textInput.trim()}
            data-testid="button-send-text"
          >
            Send
          </Button>
        </form>

        {/* Message History */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Start a conversation with voice or text</p>
              <p className="text-xs mt-1">Voice chat uses GPT-4o Realtime API</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-blue-900/20 border border-blue-500/30 ml-8"
                    : "bg-slate-700/30 border border-slate-600/30 mr-8"
                }`}
                data-testid={`message-${message.role}-${message.id}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-xs font-medium ${
                    message.role === "user" ? "text-blue-400" : "text-slate-300"
                  }`}>
                    {message.role === "user" ? "You" : "GPT-4o"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-slate-100 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}