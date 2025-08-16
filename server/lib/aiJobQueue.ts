import { eq, and, lte, asc, count } from "drizzle-orm";
import { aiJobs } from "../../shared/schema";
import crypto from "crypto";
import { db } from "../db";

export type AiJob = typeof aiJobs.$inferSelect;
export type AiJobInsert = typeof aiJobs.$inferInsert;

export class AiJobQueue {
  
  async enqueue(
    type: string, 
    payload: any, 
    opts?: { priority?: number; maxAttempts?: number; scheduledAt?: Date }
  ): Promise<string> {
    const [job] = await db.insert(aiJobs).values({
      id: crypto.randomUUID(),
      type,
      payload,
      priority: opts?.priority ?? 5,
      maxAttempts: opts?.maxAttempts ?? 5,
      scheduledAt: opts?.scheduledAt ?? new Date(),
    }).returning();
    
    return job.id;
  }

  async pick(): Promise<AiJob | null> {
    const results = await db.transaction(async (tx) => {
      // Find next job
      const [job] = await tx
        .select()
        .from(aiJobs)
        .where(
          and(
            eq(aiJobs.state, 'queued'),
            lte(aiJobs.scheduledAt, new Date())
          )
        )
        .orderBy(asc(aiJobs.priority), asc(aiJobs.scheduledAt))
        .limit(1);

      if (!job) return null;

      // Mark as running
      await tx
        .update(aiJobs)
        .set({ 
          state: 'running', 
          updatedAt: new Date() 
        })
        .where(eq(aiJobs.id, job.id));

      return job;
    });

    return results;
  }

  async complete(id: string, result?: any): Promise<void> {
    await db
      .update(aiJobs)
      .set({ 
        state: 'completed', 
        result, 
        updatedAt: new Date() 
      })
      .where(eq(aiJobs.id, id));
  }

  async fail(id: string, error: string, delayMs?: number): Promise<void> {
    const [job] = await db
      .select({ attempts: aiJobs.attempts, maxAttempts: aiJobs.maxAttempts })
      .from(aiJobs)
      .where(eq(aiJobs.id, id));

    if (!job) return;

    const attempts = job.attempts + 1;
    const scheduledAt = delayMs ? new Date(Date.now() + delayMs) : new Date();

    if (attempts >= job.maxAttempts) {
      await db
        .update(aiJobs)
        .set({
          state: 'failed',
          attempts,
          lastError: error,
          updatedAt: new Date()
        })
        .where(eq(aiJobs.id, id));
    } else {
      await db
        .update(aiJobs)
        .set({
          state: 'queued',
          attempts,
          lastError: error,
          scheduledAt,
          updatedAt: new Date()
        })
        .where(eq(aiJobs.id, id));
    }
  }

  async getStats() {
    const stats = await db
      .select({
        state: aiJobs.state,
        count: count()
      })
      .from(aiJobs)
      .groupBy(aiJobs.state);

    return stats.reduce((acc, stat) => {
      acc[stat.state] = Number(stat.count);
      return acc;
    }, {} as Record<string, number>);
  }
}