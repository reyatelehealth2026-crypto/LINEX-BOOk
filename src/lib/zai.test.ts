import { describe, it, expect } from "vitest";
import { shopApiKeyForModel, type AiSettings } from "./zai";

const baseSettings: AiSettings = {
  enabled: true,
  model: "gemini-3-flash-preview",
  temperature: 0.7,
  max_tokens: 350,
  history_limit: 6,
  bot_name: "ผู้ช่วย",
  business_desc: "",
  custom_rules: "",
  booking_redirect: "พิมพ์ จอง",
  vision_enabled: true,
  image_gen_enabled: true,
  image_gen_per_hour: 3,
  gemini_api_key: null,
  zai_api_key: null,
};

describe("shopApiKeyForModel — per-shop key resolution", () => {
  it("returns Gemini key for gemini-* models", () => {
    const s: AiSettings = { ...baseSettings, gemini_api_key: "shop-gemini-xyz" };
    expect(shopApiKeyForModel("gemini-3-flash-preview", s)).toBe("shop-gemini-xyz");
    expect(shopApiKeyForModel("gemini-2.5-flash", s)).toBe("shop-gemini-xyz");
  });

  it("returns Z.AI key for glm-* models", () => {
    const s: AiSettings = { ...baseSettings, zai_api_key: "shop-zai-abc" };
    expect(shopApiKeyForModel("glm-4.7", s)).toBe("shop-zai-abc");
    expect(shopApiKeyForModel("glm-4.5-air", s)).toBe("shop-zai-abc");
  });

  it("returns undefined when no key is set (caller falls back to env)", () => {
    expect(shopApiKeyForModel("gemini-3-flash-preview", baseSettings)).toBeUndefined();
    expect(shopApiKeyForModel("glm-4.7", baseSettings)).toBeUndefined();
  });

  it("treats null api_key the same as undefined", () => {
    const s: AiSettings = { ...baseSettings, gemini_api_key: null, zai_api_key: null };
    expect(shopApiKeyForModel("gemini-3-flash-preview", s)).toBeUndefined();
  });

  it("falls back to gemini key for unknown model families", () => {
    const s: AiSettings = { ...baseSettings, gemini_api_key: "fallback-key" };
    expect(shopApiKeyForModel("unknown-model-name", s)).toBe("fallback-key");
  });

  it("matches model family case-insensitively", () => {
    const s: AiSettings = { ...baseSettings, gemini_api_key: "g-key", zai_api_key: "z-key" };
    expect(shopApiKeyForModel("GEMINI-3-FLASH", s)).toBe("g-key");
    expect(shopApiKeyForModel("GLM-4.7", s)).toBe("z-key");
  });

  it("does not cross-contaminate: gemini model never returns zai key", () => {
    const s: AiSettings = { ...baseSettings, zai_api_key: "z-only" };
    expect(shopApiKeyForModel("gemini-3-flash-preview", s)).toBeUndefined();
  });
});
