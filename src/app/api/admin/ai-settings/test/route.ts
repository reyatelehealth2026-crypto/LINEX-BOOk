import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getAiSettings, buildShopSystemPrompt, type AiSettings } from "@/lib/zai";
import { providerForModel } from "@/lib/ai/providers";
import type { AiChatMessage } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 20 test calls per minute per shop — in-memory, best-effort on serverless.
const testRateLimiter = createRateLimiter(20, 60_000);

type TestRequestBody = {
  message: string;
  overrideSettings?: Partial<AiSettings>;
};

type TestResponseOk = {
  ok: true;
  reply: string;
  systemPrompt: string;
  model: string;
  latencyMs: number;
};

type TestResponseErr = {
  ok: false;
  error: string;
};

export async function POST(
  req: NextRequest,
): Promise<NextResponse<TestResponseOk | TestResponseErr>> {
  const identity = await verifyAdmin(req);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const shopId = identity.shopId;

  // Rate-limit keyed by shop so one tenant can't exhaust shared quota for another.
  const rl = testRateLimiter.check(String(shopId));
  if (!rl.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `ทดสอบบ่อยเกินไป กรุณารอสักครู่ (${Math.ceil(rl.retryAfterMs / 1000)} วินาที)`,
      },
      { status: 429 },
    );
  }

  let body: TestRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
  }
  if (message.length > 1000) {
    return NextResponse.json(
      { ok: false, error: "message too long (max 1000 chars)" },
      { status: 400 },
    );
  }

  // Load saved settings then overlay any unsaved overrides the owner is previewing.
  const saved = await getAiSettings(shopId);
  const settings: AiSettings = body.overrideSettings
    ? mergeSettings(saved, body.overrideSettings)
    : saved;

  // Build the real system prompt exactly as the webhook would — includes live
  // shop name, phone, address, services, and staff from the database.
  const systemPrompt = await buildShopSystemPrompt(shopId, settings);

  const messages: AiChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  const model = settings.model;
  const provider = providerForModel(model);
  const startedAt = Date.now();

  const result = await provider.chat({
    model,
    messages,
    temperature: settings.temperature,
    // Cap at 1200 same as runtime — prevents test calls burning huge token budgets.
    maxTokens: Math.min(settings.max_tokens, 1200),
  });

  const latencyMs = Date.now() - startedAt;

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: buildProviderErrorMessage(result.code, result.message) },
      { status: 502 },
    );
  }

  const reply = result.text ?? "(ไม่มีคำตอบจาก AI)";
  return NextResponse.json({ ok: true, reply, systemPrompt, model: result.model, latencyMs });
}

/**
 * Merge saved settings with a partial override coming from the form's unsaved state.
 * All numeric fields are clamped to the same bounds as the save endpoint uses.
 */
function mergeSettings(base: AiSettings, override: Partial<AiSettings>): AiSettings {
  return {
    enabled: typeof override.enabled === "boolean" ? override.enabled : base.enabled,
    model: typeof override.model === "string" && override.model ? override.model : base.model,
    temperature:
      typeof override.temperature === "number"
        ? Math.min(1, Math.max(0, override.temperature))
        : base.temperature,
    max_tokens:
      typeof override.max_tokens === "number"
        ? Math.min(1024, Math.max(50, override.max_tokens))
        : base.max_tokens,
    history_limit:
      typeof override.history_limit === "number"
        ? Math.min(20, Math.max(1, override.history_limit))
        : base.history_limit,
    bot_name:
      typeof override.bot_name === "string" ? override.bot_name.trim() : base.bot_name,
    business_desc:
      typeof override.business_desc === "string"
        ? override.business_desc.trim()
        : base.business_desc,
    custom_rules:
      typeof override.custom_rules === "string"
        ? override.custom_rules.trim()
        : base.custom_rules,
    booking_redirect:
      typeof override.booking_redirect === "string"
        ? override.booking_redirect.trim()
        : base.booking_redirect,
    vision_enabled:
      typeof override.vision_enabled === "boolean"
        ? override.vision_enabled
        : base.vision_enabled,
    image_gen_enabled:
      typeof override.image_gen_enabled === "boolean"
        ? override.image_gen_enabled
        : base.image_gen_enabled,
    image_gen_per_hour:
      typeof override.image_gen_per_hour === "number"
        ? Math.min(60, Math.max(1, override.image_gen_per_hour))
        : base.image_gen_per_hour,
  };
}

function buildProviderErrorMessage(code: string, message?: string): string {
  switch (code) {
    case "not_configured":
      return "ยังไม่ได้ตั้งค่า API Key ของ AI";
    case "auth":
      return "API Key ไม่ถูกต้องหรือหมดอายุ";
    case "rate_limit":
      return "AI ถูกใช้งานหนักเกินไป กรุณาลองใหม่อีกครั้ง";
    case "timeout":
      return "AI ตอบช้าเกินไป กรุณาลองใหม่อีกครั้ง";
    default:
      return message ? `AI error: ${message}` : "เกิดข้อผิดพลาดจาก AI กรุณาลองใหม่";
  }
}
