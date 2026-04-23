import type { AiProvider } from "./types";
import { createZaiProvider } from "./zai";

const providers: Record<string, AiProvider> = {
  zai: createZaiProvider(),
};

export function getAiProvider(name?: string): AiProvider {
  const key = (name ?? process.env.AI_PROVIDER ?? "zai").trim().toLowerCase();
  return providers[key] ?? providers.zai;
}

export type { AiChatMessage, AiProvider, AiProviderFailure, AiProviderRequest, AiProviderResult } from "./types";
