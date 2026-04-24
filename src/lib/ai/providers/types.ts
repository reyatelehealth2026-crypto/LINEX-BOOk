export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiImagePart = {
  mimeType: string;
  data: string; // base64-encoded
};

export type AiProviderRequest = {
  model: string;
  messages: AiChatMessage[];
  temperature: number;
  maxTokens: number;
  /** Optional image(s) prepended to the last user turn (multimodal/vision). */
  imageParts?: AiImagePart[];
  /**
   * Per-shop API key override. When present, takes precedence over the
   * global env var (GEMINI_API_KEY / ZAI_API_KEY). Never logged.
   */
  apiKey?: string;
};

export type AiProviderSuccess = {
  ok: true;
  text: string | null;
  status?: number;
  provider: string;
  model: string;
  latencyMs: number;
};

export type AiProviderFailureCode =
  | "not_configured"
  | "timeout"
  | "rate_limit"
  | "auth"
  | "api_error"
  | "network_error";

export type AiProviderFailure = {
  ok: false;
  code: AiProviderFailureCode;
  provider: string;
  model: string;
  latencyMs: number;
  status?: number;
  message?: string;
  retryable: boolean;
};

export type AiProviderResult = AiProviderSuccess | AiProviderFailure;

export interface AiProvider {
  name: string;
  chat(request: AiProviderRequest): Promise<AiProviderResult>;
}
