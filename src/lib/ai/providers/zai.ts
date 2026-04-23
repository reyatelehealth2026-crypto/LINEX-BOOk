import type { AiProvider, AiProviderRequest, AiProviderResult } from "./types";

const ZAI_API_URL = process.env.ZAI_API_URL ?? "https://api.z.ai/api/coding/paas/v4/chat/completions";
const ZAI_TIMEOUT_MS = Number(process.env.ZAI_TIMEOUT_MS ?? process.env.AI_MODEL_TIMEOUT_MS ?? 3500);

export function createZaiProvider(): AiProvider {
  return {
    name: "zai",
    async chat(request: AiProviderRequest): Promise<AiProviderResult> {
      const startedAt = Date.now();
      const apiKey = process.env.ZAI_API_KEY;

      if (!apiKey) {
        return {
          ok: false,
          code: "not_configured",
          provider: "zai",
          model: request.model,
          latencyMs: 0,
          retryable: false,
          message: "ZAI_API_KEY not set",
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ZAI_TIMEOUT_MS);

      try {
        const res = await fetch(ZAI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            max_tokens: request.maxTokens,
            temperature: request.temperature,
            stream: false,
          }),
          signal: controller.signal,
        });

        const latencyMs = Date.now() - startedAt;

        if (!res.ok) {
          const message = await res.text();
          return {
            ok: false,
            code: res.status === 429 ? "rate_limit" : res.status === 401 || res.status === 403 ? "auth" : "api_error",
            provider: "zai",
            model: request.model,
            latencyMs,
            status: res.status,
            message,
            retryable: res.status === 429 || res.status >= 500,
          };
        }

        const json = await res.json();
        const text: string | null = json?.choices?.[0]?.message?.content ?? null;
        return {
          ok: true,
          text,
          status: res.status,
          provider: "zai",
          model: request.model,
          latencyMs,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startedAt;
        if (err?.name === "AbortError") {
          return {
            ok: false,
            code: "timeout",
            provider: "zai",
            model: request.model,
            latencyMs,
            retryable: true,
            message: `timed out after ${ZAI_TIMEOUT_MS}ms`,
          };
        }
        return {
          ok: false,
          code: "network_error",
          provider: "zai",
          model: request.model,
          latencyMs,
          retryable: true,
          message: err?.message ?? "unknown network error",
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
