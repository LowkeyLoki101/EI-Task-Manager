import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VoiceWidgetProps } from '@/lib/types';

export default function VoiceWidget({ onMessage, isConnected }: VoiceWidgetProps) {
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onMessage(textInput);
      setTextInput('');
    }
  };

  const toggleRecording = () => {
    // TODO: Integrate ElevenLabs voice widget
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate voice input for now
      setTimeout(() => {
        onMessage("Voice input received");
        setIsRecording(false);
      }, 2000);
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
      
      <div className="bg-slate-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-center space-x-3">
          <Button
            onClick={toggleRecording}
            className={`w-16 h-16 rounded-full transition-colors shadow-lg ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-primary hover:bg-blue-700'
            }`}
            data-testid="button-voice-record"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </Button>
        </div>
        <p className="text-center text-sm text-slate-600 mt-3">
          {isRecording ? 'Recording... Tap to stop' : 'Tap to start speaking'}
        </p>
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
