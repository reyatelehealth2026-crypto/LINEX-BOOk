import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

async function pushLine(userId: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    console.error("[cron/reminders] push failed", userId, await res.text());
    return false;
  }
  return true;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
}

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET (Vercel Cron sends it as Authorization header)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!LINE_TOKEN) {
    return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN not set" }, { status: 500 });
  }

  const db = supabaseAdmin();
  const now = new Date();
  const results = { reminded_1h: 0, reminded_24h: 0, review_requested: 0, errors: 0 };

  // ── Pass 1: 1-hour reminder (window: 50–70 min from now) ──
  {
    const windowStart = new Date(now.getTime() + 50 * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() + 70 * 60_000).toISOString();

    const { data, error } = await db
      .from("bookings")
      .select(
        "id, starts_at, ends_at, service:services(name), staff:staff(nickname), customer:customers(line_user_id)"
      )
      .eq("shop_id", SHOP_ID)
      .eq("status", "confirmed")
      .is("reminded_at", null)
      .gte("starts_at", windowStart)
      .lte("starts_at", windowEnd);

    if (error) {
      console.error("[cron/reminders] 1h query error", error.message);
      results.errors++;
    } else {
      for (const b of data ?? []) {
        const userId = (b.customer as any)?.line_user_id;
        if (!userId) continue;
        const svcName = (b.service as any)?.name ?? "-";
        const staffName = (b.staff as any)?.nickname ?? "—";
        const text = `⏰ เตือนคิว (อีก 1 ชั่วโมง)\nบริการ: ${svcName}\nเวลา: ${fmtTime(b.starts_at)} – ${fmtTime(b.ends_at)}\nช่าง: ${staffName}`;
        const ok = await pushLine(userId, text);
        if (ok) {
          await db
            .from("bookings")
            .update({ reminded_at: now.toISOString() })
            .eq("id", b.id);
          results.reminded_1h++;
        } else {
          results.errors++;
        }
      }
    }
  }

  // ── Pass 2: 24-hour reminder (window: 23h50m – 24h10m from now) ──
  {
    const windowStart = new Date(now.getTime() + (24 * 60 - 10) * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() + (24 * 60 + 10) * 60_000).toISOString();

    const { data, error } = await db
      .from("bookings")
      .select(
        "id, starts_at, ends_at, service:services(name), staff:staff(nickname), customer:customers(line_user_id)"
      )
      .eq("shop_id", SHOP_ID)
      .eq("status", "confirmed")
      .is("reminded_24h_at", null)
      .gte("starts_at", windowStart)
      .lte("starts_at", windowEnd);

    if (error) {
      console.error("[cron/reminders] 24h query error", error.message);
      results.errors++;
    } else {
      for (const b of data ?? []) {
        const userId = (b.customer as any)?.line_user_id;
        if (!userId) continue;
        const svcName = (b.service as any)?.name ?? "-";
        const staffName = (b.staff as any)?.nickname ?? "—";
        const text = `📅 เตือนนัดพรุ่งนี้\nบริการ: ${svcName}\nวัน: ${fmtDate(b.starts_at)}\nเวลา: ${fmtTime(b.starts_at)} – ${fmtTime(b.ends_at)}\nช่าง: ${staffName}\n\nหากต้องการเลื่อนนัด แจ้งได้เลยนะคะ 🙏`;
        const ok = await pushLine(userId, text);
        if (ok) {
          await db
            .from("bookings")
            .update({ reminded_24h_at: now.toISOString() })
            .eq("id", b.id);
          results.reminded_24h++;
        } else {
          results.errors++;
        }
      }
    }
  }

  // ── Pass 3: Review request (completed bookings 23h–25h ago, not yet requested) ──
  {
    const windowStart = new Date(now.getTime() - 25 * 60 * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() - 23 * 60 * 60_000).toISOString();

    const { data, error } = await db
      .from("bookings")
      .select(
        "id, ends_at, service:services(name), customer:customers(line_user_id, display_name, full_name)"
      )
      .eq("shop_id", SHOP_ID)
      .eq("status", "completed")
      .is("review_requested_at", null)
      .gte("ends_at", windowStart)
      .lte("ends_at", windowEnd);

    if (error) {
      console.error("[cron/reminders] review query error", error.message);
      results.errors++;
    } else {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
      for (const b of data ?? []) {
        const userId = (b.customer as any)?.line_user_id;
        if (!userId) continue;
        const svcName = (b.service as any)?.name ?? "บริการ";
        const customerName = (b.customer as any)?.full_name ?? (b.customer as any)?.display_name ?? "คุณลูกค้า";
        const reviewLink = liffId ? `\nhากรุณารีวิวได้ที่ → https://liff.line.me/${liffId}/review?booking=${b.id}` : "";
        const text = `💛 ขอบคุณที่ใช้บริการนะคะ ${customerName}\nหวังว่า${svcName}จะถูกใจนะคะ\nรบกวนรีวิวสักนิดได้เลยค่ะ ⭐${reviewLink}`;
        const ok = await pushLine(userId, text);
        if (ok) {
          await db
            .from("bookings")
            .update({ review_requested_at: now.toISOString() })
            .eq("id", b.id);
          results.review_requested++;
        } else {
          results.errors++;
        }
      }
    }
  }

  // ── Update cron_last_run in shop settings ──
  await db
    .from("shops")
    .update({ cron_last_run: now.toISOString() } as any)
    .eq("id", SHOP_ID);

  console.log("[cron/reminders] done", results);
  return NextResponse.json({ ok: true, ...results, ran_at: now.toISOString() });
}
