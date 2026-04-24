import type { AiProvider, AiProviderRequest, AiProviderResult, AiChatMessage } from "./types";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 20_000);
// Gemini 3 Flash thinks by default and can burn the entire output budget on
// reasoning tokens, producing empty or truncated replies. For a customer-facing
// chatbot we want a direct answer. 0 = thinking disabled; override with
// GEMINI_THINKING_BUDGET env if you want dynamic (-1) or a specific number.
const GEMINI_THINKING_BUDGET = (() => {
  const raw = process.env.GEMINI_THINKING_BUDGET;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
})();

function toGeminiContents(messages: AiChatMessage[]) {
  // Gemini uses "contents" array with role "user"/"model" and "systemInstruction"
  const systemParts: string[] = [];
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
      continue;
    }
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Gemini requires alternating user/model — merge consecutive same-role messages
  const merged: typeof contents = [];
  for (const c of contents) {
    const last = merged[merged.length - 1];
    if (last && last.role === c.role) {
      last.parts.push(...c.parts);
    } else {
      merged.push({ role: c.role, parts: [...c.parts] });
    }
  }

  return {
    systemInstruction: systemParts.length ? { parts: [{ text: systemParts.join("\n\n") }] } : undefined,
    contents: merged,
  };
}

export function createGeminiProvider(): AiProvider {
  return {
    name: "gemini",
    async chat(request: AiProviderRequest): Promise<AiProviderResult> {
      const startedAt = Date.now();
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return {
          ok: false,
          code: "not_configured",
          provider: "gemini",
          model: request.model,
          latencyMs: 0,
          retryable: false,
          message: "GEMINI_API_KEY not set",
        };
      }

      const { systemInstruction, contents } = toGeminiContents(request.messages);
      const url = `${GEMINI_API_URL}/${request.model}:generateContent?key=${apiKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

      try {
        const generationConfig: Record<string, unknown> = {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
        };
        // Only Gemini 2.5+/3.x support thinkingConfig. Harmless on older
        // models (ignored), but we gate on name to avoid noisy 400s.
        if (/^gemini-(2\.5|3)/i.test(request.model)) {
          generationConfig.thinkingConfig = { thinkingBudget: GEMINI_THINKING_BUDGET };
        }
        const body: Record<string, unknown> = {
          contents,
          generationConfig,
        };
        if (systemInstruction) {
          body.systemInstruction = systemInstruction;
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        const latencyMs = Date.now() - startedAt;

        if (!res.ok) {
          const message = await res.text();
          return {
            ok: false,
            code: res.status === 429 ? "rate_limit" : res.status === 401 || res.status === 403 ? "auth" : "api_error",
            provider: "gemini",
            model: request.model,
            latencyMs,
            status: res.status,
            message,
            retryable: res.status === 429 || res.status >= 500,
          };
        }

        const json = await res.json();
        // Gemini can return multiple parts (e.g. thought + text) — concatenate
        // every non-thought text part so we don't miss the answer when the
        // model emits reasoning first. Skip parts explicitly flagged `thought`.
        const parts: Array<{ text?: string; thought?: boolean }> =
          json?.candidates?.[0]?.content?.parts ?? [];
        const joined = parts
          .filter((p) => !p?.thought && typeof p?.text === "string")
          .map((p) => p.text as string)
          .join("");
        const text: string | null = joined.length > 0 ? joined : null;
        const finishReason: string | undefined = json?.candidates?.[0]?.finishReason;
        if (!text || finishReason === "MAX_TOKENS") {
          console.warn("[ai:gemini] suspicious completion", {
            model: request.model,
            finishReason,
            partsCount: parts.length,
            hasText: !!text,
            maxOutputTokens: request.maxTokens,
          });
        }
        return {
          ok: true,
          text,
          status: res.status,
          provider: "gemini",
          model: request.model,
          latencyMs,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startedAt;
        if (err?.name === "AbortError") {
          return {
            ok: false,
            code: "timeout",
            provider: "gemini",
            model: request.model,
            latencyMs,
            retryable: true,
            message: `timed out after ${GEMINI_TIMEOUT_MS}ms`,
          };
        }
        return {
          ok: false,
          code: "network_error",
          provider: "gemini",
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
