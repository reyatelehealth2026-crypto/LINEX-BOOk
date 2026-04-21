// handoff.ts — Human handoff for AI Receptionist.
// When a customer asks for a real human, we pause the bot and notify admins.

import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { pushMessage } from "@/lib/line";

export type HandoffStatus = "pending" | "active" | "resolved" | "cancelled";

export interface HandoffSession {
  id: number;
  shop_id: number;
  customer_id: number;
  line_user_id: string;
  status: HandoffStatus;
  last_message: string | null;
  requested_at: string;
  taken_at: string | null;
  taken_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export async function getOpenHandoff(lineUserId: string): Promise<HandoffSession | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("ai_handoff_sessions")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .in("status", ["pending", "active"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as HandoffSession | null) ?? null;
}

export async function requestHandoff(
  customerId: number,
  lineUserId: string,
  lastMessage: string
): Promise<HandoffSession | null> {
  const db = supabaseAdmin();
  const existing = await getOpenHandoff(lineUserId);
  if (existing) {
    // refresh last_message so admins see latest context
    await db
      .from("ai_handoff_sessions")
      .update({ last_message: lastMessage })
      .eq("id", existing.id);
    return { ...existing, last_message: lastMessage };
  }
  const { data, error } = await db
    .from("ai_handoff_sessions")
    .insert({
      shop_id: SHOP_ID,
      customer_id: customerId,
      line_user_id: lineUserId,
      status: "pending",
      last_message: lastMessage,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[handoff] create error", error.message);
    return null;
  }
  return data as HandoffSession;
}

export async function takeHandoff(id: number, adminLineUserId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const { error } = await db
    .from("ai_handoff_sessions")
    .update({ status: "active", taken_at: new Date().toISOString(), taken_by: adminLineUserId })
    .eq("id", id)
    .in("status", ["pending", "active"]);
  if (error) {
    console.error("[handoff] take error", error.message);
    return false;
  }
  return true;
}

export async function closeHandoff(id: number, adminLineUserId: string): Promise<HandoffSession | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ai_handoff_sessions")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: adminLineUserId })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    console.error("[handoff] close error", error.message);
    return null;
  }
  return data as HandoffSession;
}

export async function cancelHandoff(lineUserId: string): Promise<void> {
  const db = supabaseAdmin();
  await db
    .from("ai_handoff_sessions")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .in("status", ["pending", "active"]);
}

// ─── Admin notification ─────────────────────────────────────────────────────

export function handoffNotifyFlex(params: {
  sessionId: number;
  customerName: string;
  pictureUrl?: string | null;
  lastMessage: string;
  requestedAt: string;
}) {
  const { sessionId, customerName, pictureUrl, lastMessage, requestedAt } = params;
  const time = new Date(requestedAt).toLocaleString("th-TH", {
    timeZone: process.env.SHOP_TIMEZONE || "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
  return {
    type: "flex" as const,
    altText: `🆘 ${customerName} ขอคุยกับพนักงาน`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#ef4444",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "🆘 ลูกค้าขอคุยกับพนักงาน", color: "#ffffff", weight: "bold", size: "md" },
          { type: "text", text: time, color: "#fecaca", size: "xs", margin: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              ...(pictureUrl
                ? [{
                    type: "image" as const,
                    url: pictureUrl,
                    size: "xxs" as const,
                    aspectMode: "cover" as const,
                    aspectRatio: "1:1" as const,
                    flex: 0,
                  }]
                : []),
              {
                type: "box",
                layout: "vertical",
                contents: [
                  { type: "text", text: customerName, weight: "bold", size: "md", wrap: true },
                  { type: "text", text: `#${sessionId}`, size: "xs", color: "#94a3b8" },
                ],
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#f8fafc",
            paddingAll: "12px",
            cornerRadius: "8px",
            contents: [
              { type: "text", text: "ข้อความล่าสุด", size: "xxs", color: "#64748b" },
              { type: "text", text: lastMessage.slice(0, 200), size: "sm", wrap: true, margin: "xs" },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06c755",
            action: { type: "postback", label: "✋ รับเรื่อง (หยุดบอท)", data: `action=handoff_take&id=${sessionId}` },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "✅ ปิดเคส (ให้บอทตอบต่อ)", data: `action=handoff_close&id=${sessionId}` },
          },
        ],
      },
    },
  };
}

export async function notifyAdminsOfHandoff(session: HandoffSession, customerName: string, pictureUrl: string | null) {
  const raw = process.env.ADMIN_LINE_IDS ?? "";
  const adminIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!adminIds.length) {
    console.warn("[handoff] ADMIN_LINE_IDS not set — cannot notify admins");
    return;
  }
  const flex = handoffNotifyFlex({
    sessionId: session.id,
    customerName,
    pictureUrl,
    lastMessage: session.last_message ?? "(ไม่มีข้อความ)",
    requestedAt: session.requested_at,
  });
  await Promise.allSettled(adminIds.map((id) => pushMessage(id, [flex])));
}
