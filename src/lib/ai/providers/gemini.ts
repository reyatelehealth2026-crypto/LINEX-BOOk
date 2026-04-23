import type { AiProvider, AiProviderRequest, AiProviderResult, AiChatMessage } from "./types";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 10_000);

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
        const body: Record<string, unknown> = {
          contents,
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.maxTokens,
          },
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
        const text: string | null = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
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
