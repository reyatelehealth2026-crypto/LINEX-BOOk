import { supabaseAdmin, getCurrentShopId } from "@/lib/supabase";
import { getAiProvider, providerForModel, type AiChatMessage, type AiProviderFailure, type AiProviderResult } from "@/lib/ai/providers";

const AI_SETTINGS_CACHE_TTL_MS = 30_000;
const SHOP_CONTEXT_CACHE_TTL_MS = 60_000;
const MAX_RUNTIME_HISTORY = 6;
const MAX_RUNTIME_TOKENS = 500;

export type AiSettings = {
  enabled: boolean;
  model: string;
  temperature: number;
  max_tokens: number;
  history_limit: number;
  bot_name: string;
  business_desc: string;
  custom_rules: string;
  booking_redirect: string;
};

type ShopPromptContext = {
  shopName: string;
  phone: string;
  address: string;
  serviceSummary: string;
  staffSummary: string;
};

type CacheEntry<T> = {
  value: T;
  at: number;
};

const aiSettingsCache = new Map<number, CacheEntry<AiSettings>>();
const shopPromptContextCache = new Map<number, CacheEntry<ShopPromptContext>>();

const DEFAULT_SETTINGS: AiSettings = {
  enabled: true,
  model: "gemini-3-flash-preview",
  temperature: 0.7,
  max_tokens: 500,
  history_limit: 6,
  bot_name: "ผู้ช่วยร้าน",
  business_desc: "",
  custom_rules: "",
  booking_redirect: "พิมพ์ว่า จอง ได้เลยค่ะ หรือกดปุ่มจองคิวในเมนูนะคะ",
};

