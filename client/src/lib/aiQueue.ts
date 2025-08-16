// AI Queue API Client
export interface AiQueueJob {
  type: string;
  payload: any;
  priority?: number;
}

export interface AiQueueResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export async function enqueueAiJob(job: AiQueueJob): Promise<AiQueueResponse> {
  const response = await fetch('/api/ai/enqueue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(job)
  });

  if (!response.ok) {
    throw new Error(`AI queue request failed: ${response.statusText}`);
  }

  return response.json();
}

// Convenience functions for common AI operations
export async function enqueueDiaryEntry(sessionId: string, content: string, type = 'reflection') {
  return enqueueAiJob({
    type: 'diary.entry',
    payload: { sessionId, content, type, mode: 'autonomous' },
    priority: 7
  });
}

export async function enqueueKnowledgeIngest(data: {
  title: string;
  content: string;
  type: string;
  sessionId: string;
  metadata?: any;
}) {
  return enqueueAiJob({
    type: 'kb.ingest',
    payload: data,
    priority: 5
  });
}

export async function enqueueAutopoieticTick(sessionId: string) {
  return enqueueAiJob({
    type: 'autopoietic.tick',
    payload: { sessionId },
    priority: 3
  });
}