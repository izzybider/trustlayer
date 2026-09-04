import OpenAI from "openai";

/**
 * Server-only OpenAI access. The key is read from the environment and never
 * reaches the client bundle; every route that uses it is a server route.
 */

export const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export const REQUEST_TIMEOUT_MS = 20_000;

/** USD per 1M tokens. Used only to produce a clearly-labelled estimate. */
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
};

export function modelEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | null = null;
export function getClient(): OpenAI | null {
  if (!modelEnabled()) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return client;
}

export function estimateCostUsd(inputTokens: number, outputTokens: number, model = MODEL): number {
  const price = PRICE_TABLE[model] ?? PRICE_TABLE["gpt-4o-mini"];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

export type UsageAccumulator = {
  input_tokens: number;
  output_tokens: number;
  model: string;
  estimated_cost_usd: number;
};

export function newUsage(): UsageAccumulator {
  return { input_tokens: 0, output_tokens: 0, model: MODEL, estimated_cost_usd: 0 };
}

export function addUsage(
  acc: UsageAccumulator,
  usage: { prompt_tokens?: number; completion_tokens?: number } | undefined,
) {
  if (!usage) return acc;
  acc.input_tokens += usage.prompt_tokens ?? 0;
  acc.output_tokens += usage.completion_tokens ?? 0;
  acc.estimated_cost_usd = estimateCostUsd(acc.input_tokens, acc.output_tokens, acc.model);
  return acc;
}

const CONTROL_CHARS = new RegExp("[\\x00-\\x1F\\x7F]+", "g");

/** Strips control characters and bounds any string placed into a prompt. */
export function sanitizeText(input: unknown, maxLength = 1200): string {
  if (typeof input !== "string") return "";
  return input.replace(CONTROL_CHARS, " ").trim().slice(0, maxLength);
}
