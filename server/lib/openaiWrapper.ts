import OpenAI from "openai";
import { computeBackoff, parseRetryAfter, classifyStatus } from "./rateLimit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type OpenAiCall<T> = () => Promise<T>;

export async function callWithQuota<T>(fn: OpenAiCall<T>, attempts = 7) {
  let attempt = 0;
  while (attempt < attempts) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status ?? 500;
      const headers = err?.response?.headers;
      const cls = classifyStatus(status);
      if (cls === "client" && status !== 429) {
        err.__retry = false;
        throw err;
      }
      const retryMs = parseRetryAfter(headers) ?? computeBackoff(attempt);
      await new Promise(r => setTimeout(r, retryMs));
      attempt++;
      if (attempt >= attempts) throw err;
    }
  }
  // Unreachable, but TS appeasement:
  throw new Error("OpenAI call exhausted retries.");
}

export { openai };