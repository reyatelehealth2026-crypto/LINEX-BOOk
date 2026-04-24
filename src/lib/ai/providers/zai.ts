import type { AiProvider, AiProviderRequest, AiProviderResult, AiProviderFailureCode } from "./types";

const ZAI_API_URLS = [
  process.env.ZAI_API_URL ?? "https://api.z.ai/api/coding/paas/v4/chat/completions",
  "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions",
];
// Per-endpoint timeout. Endpoints now race in parallel (Promise.any-style) so
// the fastest healthy one wins — no more 8s + 8s sequential waits.
const ZAI_TIMEOUT_MS = Number(process.env.ZAI_TIMEOUT_MS ?? process.env.AI_MODEL_TIMEOUT_MS ?? 12_000);

type EndpointResult =
  | {
      ok: true;
      text: string | null;
      status: number;
      latencyMs: number;
      endpoint: string;
    }
  | {
      ok: false;
      code: AiProviderFailureCode;
      status?: number;
      message?: string;
      retryable: boolean;
      latencyMs: number;
      endpoint: string;
    };

async function callEndpoint(
  endpoint: string,
  apiKey: string,
  request: AiProviderRequest,
  startedAt: number,
): Promise<EndpointResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ZAI_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
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
      const code: AiProviderFailureCode =
        res.status === 429
          ? "rate_limit"
          : res.status === 401 || res.status === 403
            ? "auth"
            : "api_error";
      return {
        ok: false,
        code,
        status: res.status,
        message,
        retryable: res.status === 429 || res.status >= 500,
        latencyMs,
        endpoint,
      };
    }

    const json = await res.json();
    const text: string | null = json?.choices?.[0]?.message?.content ?? null;
    return { ok: true, text, status: res.status, latencyMs, endpoint };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startedAt;
    const name = (err as { name?: string })?.name;
    const message = (err as { message?: string })?.message ?? "unknown network error";
    if (name === "AbortError") {
      return {
        ok: false,
        code: "timeout",
        retryable: true,
        latencyMs,
        endpoint,
        message: `timed out after ${ZAI_TIMEOUT_MS}ms`,
      };
    }
    return {
      ok: false,
      code: "network_error",
      retryable: true,
      latencyMs,
      endpoint,
      message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

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

      // Race all endpoints — first healthy response wins. If every endpoint
      // fails, surface the most informative failure (auth/rate_limit preferred
      // over network/timeout, since those are user-actionable).
      const results = await Promise.allSettled(
        ZAI_API_URLS.map((url) => callEndpoint(url, apiKey, request, startedAt)),
      );

      const settled: EndpointResult[] = results
        .filter((r): r is PromiseFulfilledResult<EndpointResult> => r.status === "fulfilled")
        .map((r) => r.value);

      const firstOk = settled.find((r): r is Extract<EndpointResult, { ok: true }> => r.ok);
      if (firstOk) {
        return {
          ok: true,
          text: firstOk.text,
          status: firstOk.status,
          provider: "zai",
          model: request.model,
          latencyMs: firstOk.latencyMs,
        };
      }

      const rank: Record<AiProviderFailureCode, number> = {
        not_configured: 0,
        auth: 1,
        rate_limit: 2,
        api_error: 3,
        network_error: 4,
        timeout: 5,
      };
      const failures = settled
        .filter((r): r is Extract<EndpointResult, { ok: false }> => !r.ok)
        .sort((a, b) => rank[a.code] - rank[b.code]);
      const worst = failures[0];

      if (!worst) {
        return {
          ok: false,
          code: "network_error",
          provider: "zai",
          model: request.model,
          latencyMs: Date.now() - startedAt,
          retryable: true,
          message: "all API URLs exhausted",
        };
      }

      return {
        ok: false,
        code: worst.code,
        provider: "zai",
        model: request.model,
        latencyMs: worst.latencyMs,
        status: worst.status,
        message: worst.message,
        retryable: worst.retryable,
      };
    },
  };
}
