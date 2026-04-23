import type { AiProvider } from "./types";
import { createZaiProvider } from "./zai";
import { createGeminiProvider } from "./gemini";

const providers: Record<string, AiProvider> = {
  zai: createZaiProvider(),
  gemini: createGeminiProvider(),
};

/** Detect provider from model name: gemini-* → gemini, glm-* → zai */
export function providerForModel(model: string): AiProvider {
  const lower = model.toLowerCase();
  if (lower.startsWith("gemini")) return providers.gemini;
  if (lower.startsWith("glm")) return providers.zai;
  // Fallback to env or default
  const key = (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  return providers[key] ?? providers.gemini;
}

export function getAiProvider(name?: string): AiProvider {
  const key = (name ?? process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  return providers[key] ?? providers.gemini;
}

export type { AiChatMessage, AiProvider, AiProviderFailure, AiProviderRequest, AiProviderResult } from "./types";
