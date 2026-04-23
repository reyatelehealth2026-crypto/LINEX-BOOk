import type { AiProvider } from "./types";
import { createZaiProvider } from "./zai";
import { createGeminiProvider } from "./gemini";

const providers: Record<string, AiProvider> = {
  zai: createZaiProvider(),
  gemini: createGeminiProvider(),
};

export function getAiProvider(name?: string): AiProvider {
  const key = (name ?? process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  return providers[key] ?? providers.gemini;
}

export type { AiChatMessage, AiProvider, AiProviderFailure, AiProviderRequest, AiProviderResult } from "./types";
