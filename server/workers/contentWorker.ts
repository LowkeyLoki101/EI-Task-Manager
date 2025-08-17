import { openai, callWithQuota } from "../lib/openaiWrapper";
import { pickJob, completeJob, failJob, outboxWrite } from "../lib/queue";
import { CircuitBreaker } from "../lib/circuit";

const breaker = new CircuitBreaker(5, 20_000);

type Job = {
  id: string; type: string; payload: any; attempts: number; maxAttempts: number;
};

async function handle(job: Job) {
  switch (job.type) {
    case "kb.ingest":   return handleKbIngest(job);
    case "diary.entry": return handleDiaryEntry(job);
    case "autopoietic.tick": return handleAutopoietic(job);
    default: throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function handleKbIngest(job: Job) {
  const { messages } = job.payload;
  const res = await callWithQuota(() =>
    openai.chat.completions.create({ 
      model: "gpt-4", 
      messages: messages, 
      temperature: 0.2 
    })
  );
  await outboxWrite(job.id, "kb.ingest", res);
}

async function handleDiaryEntry(job: Job) {
  const { messages } = job.payload;
  const res = await callWithQuota(() =>
    openai.chat.completions.create({ 
      model: "gpt-4", 
      messages: messages, 
      temperature: 0.7 
    })
  );
  await outboxWrite(job.id, "diary.entry", res);
}

async function handleAutopoietic(job: Job) {
  const { messages } = job.payload;
  const res = await callWithQuota(() =>
    openai.chat.completions.create({ 
      model: "gpt-4", 
      messages: messages, 
      temperature: 0.5 
    })
  );
  await outboxWrite(job.id, "autopoietic.tick", res);
}

export function startContentWorker(concurrency = 2) {
  for (let i = 0; i < concurrency; i++) loop();
  return {
    status: () => breaker.status()
  };
}

async function loop() {
  try {
    const job = await pickJob();
    if (!job) {
      setTimeout(loop, 250);
      return;
    }

    if (!breaker.canRequest()) {
      await failJob(job.id, "circuit-open", 2_000);
      setImmediate(loop);
      return;
    }
    breaker.markProbe();

    try {
      await handle(job as any);
      breaker.onSuccess();
      await completeJob(job.id);
    } catch (err: any) {
      breaker.onFailure();
      const status = err?.status ?? err?.response?.status;
      const msg = `${status ?? "ERR"}:${err?.message ?? String(err)}`;
      await failJob(job.id, msg); // compute delay in repo layer
    }

    setImmediate(loop);
  } catch {
    setTimeout(loop, 500);
  }
}