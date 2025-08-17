import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
import { aiJobs, aiOutbox } from "@shared/schema";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import crypto from "crypto";

export type EnqueueOpts = { priority?: number; maxAttempts?: number; scheduledAt?: Date };

export async function enqueueJob(type: string, payload: any, opts: EnqueueOpts = {}) {
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(aiJobs).values({
    id, type, payload, state: "queued",
    attempts: 0,
    maxAttempts: opts.maxAttempts ?? 5,
    priority: opts.priority ?? 5,
    scheduledAt: opts.scheduledAt ?? now,
    createdAt: now, updatedAt: now
  });
  return id;
}

// Atomically pick one job using SKIP LOCKED so multiple workers can run safely
export async function pickJob() {
  return db.transaction(async (tx: any) => {
    const picked = await tx.execute(sql/*sql*/`
      SELECT * FROM ai_jobs
      WHERE state = 'queued' AND scheduled_at <= now()
      ORDER BY priority ASC, scheduled_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `).then((r: any) => (r.rows?.[0] as any) ?? null);

    if (!picked) return null;

    await tx.update(aiJobs)
      .set({ state: "running", updatedAt: new Date() })
      .where(eq(aiJobs.id, picked.id));

    return picked as typeof aiJobs.$inferSelect;
  });
}

export async function completeJob(id: string) {
  await db.update(aiJobs)
    .set({ state: "done", updatedAt: new Date(), lastError: null })
    .where(eq(aiJobs.id, id));
}

export async function failJob(id: string, err: string, delayMs?: number, overrideMax?: number) {
  await db.transaction(async (tx: any) => {
    const cur = await tx.query.aiJobs.findFirst({ where: eq(aiJobs.id, id) });
    const attempts = (cur?.attempts ?? 0) + 1;
    const max = overrideMax ?? (cur?.maxAttempts ?? 5);

    if (attempts >= max) {
      await tx.update(aiJobs).set({
        state: "failed",
        attempts,
        lastError: err,
        updatedAt: new Date()
      }).where(eq(aiJobs.id, id));
    } else {
      const when = new Date(Date.now() + (delayMs ?? 1_000));
      await tx.update(aiJobs).set({
        state: "queued",
        attempts,
        lastError: err,
        scheduledAt: when,
        updatedAt: new Date()
      }).where(eq(aiJobs.id, id));
    }
  });
}

export async function outboxWrite(jobId: string, type: string, content: any) {
  await db.insert(aiOutbox).values({
    id: crypto.randomUUID(),
    jobId, type, content, createdAt: new Date()
  });
}

export async function queueSizes() {
  const r = await db.execute(sql/*sql*/`
    SELECT
      SUM(CASE WHEN state='queued'  THEN 1 ELSE 0 END) AS queued,
      SUM(CASE WHEN state='running' THEN 1 ELSE 0 END) AS running,
      SUM(CASE WHEN state='failed'  THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN state='done'    THEN 1 ELSE 0 END) AS done
    FROM ai_jobs
  `);
  return r.rows?.[0] ?? { queued: 0, running: 0, failed: 0, done: 0 };
}