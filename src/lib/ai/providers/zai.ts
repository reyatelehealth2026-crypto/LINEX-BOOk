import type { AiProvider, AiProviderRequest, AiProviderResult } from "./types";

const ZAI_API_URLS = [
  process.env.ZAI_API_URL ?? "https://api.z.ai/api/coding/paas/v4/chat/completions",
  "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions",
];
const ZAI_TIMEOUT_MS = Number(process.env.ZAI_TIMEOUT_MS ?? process.env.AI_MODEL_TIMEOUT_MS ?? 8000);

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

      for (const apiUrl of ZAI_API_URLS) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ZAI_TIMEOUT_MS);

        try {
          const res = await fetch(apiUrl, {
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
            // If this URL returned a server error, try the next URL
            if (res.status >= 500 && apiUrl !== ZAI_API_URLS[ZAI_API_URLS.length - 1]) {
              clearTimeout(timeout);
              continue; // try next URL
            }
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
            // Timeout on this URL — try next one
            clearTimeout(timeout);
            if (apiUrl !== ZAI_API_URLS[ZAI_API_URLS.length - 1]) continue;
            return {
              ok: false,
              code: "timeout",
              provider: "zai",
              model: request.model,
              latencyMs,
              retryable: true,
              message: `timed out after ${ZAI_TIMEOUT_MS}ms on all endpoints`,
            };
          }
          // Network error — try next URL
          if (apiUrl !== ZAI_API_URLS[ZAI_API_URLS.length - 1]) continue;
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
      }

      // Should not reach here, but just in case
      return {
        ok: false,
        code: "network_error",
        provider: "zai",
        model: request.model,
        latencyMs: Date.now() - startedAt,
        retryable: true,
        message: "all API URLs exhausted",
      };
    },
  };
}
