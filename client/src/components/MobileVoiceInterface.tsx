import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { Textarea } from './ui/textarea';

interface MobileVoiceInterfaceProps {
  sessionId: string;
  builderMode: boolean;
}

export function MobileVoiceInterface({ sessionId, builderMode }: MobileVoiceInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportsVoice, setSupportsVoice] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setSupportsVoice(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        setIsRecording(false);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Voice recognition failed: ${event.error}`);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) return;
    
    setError(null);
    setIsRecording(true);
    
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start voice recording');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const processMessage = async () => {
    if (!transcript.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Send to ElevenLabs Actions API
      const response = await fetch('/api/actions/add_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          title: transcript,
          context: 'phone',
          description: `Voice input: ${transcript}`,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Task created:', result);
        setTranscript(''); // Clear after successful submission
        
        // If builder mode is on, also trigger supervisor processing
        if (builderMode) {
          fetch('/api/supervisor/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              transcript,
              context: 'phone',
            }),
          });
        }
      } else {
        throw new Error('Failed to process message');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process your message');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-500" />
          Mobile Voice Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supportsVoice ? (
          <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
            Voice recognition not supported on this browser. Use text input below.
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              variant={isRecording ? "destructive" : "default"}
              className="flex-1"
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          </div>
        )}
        
        <div className="space-y-2">
          <Textarea
            placeholder="Speak or type your task here..."
            value={transcript}
            onChange={(e: any) => setTranscript(e.target.value)}
            className="min-h-[80px]"
          />
          
          <Button
            onClick={processMessage}
            disabled={!transcript.trim() || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </div>
        
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
            {error}
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {supportsVoice ? (
            <>
              📱 Mobile-optimized voice input using Web Speech API
              <br />🎯 Messages sent directly to task management system
            </>
          ) : (
            'Text input connected to full task management backend'
          )}
        </div>
      </CardContent>
    </Card>
  );
}