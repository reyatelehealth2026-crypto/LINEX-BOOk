export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiProviderRequest = {
  model: string;
  messages: AiChatMessage[];
  temperature: number;
  maxTokens: number;
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
