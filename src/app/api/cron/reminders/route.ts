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

async function pushLineMessages(userId: string, messages: any[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!res.ok) {
    console.error("[cron/reminders] push (flex) failed", userId, await res.text());
    return false;
  }
  return true;
}

function reminder24hFlex(params: {
  bookingId: number;
  serviceName: string;
  staffName: string;
  dateLabel: string;
  timeRange: string;
}) {
  const { bookingId, serviceName, staffName, dateLabel, timeRange } = params;
  return {
    type: "flex" as const,
    altText: `📅 เตือนนัดพรุ่งนี้ ${serviceName} ${timeRange}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0ea5e9",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "📅 เตือนนัดพรุ่งนี้", color: "#ffffff", weight: "bold", size: "md" },
          { type: "text", text: dateLabel, color: "#e0f2fe", size: "xs", margin: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          { type: "text", text: serviceName, weight: "bold", size: "lg", wrap: true },
          { type: "text", text: `⏱ ${timeRange}`, size: "sm", color: "#475569" },
          { type: "text", text: `👤 ${staffName}`, size: "sm", color: "#475569" },
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
            action: { type: "postback", label: "✅ พรุ่งนี้ไปแน่นอน", data: `action=confirm_attendance&id=${bookingId}`, displayText: "พรุ่งนี้ไปแน่นอน" },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "🔄 ขอเลื่อนเวลา", data: `action=reschedule_booking&id=${bookingId}` },
          },
          {
            type: "button",
            style: "link",
            action: { type: "postback", label: "❌ ขอยกเลิกคิว", data: `action=cancel_booking&id=${bookingId}` },
          },
        ],
      },
    },
  };
}

function reminder2hFlex(params: {
  bookingId: number;
  serviceName: string;
  staffName: string;
  timeRange: string;
  price: number;
}) {
  const { bookingId, serviceName, staffName, timeRange, price } = params;
  return {
    type: "flex" as const,
    altText: `⏰ อีก 2 ชั่วโมงถึงคิว ${serviceName}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#06c755",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "⏰ อีก 2 ชั่วโมงถึงคิว", color: "#ffffff", weight: "bold", size: "md" },
          { type: "text", text: "กรุณายืนยันการมาตามนัด", color: "#d1fae5", size: "xs", margin: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          { type: "text", text: serviceName, weight: "bold", size: "lg", wrap: true },
          { type: "text", text: `⏱ ${timeRange}`, size: "sm", color: "#475569" },
          { type: "text", text: `👤 ${staffName}`, size: "sm", color: "#475569" },
          { type: "text", text: `💰 ${price.toLocaleString()} บาท`, size: "sm", color: "#475569" },
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
            action: { type: "postback", label: "✅ ยืนยันว่าจะมา", data: `action=confirm_attendance&id=${bookingId}`, displayText: "ยืนยันว่าจะมา" },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "❌ ขอยกเลิกคิว", data: `action=cancel_booking&id=${bookingId}`, displayText: "ขอยกเลิกคิว" },
          },
        ],
      },
    },
  };
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
  const results = { reminded_1h: 0, reminded_2h: 0, reminded_24h: 0, review_requested: 0, errors: 0 };

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

  // ── Pass 1b: 2-hour reminder with Confirm/Cancel Flex buttons ──
  {
    const windowStart = new Date(now.getTime() + (2 * 60 - 10) * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() + (2 * 60 + 10) * 60_000).toISOString();

    const { data, error } = await db
      .from("bookings")
      .select(
        "id, starts_at, ends_at, price, service:services(name), staff:staff(nickname), customer:customers(line_user_id)"
      )
      .eq("shop_id", SHOP_ID)
      .eq("status", "confirmed")
      .is("reminded_2h_at", null)
      .gte("starts_at", windowStart)
      .lte("starts_at", windowEnd);

    if (error) {
      console.error("[cron/reminders] 2h query error", error.message);
      results.errors++;
    } else {
      for (const b of data ?? []) {
        const userId = (b.customer as any)?.line_user_id;
        if (!userId) continue;
        const svcName = (b.service as any)?.name ?? "บริการ";
        const staffName = (b.staff as any)?.nickname ?? "ช่างที่ได้รับมอบหมาย";
        const flex = reminder2hFlex({
          bookingId: b.id,
          serviceName: svcName,
          staffName,
          timeRange: `${fmtTime(b.starts_at)} – ${fmtTime(b.ends_at)}`,
          price: Number(b.price ?? 0),
        });
        const ok = await pushLineMessages(userId, [flex]);
        if (ok) {
          await db
            .from("bookings")
            .update({ reminded_2h_at: now.toISOString() })
            .eq("id", b.id);
          results.reminded_2h++;
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
        const svcName = (b.service as any)?.name ?? "บริการ";
        const staffName = (b.staff as any)?.nickname ?? "ช่างที่ได้รับมอบหมาย";
        const flex = reminder24hFlex({
          bookingId: b.id,
          serviceName: svcName,
          staffName,
          dateLabel: fmtDate(b.starts_at),
          timeRange: `${fmtTime(b.starts_at)} – ${fmtTime(b.ends_at)}`,
        });
        const ok = await pushLineMessages(userId, [flex]);
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

  // ── Pass 4: Birthday bonus points (runs at most once per day) ──
  {
    const todayYmd = now.toISOString().slice(0, 10);
    const { data: shopRow } = await db
      .from("shops")
      .select("birthday_bonus_points, last_birthday_run")
      .eq("id", SHOP_ID)
      .maybeSingle();
    const alreadyRanToday = shopRow?.last_birthday_run === todayYmd;
    const bonus = Number(shopRow?.birthday_bonus_points ?? 0);

    if (!alreadyRanToday && bonus > 0) {
      const monthDay = todayYmd.slice(5); // "MM-DD"
      const { data: celebs } = await db
        .from("customers")
        .select("id, line_user_id, full_name, display_name, points, lifetime_points, birthday")
        .eq("shop_id", SHOP_ID)
        .not("birthday", "is", null);
      const todays = (celebs ?? []).filter((c: any) => String(c.birthday ?? "").slice(5) === monthDay);
      for (const c of todays as any[]) {
        await db
          .from("customers")
          .update({
            points: (c.points ?? 0) + bonus,
            lifetime_points: (c.lifetime_points ?? 0) + bonus,
          })
          .eq("id", c.id);
        if (c.line_user_id) {
          const name = c.full_name ?? c.display_name ?? "คุณลูกค้า";
          await pushLine(c.line_user_id, `🎂 สุขสันต์วันเกิด ${name} ค่ะ!\nทางร้านมอบแต้มพิเศษ ${bonus} แต้มเป็นของขวัญ ใช้แลกส่วนลดในการจองครั้งถัดไปได้เลยนะคะ 🎁`).catch(() => {});
        }
      }
      await db.from("shops").update({ last_birthday_run: todayYmd }).eq("id", SHOP_ID);
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
