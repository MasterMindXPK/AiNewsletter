import { GoogleGenAI } from "@google/genai";

/**
 * Thin Gemini wrapper for the free tier.
 *  - JSON mode, low temperature
 *  - minimum spacing between calls (free tier is roughly 15 requests/minute)
 *  - retry with backoff on 429/5xx/network/bad JSON
 *  - fails fast (LlmError) on bad key, bad model, or exhausted daily quota
 * Server-side only. Never import this from a client component.
 */

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MIN_INTERVAL_MS = 4500;
const MAX_ATTEMPTS = 4;
const MAX_BACKOFF_MS = 60_000;

export type LlmErrorReason = "no_key" | "quota" | "auth" | "other";

export class LlmError extends Error {
  readonly reason: LlmErrorReason;
  /** True when retrying later in the same run cannot help. */
  readonly fatal: boolean;
  constructor(message: string, reason: LlmErrorReason, fatal: boolean) {
    super(message);
    this.name = "LlmError";
    this.reason = reason;
    this.fatal = fatal;
  }
}

export interface LlmStats {
  calls: number;
  retries: number;
  failures: number;
}

const stats: LlmStats = { calls: 0, retries: 0, failures: 0 };
let client: GoogleGenAI | null = null;
let lastCallAt = 0;

export function getLlmStats(): LlmStats {
  return { ...stats };
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new LlmError("GEMINI_API_KEY is not set", "no_key", true);
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function errorStatus(e: unknown): number | undefined {
  if (e && typeof e === "object" && "status" in e) {
    const s = (e as { status: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

/** Gemini errors often say "Please retry in 23.4s" or {"retryDelay":"23s"}. */
function suggestedDelayMs(message: string): number | undefined {
  const m = /retry(?:Delay)?\D{0,12}(\d+(?:\.\d+)?)\s*s/i.exec(message);
  return m ? Math.ceil(Number(m[1]) * 1000) : undefined;
}

async function throttle(): Promise<void> {
  const minInterval = Number(
    process.env.GEMINI_MIN_INTERVAL_MS ?? DEFAULT_MIN_INTERVAL_MS,
  );
  const wait = lastCallAt + minInterval - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

function parseJsonText(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export interface GenerateJsonOptions {
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Call Gemini in JSON mode and return the parsed (still unvalidated) JSON.
 * Callers MUST validate the result with zod before using it.
 */
export async function generateJson(
  prompt: string,
  opts: GenerateJsonOptions = {},
): Promise<unknown> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await throttle();
    stats.calls++;
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          temperature: opts.temperature ?? 0.2,
          maxOutputTokens: opts.maxOutputTokens ?? 8192,
          // Extraction does not need reasoning tokens; skipping them is faster
          // and saves quota. Only 2.5 Flash variants accept a zero budget.
          ...(/2\.5-flash/.test(model)
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      });
      const text = res.text;
      if (!text) throw new Error("Empty response from model");
      return parseJsonText(text);
    } catch (e) {
      lastError = e;
      const message = errorMessage(e);
      const status = errorStatus(e);

      if (status === 429 && /perday|per day|daily/i.test(message)) {
        stats.failures++;
        throw new LlmError("Gemini daily quota exhausted", "quota", true);
      }
      if (status === 400 || status === 401 || status === 403 || status === 404) {
        stats.failures++;
        throw new LlmError(
          `Gemini request rejected (${status}): ${message.slice(0, 200)}`,
          "auth",
          true,
        );
      }

      if (attempt === MAX_ATTEMPTS) break;
      stats.retries++;
      const backoff = Math.min(MAX_BACKOFF_MS, 2000 * 2 ** (attempt - 1));
      const delay = Math.min(
        MAX_BACKOFF_MS,
        suggestedDelayMs(message) ?? backoff,
      );
      await sleep(delay + Math.floor(Math.random() * 500));
    }
  }

  stats.failures++;
  throw new LlmError(
    `Gemini call failed after ${MAX_ATTEMPTS} attempts: ${errorMessage(lastError).slice(0, 200)}`,
    "other",
    false,
  );
}
