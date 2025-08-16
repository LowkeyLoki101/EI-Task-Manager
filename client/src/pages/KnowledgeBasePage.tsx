import { KnowledgeBaseManager } from "@/components/KnowledgeBaseManager";
import { useSessionId } from "@/hooks/useSessionId";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function KnowledgeBasePage() {
  const sessionId = useSessionId();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
      </div>
      <KnowledgeBaseManager sessionId={sessionId} />
    </div>
  );
}