function getCached<T>(cache: Map<number, CacheEntry<T>>, key: number, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached<T>(cache: Map<number, CacheEntry<T>>, key: number, value: T) {
  cache.set(key, { value, at: Date.now() });
}

function effectiveHistoryLimit(raw: number): number {
  return Math.max(1, Math.min(raw, MAX_RUNTIME_HISTORY));
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getFallbackModels(primaryModel: string): string[] {
  const configured = process.env.AI_FALLBACK_MODELS ?? process.env.ZAI_FALLBACK_MODELS ?? "";
  if (configured) return dedupeStrings([primaryModel, ...configured.split(",")]);
  // Default fallback chain for Gemini
  if (primaryModel.startsWith("gemini")) {
    return dedupeStrings([primaryModel, "gemini-2.0-flash-lite"]);
  }
  // Default fallback chain for ZAI/GLM
  return dedupeStrings([primaryModel, "glm-4.5-air"]);
}

function classifyFinalFallback(failures: AiProviderFailure[]): string | null {
  if (failures.some((f) => f.code === "timeout")) {
    return "ขออภัยค่ะ ตอนนี้ระบบตอบช้ากว่าปกติ ลองพิมพ์ใหม่อีกครั้งหรือกดเมนูลัดด้านล่างได้เลยค่ะ 🙏";
  }
  if (failures.some((f) => f.code === "rate_limit")) {
    return "ขออภัยค่ะ ขณะนี้บอทมีผู้ใช้งานมากค่ะ กรุณาลองถามใหม่อีกครั้งในอีกสักครู่นะคะ 🙏";
  }
  if (failures.some((f) => f.code === "not_configured")) {
    console.error("[ai] ZAI_API_KEY not set — AI chat disabled");
    return null;
  }
  if (failures.some((f) => f.code === "auth")) {
    console.error("[ai] ZAI_API_KEY invalid or expired", {
      model: failures[0].model,
      status: failures[0].status,
      message: failures[0].message,
    });
  }
  if (failures.some((f) => f.code === "network_error")) {
    console.error("[ai] network error calling Z.AI API", {
      url: process.env.ZAI_API_URL ?? "https://api.z.ai/api/coding/paas/v4/chat/completions",
      message: failures[0].message,
    });
  }
  return null;
}

export function invalidateAiCache(shopId?: number) {
  if (typeof shopId === "number") {
    aiSettingsCache.delete(shopId);
    shopPromptContextCache.delete(shopId);
    return;
  }
  aiSettingsCache.clear();
  shopPromptContextCache.clear();
}

export async function getAiSettings(shopId?: number): Promise<AiSettings> {
  const resolvedShopId = shopId ?? await getCurrentShopId();
  const cached = getCached(aiSettingsCache, resolvedShopId, AI_SETTINGS_CACHE_TTL_MS);
  if (cached) return cached;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ai_settings")
    .select("*")
    .eq("shop_id", resolvedShopId)
    .maybeSingle();

  if (error) {
    console.error("[ai] failed to load ai_settings", { shopId: resolvedShopId, error: error.message });
    return DEFAULT_SETTINGS;
  }

  const settings: AiSettings = !data
    ? DEFAULT_SETTINGS
    : {
        enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
        model: data.model ?? DEFAULT_SETTINGS.model,
        temperature: Number(data.temperature ?? DEFAULT_SETTINGS.temperature),
        max_tokens: data.max_tokens ?? DEFAULT_SETTINGS.max_tokens,
        history_limit: data.history_limit ?? DEFAULT_SETTINGS.history_limit,
        bot_name: data.bot_name ?? DEFAULT_SETTINGS.bot_name,
        business_desc: data.business_desc ?? "",
        custom_rules: data.custom_rules ?? "",
        booking_redirect: data.booking_redirect ?? DEFAULT_SETTINGS.booking_redirect,
      };

  setCached(aiSettingsCache, resolvedShopId, settings);
  return settings;
}

async function getShopPromptContext(shopId: number): Promise<ShopPromptContext> {
  const cached = getCached(shopPromptContextCache, shopId, SHOP_CONTEXT_CACHE_TTL_MS);
  if (cached) return cached;

  const db = supabaseAdmin();
  const [shopRes, servicesRes, staffRes] = await Promise.all([
    db.from("shops").select("name, phone, address").eq("id", shopId).maybeSingle(),
    db.from("services").select("name, price, duration_min").eq("shop_id", shopId).eq("active", true).order("sort_order").limit(6),
    db.from("staff").select("name, nickname").eq("shop_id", shopId).eq("active", true).order("sort_order").limit(5),
  ]);

  const shop = shopRes.data;
  const serviceSummary = (servicesRes.data ?? [])
    .map((s: any) => `${s.name} ${Number(s.price).toLocaleString()}บ./${s.duration_min}น.`)
    .join(" | ");
  const staffSummary = (staffRes.data ?? [])
    .map((s: any) => s.nickname ?? s.name)
    .join(", ");

  const context: ShopPromptContext = {
    shopName: shop?.name ?? "ร้าน",
    phone: shop?.phone ?? "-",
    address: shop?.address ?? "-",
    serviceSummary,
    staffSummary,
  };

  setCached(shopPromptContextCache, shopId, context);
  return context;
}

async function buildShopSystemPrompt(shopId: number, settings: AiSettings): Promise<string> {
  const context = await getShopPromptContext(shopId);

  const businessBlock = settings.business_desc
    ? `\nข้อมูลธุรกิจเพิ่มเติม:\n${settings.business_desc}`
    : "";

  const customRulesBlock = settings.custom_rules
    ? `\nกฎเพิ่มเติมจากเจ้าของร้าน:\n${settings.custom_rules}`
    : "";

  return `คุณคือ${settings.bot_name}ของร้าน ${context.shopName} — ผู้ช่วยอัจฉริยะที่เก่งเรื่องบริการเสริมความงาม ตอบภาษาไทยเสมอ สุภาพ เป็นกันเอง คุยเก่งเหมือนพนักงานหน้าร้านที่เชี่ยวชาญจริงๆ

เบอร์ร้าน: ${context.phone}
ที่อยู่: ${context.address}${businessBlock}
บริการ: ${context.serviceSummary || "ยังไม่มีข้อมูล"}
ทีมงาน: ${context.staffSummary || "ยังไม่มีข้อมูล"}

คุณตอบได้ทุกอย่างที่พนักงานหน้าร้านตอบได้ รวมถึง:
- แนะนำทรงผม/สไตล์ที่เหมาะกับรูปหน้า อายุ ไลฟ์สไตล์ โอกาส
- อธิบายความแตกต่างของบริการ เช่น ทำสี vs ไฮไลท์ vs บาลายาจ
- ให้คำแนะนำดูแลผมหลังทำบริการ
- ตอบเรื่องเทรนด์สไตล์ผม เล็บ ความงาม
- ช่วยเลือกบริการจากความต้องการของลูกค้า
- ตอบคำถามทั่วไป เช่น ร้านนี้เด่นอะไร เหมาะกับผู้ชายไหม ฯลฯ
- สนทนาทั่วไปได้ตามธรรมชาติ

กฎ:
- ตอบเป็นธรรมชาติ ไม่ต้องเกรงใจ ไม่ต้องเป็นทางการเกินไป
- ห้ามยืนยันการจองในแชท — ถ้าลูกค้าอยากจองจริงๆ ให้บอก "${settings.booking_redirect}"
- ถ้าข้อมูลร้านบางอย่างไม่แน่ใจ ให้ตอบตามที่รู้แล้วแนะนำโทรสอบถามเพิ่ม${customRulesBlock}`;
}

async function getLastMessages(shopId: number, lineUserId: string, historyLimit: number): Promise<AiChatMessage[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("chat_history")
    .select("role, content")
    .eq("shop_id", shopId)
    .eq("line_user_id", lineUserId)
    .order("created_at", { ascending: false })
    .limit(historyLimit);

  if (error) {
    console.error("[ai] failed to load chat history", { shopId, lineUserId, error: error.message });
    return [];
  }

  if (!data?.length) return [];
  return data.reverse() as AiChatMessage[];
}

async function saveMessages(shopId: number, lineUserId: string, userText: string, assistantText: string): Promise<void> {
  const db = supabaseAdmin();
  const { error } = await db.from("chat_history").insert([
    { shop_id: shopId, line_user_id: lineUserId, role: "user", content: userText },
    { shop_id: shopId, line_user_id: lineUserId, role: "assistant", content: assistantText },
  ]);

  if (error) {
    console.error("[ai] failed to persist chat history", { shopId, lineUserId, error: error.message });
  }
}

export async function askGLM(lineUserId: string, userText: string): Promise<string | null> {
  const startedAt = Date.now();

  try {
    const shopId = await getCurrentShopId();
    const settings = await getAiSettings(shopId);
    if (!settings.enabled) return null;

    const historyLimit = effectiveHistoryLimit(settings.history_limit);
    const runtimeMaxTokens = Math.min(settings.max_tokens, MAX_RUNTIME_TOKENS);
    const promptStartedAt = Date.now();
    const [systemPrompt, history] = await Promise.all([
      buildShopSystemPrompt(shopId, settings),
      getLastMessages(shopId, lineUserId, historyLimit),
    ]);
    const promptMs = Date.now() - promptStartedAt;

    const messages: AiChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userText },
    ];

    // Pick provider based on the actual model name (not just env)
    const models = getFallbackModels(settings.model);
    const failures: AiProviderFailure[] = [];
    const maxRetries = 1; // retry once on timeout

    for (const model of models) {
      const provider = providerForModel(model);
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const result: AiProviderResult = await provider.chat({
          model,
          messages,
          temperature: attempt === 0 ? settings.temperature : Math.min(settings.temperature + 0.1, 1.0),
          maxTokens: attempt === 0 ? runtimeMaxTokens : Math.min(runtimeMaxTokens, 160), // smaller on retry
        });

        if (result.ok) {
          let saveMs = 0;
          if (result.text) {
            const saveStartedAt = Date.now();
            await saveMessages(shopId, lineUserId, userText, result.text);
            saveMs = Date.now() - saveStartedAt;
          }

          console.info("[ai] completion", {
            shopId,
          provider: result.provider,
          model: result.model,
          attemptedModels: models,
          historyLimit,
          runtimeMaxTokens,
          promptMs,
          modelMs: result.latencyMs,
          saveMs,
          totalMs: Date.now() - startedAt,
          replyChars: result.text?.length ?? 0,
        });

          return result.text;
        }

        failures.push(result);
        console.warn("[ai] provider attempt failed", {
          shopId,
          provider: result.provider,
          model: result.model,
          code: result.code,
          status: result.status,
          latencyMs: result.latencyMs,
          retryable: result.retryable,
          message: result.message,
          attempt,
        });

        // Only retry on timeout; don't waste time on auth/config errors
        if (result.code !== "timeout") break;
        // Don't retry if this is the last model
        if (attempt < maxRetries && model === models[models.length - 1]) break;
      }

      // If the model had a non-retryable error (auth, not_configured), skip to next model
      const lastFailure = failures[failures.length - 1];
      if (lastFailure && !lastFailure.retryable) continue;
    }

    const fallbackText = classifyFinalFallback(failures);
    if (fallbackText) return fallbackText;

    console.error("[ai] all provider attempts failed", {
      shopId,
      models,
      totalMs: Date.now() - startedAt,
      failures,
    });

    return null;
  } catch (err: any) {
    console.error("[ai] askGLM exception", err);
    return null;
  }
}
