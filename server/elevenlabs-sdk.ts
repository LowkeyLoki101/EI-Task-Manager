// Enhanced ElevenLabs SDK integration with voice features
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

export class VoiceService {
  
  // Generate voice synthesis for system responses
  async synthesizeVoice(text: string, voiceId?: string): Promise<ArrayBuffer> {
    try {
      const audioStream = await elevenlabs.textToSpeech.convert(
        voiceId || "21m00Tcm4TlvDq8ikWAM",
        {
          text: text,
          modelId: "eleven_monolingual_v1",
        }
      );

      // Convert ReadableStream to ArrayBuffer
      const reader = audioStream.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result.buffer;
    } catch (error) {
      console.error('Voice synthesis error:', error);
      throw new Error('Failed to synthesize voice');
    }
  }

  // Generate voice notification for task updates
  async generateTaskNotification(taskTitle: string, action: string): Promise<ArrayBuffer> {
    const text = `Task update: ${action} "${taskTitle}"`;
    return this.synthesizeVoice(text);
  }

  // Generate voice summary of completed tasks
  async generateTaskSummary(tasks: any[]): Promise<ArrayBuffer> {
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = tasks.filter(t => t.status !== 'done').length;
    
    const text = `Task summary: You have completed ${completed} tasks and have ${pending} remaining tasks.`;
    return this.synthesizeVoice(text);
  }

  // Generate voice response for file operations
  async generateFileOperationResponse(operation: string, filename: string, success: boolean): Promise<ArrayBuffer> {
    const status = success ? 'successfully completed' : 'failed';
    const text = `File operation ${status}: ${operation} for ${filename}`;
    return this.synthesizeVoice(text);
  }

  // Save conversation transcript to task system
  async saveTranscript(sessionId: string, taskId: string, transcript: string, role: 'user' | 'assistant') {
    // This would integrate with your storage system
    return {
      sessionId,
      taskId,
      transcript,
      role,
      timestamp: new Date(),
      saved: true
    };
  }

  // Get voice settings and capabilities
  async getVoiceCapabilities() {
    try {
      const voices = await elevenlabs.voices.getAll();
      return {
        voices: voices.voices,
        models: ["eleven_monolingual_v1", "eleven_multilingual_v1"],
        features: ["text-to-speech", "voice-cloning", "speech-synthesis"]
      };
    } catch (error) {
      console.error('Failed to get voice capabilities:', error);
      return {
        voices: [],
        models: [],
        features: [],
        error: 'API key required'
      };
    }
  }
}

export const voiceService = new VoiceService();