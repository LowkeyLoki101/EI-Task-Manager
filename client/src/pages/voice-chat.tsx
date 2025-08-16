import { GPTVoiceChat } from "@/components/GPTVoiceChat";
import { useSessionId } from "@/hooks/useSessionId";

export default function VoiceChatPage() {
  const sessionId = useSessionId();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            GPT-4o Realtime Voice Chat
          </h1>
          <p className="text-slate-400">
            Experience direct voice conversation with GPT-4o using WebRTC technology
          </p>
        </div>
        
        <GPTVoiceChat sessionId={sessionId} />
        
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>This is powered by OpenAI's GPT-4o Realtime API with WebRTC</p>
          <p className="mt-1">Your existing ElevenLabs Actions are still available on other pages</p>
        </div>
      </div>
    </div>
  );
}