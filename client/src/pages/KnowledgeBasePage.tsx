import { KnowledgeBaseManager } from "@/components/KnowledgeBaseManager";
import { useSessionId } from "@/hooks/useSessionId";

export default function KnowledgeBasePage() {
  const sessionId = useSessionId();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <KnowledgeBaseManager sessionId={sessionId} />
    </div>
  );
}