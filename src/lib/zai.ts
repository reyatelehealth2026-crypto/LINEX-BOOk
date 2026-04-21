import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

const ZAI_API_URL = "https://api.z.ai/api/coding/paas/v4/chat/completions";

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

const DEFAULT_SETTINGS: AiSettings = {
  enabled: true,
  model: "glm-4.7",
  temperature: 0.7,
  max_tokens: 350,
  history_limit: 10,
  bot_name: "ผู้ช่วยร้าน",
  business_desc: "",
  custom_rules: "",
  booking_redirect: "พิมพ์ว่า จอง ได้เลยค่ะ หรือกดปุ่มจองคิวในเมนูนะคะ",
};

// ─── Load AI settings from DB ────────────────────────────────────────────────

export async function getAiSettings(): Promise<AiSettings> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("ai_settings")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
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
}

// ─── Shop context (system prompt) ───────────────────────────────────────────

async function buildShopSystemPrompt(settings: AiSettings): Promise<string> {
  const db = supabaseAdmin();

  const [shopRes, servicesRes, staffRes] = await Promise.all([
    db.from("shops").select("name, phone, address").eq("id", SHOP_ID).maybeSingle(),
    db.from("services").select("name, price, duration_min").eq("shop_id", SHOP_ID).eq("active", true).order("sort_order"),
    db.from("staff").select("name, nickname").eq("shop_id", SHOP_ID).eq("active", true).order("sort_order"),
  ]);

  const shop = shopRes.data;
  const shopName = shop?.name ?? "ร้าน";
  const phone = shop?.phone ?? "-";
  const address = shop?.address ?? "-";

  const serviceLines = (servicesRes.data ?? [])
    .map((s: any) => `• ${s.name} — ${Number(s.price).toLocaleString()} บาท (${s.duration_min} นาที)`)
    .join("\n");

  const staffLines = (staffRes.data ?? [])
    .map((s: any) => `• ${s.nickname ?? s.name}`)
    .join("\n");

  const businessBlock = settings.business_desc
    ? `\nข้อมูลธุรกิจเพิ่มเติม:\n${settings.business_desc}`
    : "";

  const customRulesBlock = settings.custom_rules
    ? `\nกฎเพิ่มเติมจากเจ้าของร้าน:\n${settings.custom_rules}`
    : "";

  return `คุณคือ${settings.bot_name}ของร้าน ${shopName} ตอบภาษาไทยเสมอ พูดสุภาพ กระชับ และเป็นมิตร
เบอร์ร้าน: ${phone}
ที่อยู่: ${address}${businessBlock}

บริการและราคา:
${serviceLines || "ยังไม่มีข้อมูลบริการ"}

ช่างในร้าน:
${staffLines || "ยังไม่มีข้อมูลช่าง"}

กฎสำคัญ:
- ถ้าลูกค้าต้องการจองคิว ให้บอกว่า "${settings.booking_redirect}"
- ห้ามยืนยันการจองในแชท ต้องจองผ่านระบบเท่านั้น
- ถ้าไม่รู้คำตอบ ให้แนะนำให้โทรหาร้าน
- ตอบสั้นๆ ไม่เกิน 3-4 ประโยค${customRulesBlock}`;
}

// ─── Chat history ────────────────────────────────────────────────────────────

async function getLastMessages(lineUserId: string, historyLimit: number): Promise<Array<{ role: string; content: string }>> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("chat_history")
    .select("role, content")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .order("created_at", { ascending: false })
    .limit(historyLimit);

  if (!data?.length) return [];
  return data.reverse();
}

async function saveMessages(
  lineUserId: string,
  userText: string,
  assistantText: string
): Promise<void> {
  const db = supabaseAdmin();
  await db.from("chat_history").insert([
    { shop_id: SHOP_ID, line_user_id: lineUserId, role: "user", content: userText },
    { shop_id: SHOP_ID, line_user_id: lineUserId, role: "assistant", content: assistantText },
  ]);
}

// ─── Z.AI GLM call ───────────────────────────────────────────────────────────

export async function askGLM(lineUserId: string, userText: string): Promise<string | null> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    console.warn("[zai] ZAI_API_KEY not set — skipping AI reply");
    return null;
  }

  try {
    const settings = await getAiSettings();
    if (!settings.enabled) return null;

    const [systemPrompt, history] = await Promise.all([
      buildShopSystemPrompt(settings),
      getLastMessages(lineUserId, settings.history_limit),
    ]);

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userText },
    ];

    const res = await fetch(ZAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        max_tokens: settings.max_tokens,
        temperature: settings.temperature,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[zai] API error ${res.status}:`, errText);
      // 429 = rate limit — return a polite fallback instead of null so LINE can still reply
      if (res.status === 429) {
        return "ขออภัยค่ะ ขณะนี้บอทมีผู้ใช้งานมากค่ะ กรุณาลองถามใหม่อีกครั้งในอีกสักครู่นะคะ 🙏";
      }
      return null;
    }

    const json = await res.json();
    const reply: string | null = json?.choices?.[0]?.message?.content ?? null;

    if (reply) {
      await saveMessages(lineUserId, userText, reply);
    }

    return reply;
  } catch (err) {
    console.error("[zai] askGLM exception:", err);
    return null;
  }
}
