import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VoiceWidgetProps } from '@/lib/types';

export default function VoiceWidget({ onMessage, isConnected }: VoiceWidgetProps) {
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onMessage(textInput);
      setTextInput('');
    }
  };

  const startConversation = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsConversationMode(true);
      startListening(stream);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access for voice conversation');
    }
  };

  const stopConversation = () => {
    setIsConversationMode(false);
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const startListening = (stream: MediaStream) => {
    audioChunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      await processAudio(audioBlob);
    };

    setIsRecording(true);
    mediaRecorderRef.current.start();

    // Auto-stop recording after 10 seconds (adjust as needed)
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, 10000);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsRecording(false);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const { text } = await response.json();
        if (text.trim()) {
          onMessage(text);
          
          // In conversation mode, automatically start listening again after processing
          if (isConversationMode) {
            setTimeout(() => {
              const stream = (mediaRecorderRef.current?.stream || null) as MediaStream | null;
              if (stream) {
                startListening(stream);
              }
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isConversationMode) {
      stopConversation();
    } else {
      startConversation();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Voice Assistant</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-slate-400'}`} />
          <span className={`text-sm font-medium ${isConnected ? 'text-success' : 'text-slate-500'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-center space-x-3">
          <Button
            onClick={toggleRecording}
            className={`w-16 h-16 rounded-full transition-colors shadow-lg ${
              isConversationMode
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-primary hover:bg-primary/80'
            }`}
            data-testid="button-voice-record"
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </Button>
        </div>
        <p className="text-center text-sm text-slate-600 dark:text-slate-300 mt-3">
          {isProcessing 
            ? 'Processing...' 
            : isConversationMode 
              ? (isRecording ? 'Listening... (Auto conversation mode)' : 'Conversation active - Tap to stop')
              : 'Tap to start conversation'
          }
        </p>
        {isConversationMode && (
          <div className="flex justify-center mt-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
          </div>
        )}
      </div>
      
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Or type your message..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
          data-testid="input-text-message"
        />
        <Button 
          onClick={handleTextSubmit}
          className="bg-primary text-white hover:bg-blue-700"
          data-testid="button-send-message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
