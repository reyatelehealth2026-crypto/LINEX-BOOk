import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

const ZAI_API_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const ZAI_MODEL = "glm-4.5-flash";
const HISTORY_LIMIT = 10;
const MAX_TOKENS = 350;

// ─── Shop context (system prompt) ───────────────────────────────────────────

async function buildShopSystemPrompt(): Promise<string> {
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

  return `คุณคือผู้ช่วยบริการลูกค้าของร้าน ${shopName} ตอบภาษาไทยเสมอ พูดสุภาพ กระชับ และเป็นมิตร
เบอร์ร้าน: ${phone}
ที่อยู่: ${address}

บริการและราคา:
${serviceLines || "ยังไม่มีข้อมูลบริการ"}

ช่างในร้าน:
${staffLines || "ยังไม่มีข้อมูลช่าง"}

กฎสำคัญ:
- ถ้าลูกค้าต้องการจองคิว ให้บอกว่า "พิมพ์ว่า จอง ได้เลยค่ะ หรือกดปุ่มจองคิวในเมนูนะคะ"
- ห้ามยืนยันการจองในแชท ต้องจองผ่านระบบเท่านั้น
- ถ้าไม่รู้คำตอบ ให้แนะนำให้โทรหาร้าน
- ตอบสั้นๆ ไม่เกิน 3-4 ประโยค`;
}

// ─── Chat history ────────────────────────────────────────────────────────────

async function getLastMessages(lineUserId: string): Promise<Array<{ role: string; content: string }>> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("chat_history")
    .select("role, content")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

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
    const [systemPrompt, history] = await Promise.all([
      buildShopSystemPrompt(),
      getLastMessages(lineUserId),
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
        model: ZAI_MODEL,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[zai] API error ${res.status}:`, errText);
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
