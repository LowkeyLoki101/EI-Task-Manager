import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Send, Bot, User, FileText, X, Mic, MicOff, Square, Phone, PhoneOff } from 'lucide-react';
import { useSessionId } from '@/hooks/useSessionId';
import { createRealtimeSession, connectRealtime } from '@/lib/realtime';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

export function DirectChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // GPT Realtime Voice States
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useSessionId();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newFile: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          content: content
        };
        setUploadedFiles(prev => [...prev, newFile]);
      };
      reader.readAsText(file);
    }
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      // Clear any previous chunks
      setAudioChunks([]);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Try formats that OpenAI Whisper definitely supports, in order of preference
      const options: MediaRecorderOptions = {};
      
      // Check which formats are supported by the browser
      // WebM is most reliable with OpenAI Whisper, prioritize it
      const supportedFormats = [
        'audio/webm;codecs=opus',      // WebM with Opus - most reliable 
        'audio/webm',                  // WebM default
        'audio/ogg;codecs=opus',       // OGG as fallback
        'audio/mp4',                   // MP4 (some codecs cause issues)
        'audio/mp4;codecs=mp4a.40.2'   // MP4 with AAC codec
      ];
      
      for (const format of supportedFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          options.mimeType = format;
          console.log(`Using audio format: ${format}`);
          break;
        }
      }
      
      if (!options.mimeType) {
        console.warn('No preferred audio format found, using browser default');
      }
      
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        console.log('Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        console.log('Recording stopped, chunks collected:', chunks.length);
        
        if (chunks.length === 0) {
          console.error('No audio data recorded');
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'No audio was recorded. Please try holding the button longer and speaking clearly.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
        
        // Use the chunks collected in this scope (more reliable)
        const audioBlob = new Blob(chunks, { 
          type: options.mimeType || 'audio/webm' 
        });
        
        console.log('Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        if (audioBlob.size === 0) {
          console.error('Audio blob is empty');
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Audio recording failed. Please check your microphone permissions and try again.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
        
        await transcribeAudio(audioBlob);
        setAudioChunks([]);
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Recording error occurred. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setMediaRecorder(null);
      };

      // Record in small time slices to ensure data is collected
      recorder.start(1000); // Request data every 1000ms
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      console.log('Recording started with format:', options.mimeType || 'default');
    } catch (error) {
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Could not access microphone. ';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow microphone permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Audio recording not supported in this browser.';
        } else {
          errorMessage += 'Please check your microphone settings.';
        }
      }
      
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('Stopping recording...');
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    if (!sessionId) return;
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      // Determine file extension based on mime type, prioritizing reliable formats
      let filename = 'recording.webm'; // webm default (most reliable)
      if (audioBlob.type.includes('webm')) {
        filename = 'recording.webm';
      } else if (audioBlob.type.includes('ogg')) {
        filename = 'recording.ogg';
      } else if (audioBlob.type.includes('wav')) {
        filename = 'recording.wav';
      } else if (audioBlob.type.includes('m4a')) {
        filename = 'recording.m4a';
      } else if (audioBlob.type.includes('mp4')) {
        // Use .m4a extension for better OpenAI compatibility
        filename = 'recording.m4a';
      }
      
      console.log('Sending audio file:', filename, 'Type:', audioBlob.type, 'Size:', audioBlob.size);
      formData.append('audio', audioBlob, filename);
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const result = await response.json();
      
      if (result.transcription) {
        // Add the transcribed text to the input
        setInputMessage(result.transcription);
        
        // Add a user message showing the transcription
        const transcriptionMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `🎤 "${result.transcription}"`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, transcriptionMessage]);
        
        // Automatically process the transcription
        await processTranscription(result.transcription);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      
      let errorContent = 'Sorry, I could not transcribe your audio. Please try again.';
      
      // Try to get more specific error message from server
      try {
        const response = error as Response;
        if (response && response.json) {
          const errorData = await response.json();
          if (errorData.hint) {
            errorContent = `${errorData.error || 'Transcription failed'}: ${errorData.hint}`;
          }
        }
      } catch (parseError) {
        console.log('Could not parse error response');
      }
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const processTranscription = async (transcription: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/chat/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcription,
          sessionId,
          hasFiles: false,
          isVoiceMessage: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process transcription');
      }

      const result = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || 'I processed your voice message.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show task creation feedback if tasks were created
      if (result.tasksCreated > 0) {
        const taskFeedback: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ Created ${result.tasksCreated} task(s): ${result.tasks.map((t: any) => t.title).join(', ')}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, taskFeedback]);
      }

    } catch (error) {
      console.error('Processing error:', error);
    }
  };

  // GPT Realtime Voice Functions
  const startGPTVoice = async () => {
    try {
      setVoiceConnecting(true);
      const session = await createRealtimeSession();
      const token = session?.client_secret?.value;
      
      if (!token) {
        throw new Error('No client token returned from server');
      }
      
      const { pc } = await connectRealtime(token);
      pcRef.current = pc;
      setVoiceReady(true);
      
      // Add a message indicating voice chat is ready
      const voiceReadyMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🔊 GPT voice chat is now active. Speak directly to me!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, voiceReadyMessage]);
      
    } catch (error) {
      console.error('GPT voice connect error:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Voice chat failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your microphone permissions and try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setVoiceConnecting(false);
    }
  };

  const stopGPTVoice = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      setVoiceReady(false);
      
      const voiceStoppedMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🔇 GPT voice chat disconnected.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, voiceStoppedMessage]);
    }
  };

  // Cleanup voice connection on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;
    if (!sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      // Prepare message content with file context
      let messageWithFiles = inputMessage.trim();
      if (uploadedFiles.length > 0) {
        messageWithFiles += '\n\n[UPLOADED FILES]:';
        uploadedFiles.forEach(file => {
          messageWithFiles += `\n\nFile: ${file.name} (${file.type})\n${file.content}`;
        });
      }

      const response = await fetch('/api/chat/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageWithFiles,
          sessionId,
          hasFiles: uploadedFiles.length > 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || 'I received your message.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show task creation feedback if tasks were created
      if (result.tasksCreated > 0) {
        const taskFeedback: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ Created ${result.tasksCreated} task(s): ${result.tasks.map((t: any) => t.title).join(', ')}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, taskFeedback]);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-full" data-testid="direct-chat-interface">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-blue-600" />
          Direct Chat with GPT-5
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea className="h-64 w-full border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Start a conversation with GPT-5</p>
              <p className="text-sm">Upload documents and create tasks directly</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
              data-testid={`message-${message.role}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-white'
              }`}>
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`flex-1 min-w-0 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}>
                <div className={`inline-block p-3 rounded-lg max-w-full ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 border'
                }`}>
                  <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-400">
                      <div className="flex items-center gap-1 text-xs opacity-75">
                        <FileText className="w-3 h-3" />
                        {message.files.length} file(s) uploaded
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="bg-white dark:bg-gray-800 border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                    <span className="text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* File Upload Area */}
        {uploadedFiles.length > 0 && (
          <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Files to upload ({uploadedFiles.length})
              </span>
            </div>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)}KB)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    data-testid={`remove-file-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area - Expandable Text + Send Button */}
        <div className="space-y-3">
          {/* Text Input + Send Button - Flex Container */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Textarea
                ref={(el) => {
                  if (el) {
                    // Auto-resize functionality
                    const handleInput = () => {
                      el.style.height = 'auto';
                      el.style.height = `${Math.min(el.scrollHeight, 200)}px`; // Max 200px height
                    };
                    el.addEventListener('input', handleInput);
                    // Initial resize
                    handleInput();
                  }
                }}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask GPT-5 anything, create tasks, upload documents..."
                className="min-h-[40px] max-h-[200px] w-full resize-none text-base leading-relaxed px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 overflow-hidden"
                disabled={isLoading}
                data-testid="chat-input"
                rows={1}
              />
            </div>
            
            {/* Send Button - Inline with textarea */}
            <Button
              size="lg"
              onClick={sendMessage}
              disabled={isLoading || isRecording || voiceReady || (!inputMessage.trim() && uploadedFiles.length === 0)}
              data-testid="send-button"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-3 h-auto flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          
          {/* Action Buttons - Clean Layout Below Input */}
          <div className="flex flex-wrap gap-2 justify-start items-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isRecording}
              data-testid="upload-button"
              className="flex items-center gap-2 h-9"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </Button>
            <Button
              size="sm"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || voiceReady}
              data-testid="record-button"
              className={`flex items-center gap-2 h-9 ${isRecording ? "animate-pulse" : ""}`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isRecording ? "Stop" : "Record"}</span>
            </Button>
            <Button
              size="sm"
              variant={voiceReady ? "destructive" : "outline"}
              onClick={voiceReady ? stopGPTVoice : startGPTVoice}
              disabled={isLoading || voiceConnecting || isRecording}
              data-testid="voice-chat-button"
              className={`flex items-center gap-2 h-9 ${voiceReady ? "animate-pulse" : voiceConnecting ? "animate-pulse" : ""}`}
            >
              {voiceReady ? <PhoneOff className="w-4 h-4" /> : voiceConnecting ? <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div> : <Phone className="w-4 h-4" />}
              <span>
                {voiceReady ? "End Voice" : voiceConnecting ? "Connecting..." : "Voice Chat"}
              </span>
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.json,.csv,.xml,.html,.js,.ts,.py,.java,.cpp,.c,.h,.css,.sql,.log,.yaml,.yml"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          data-testid="file-input"
        />


      </CardContent>
    </Card>
  );
}