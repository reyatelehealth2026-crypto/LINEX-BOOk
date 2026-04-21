import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, type Shop } from "@/lib/supabase";
import { runWithShopContext } from "@/lib/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-invocation token — set by runWithShopContext per shop.
function currentToken(): string {
  // Lazy require avoids a circular during route build; line.ts doesn't
  // depend on this file, so a direct require works.
  const { currentAccessToken } = require("@/lib/request-context") as typeof import("@/lib/request-context");
  return currentAccessToken() || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
}

async function pushLine(userId: string, text: string) {
  const token = currentToken();
  if (!token) return false;
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    console.error("[cron/reminders] push failed", userId, await res.text());
    return false;
  }
  return true;
}

async function pushLineMessages(userId: string, messages: any[]) {
  const token = currentToken();
  if (!token) return false;
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!res.ok) {
    console.error("[cron/reminders] push (flex) failed", userId, await res.text());
    return false;
  }
  return true;
}

function reminder24hFlex(params: { bookingId: number; serviceName: string; staffName: string; dateLabel: string; timeRange: string }) {
  const { bookingId, serviceName, staffName, dateLabel, timeRange } = params;
  return {
    type: "flex" as const,
    altText: `📅 เตือนนัดพรุ่งนี้ ${serviceName} ${timeRange}`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", backgroundColor: "#0ea5e9", paddingAll: "16px", contents: [
        { type: "text", text: "📅 เตือนนัดพรุ่งนี้", color: "#ffffff", weight: "bold", size: "md" },
        { type: "text", text: dateLabel, color: "#e0f2fe", size: "xs", margin: "xs" },
      ]},
      body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
        { type: "text", text: serviceName, weight: "bold", size: "lg", wrap: true },
        { type: "text", text: `⏱ ${timeRange}`, size: "sm", color: "#475569" },
        { type: "text", text: `👤 ${staffName}`, size: "sm", color: "#475569" },
      ]},
      footer: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
        { type: "button", style: "primary", color: "#06c755", action: { type: "postback", label: "✅ พรุ่งนี้ไปแน่นอน", data: `action=confirm_attendance&id=${bookingId}`, displayText: "พรุ่งนี้ไปแน่นอน" } },
        { type: "button", style: "secondary", action: { type: "postback", label: "🔄 ขอเลื่อนเวลา", data: `action=reschedule_booking&id=${bookingId}` } },
        { type: "button", style: "link", action: { type: "postback", label: "❌ ขอยกเลิกคิว", data: `action=cancel_booking&id=${bookingId}` } },
      ]},
    },
  };
}

function reminder2hFlex(params: { bookingId: number; serviceName: string; staffName: string; timeRange: string; price: number }) {
  const { bookingId, serviceName, staffName, timeRange, price } = params;
  return {
    type: "flex" as const,
    altText: `⏰ อีก 2 ชั่วโมงถึงคิว ${serviceName}`,
    contents: {
      type: "bubble",
      header: { type: "box", layout: "vertical", backgroundColor: "#06c755", paddingAll: "16px", contents: [
        { type: "text", text: "⏰ อีก 2 ชั่วโมงถึงคิว", color: "#ffffff", weight: "bold", size: "md" },
        { type: "text", text: "กรุณายืนยันการมาตามนัด", color: "#d1fae5", size: "xs", margin: "xs" },
      ]},
      body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
        { type: "text", text: serviceName, weight: "bold", size: "lg", wrap: true },
        { type: "text", text: `⏱ ${timeRange}`, size: "sm", color: "#475569" },
        { type: "text", text: `👤 ${staffName}`, size: "sm", color: "#475569" },
        { type: "text", text: `💰 ${price.toLocaleString()} บาท`, size: "sm", color: "#475569" },
      ]},
      footer: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
        { type: "button", style: "primary", color: "#06c755", action: { type: "postback", label: "✅ ยืนยันว่าจะมา", data: `action=confirm_attendance&id=${bookingId}`, displayText: "ยืนยันว่าจะมา" } },
        { type: "button", style: "secondary", action: { type: "postback", label: "❌ ขอยกเลิกคิว", data: `action=cancel_booking&id=${bookingId}`, displayText: "ขอยกเลิกคิว" } },
      ]},
    },
  };
}

function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: tz });
}
function fmtDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: tz });
}

type Results = { reminded_1h: number; reminded_2h: number; reminded_24h: number; review_requested: number; errors: number; churn_pushed: number };

async function runForShop(shop: Shop, now: Date, results: Results) {
  const db = supabaseAdmin();
  const tz = shop.timezone || "Asia/Bangkok";

  // ── Pass 1: 1-hour reminder (window: 50–70 min from now) ──
  {
    const windowStart = new Date(now.getTime() + 50 * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() + 70 * 60_000).toISOString();
    const { data, error } = await db
      .from("bookings")
      .select("id, starts_at, ends_at, service:services(name), staff:staff(nickname), customer:customers(line_user_id)")
      .eq("shop_id", shop.id).eq("status", "confirmed").is("reminded_at", null)
      .gte("starts_at", windowStart).lte("starts_at", windowEnd);
    if (error) { console.error("[cron] 1h", shop.slug, error.message); results.errors++; }
    else for (const b of data ?? []) {
      const userId = (b.customer as any)?.line_user_id;
      if (!userId) continue;
      const svcName = (b.service as any)?.name ?? "-";
      const staffName = (b.staff as any)?.nickname ?? "—";
      const text = `⏰ เตือนคิว (อีก 1 ชั่วโมง)\nบริการ: ${svcName}\nเวลา: ${fmtTime(b.starts_at, tz)} – ${fmtTime(b.ends_at, tz)}\nช่าง: ${staffName}`;
      const ok = await pushLine(userId, text);
      if (ok) { await db.from("bookings").update({ reminded_at: now.toISOString() }).eq("id", b.id); results.reminded_1h++; }
      else results.errors++;
    }
  }

  // ── Pass 1b: 2-hour reminder ──
  {
    const windowStart = new Date(now.getTime() + (2 * 60 - 10) * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() + (2 * 60 + 10) * 60_000).toISOString();
    const { data, error } = await db
      .from("bookings")
      .select("id, starts_at, ends_at, price, service:services(name), staff:staff(nickname), customer:customers(line_user_id)")
      .eq("shop_id", shop.id).eq("status", "confirmed").is("reminded_2h_at", null)
      .gte("starts_at", windowStart).lte("starts_at", windowEnd);
    if (error) { console.error("[cron] 2h", shop.slug, error.message); results.errors++; }
    else for (const b of data ?? []) {
      const userId = (b.customer as any)?.line_user_id;
      if (!userId) continue;
      const flex = reminder2hFlex({
        bookingId: b.id,
        serviceName: (b.service as any)?.name ?? "บริการ",
        staffName: (b.staff as any)?.nickname ?? "ช่างที่ได้รับมอบหมาย",
        timeRange: `${fmtTime(b.starts_at, tz)} – ${fmtTime(b.ends_at, tz)}`,
        price: Number(b.price ?? 0),
      });
      const ok = await pushLineMessages(userId, [flex]);
      if (ok) { await db.from("bookings").update({ reminded_2h_at: now.toISOString() }).eq("id", b.id); results.reminded_2h++; }
      else results.errors++;
    }
  }

  // ── Pass 2: 24-hour reminder ──
  {
    const windowStart = new Date(now.getTime() + (24 * 60 - 10) * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() + (24 * 60 + 10) * 60_000).toISOString();
    const { data, error } = await db
      .from("bookings")
      .select("id, starts_at, ends_at, service:services(name), staff:staff(nickname), customer:customers(line_user_id)")
      .eq("shop_id", shop.id).eq("status", "confirmed").is("reminded_24h_at", null)
      .gte("starts_at", windowStart).lte("starts_at", windowEnd);
    if (error) { console.error("[cron] 24h", shop.slug, error.message); results.errors++; }
    else for (const b of data ?? []) {
      const userId = (b.customer as any)?.line_user_id;
      if (!userId) continue;
      const flex = reminder24hFlex({
        bookingId: b.id,
        serviceName: (b.service as any)?.name ?? "บริการ",
        staffName: (b.staff as any)?.nickname ?? "ช่างที่ได้รับมอบหมาย",
        dateLabel: fmtDate(b.starts_at, tz),
        timeRange: `${fmtTime(b.starts_at, tz)} – ${fmtTime(b.ends_at, tz)}`,
      });
      const ok = await pushLineMessages(userId, [flex]);
      if (ok) { await db.from("bookings").update({ reminded_24h_at: now.toISOString() }).eq("id", b.id); results.reminded_24h++; }
      else results.errors++;
    }
  }

  // ── Pass 3: Review request ──
  {
    const windowStart = new Date(now.getTime() - 25 * 60 * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() - 23 * 60 * 60_000).toISOString();
    const { data, error } = await db
      .from("bookings")
      .select("id, ends_at, service:services(name), customer:customers(line_user_id, display_name, full_name)")
      .eq("shop_id", shop.id).eq("status", "completed").is("review_requested_at", null)
      .gte("ends_at", windowStart).lte("ends_at", windowEnd);
    if (error) { console.error("[cron] review", shop.slug, error.message); results.errors++; }
    else {
      const liffId = shop.liff_id ?? process.env.NEXT_PUBLIC_LIFF_ID ?? "";
      for (const b of data ?? []) {
        const userId = (b.customer as any)?.line_user_id;
        if (!userId) continue;
        const svcName = (b.service as any)?.name ?? "บริการ";
        const customerName = (b.customer as any)?.full_name ?? (b.customer as any)?.display_name ?? "คุณลูกค้า";
        const reviewLink = liffId ? `\nhากรุณารีวิวได้ที่ → https://liff.line.me/${liffId}/review?booking=${b.id}` : "";
        const text = `💛 ขอบคุณที่ใช้บริการนะคะ ${customerName}\nหวังว่า${svcName}จะถูกใจนะคะ\nรบกวนรีวิวสักนิดได้เลยค่ะ ⭐${reviewLink}`;
        const ok = await pushLine(userId, text);
        if (ok) { await db.from("bookings").update({ review_requested_at: now.toISOString() }).eq("id", b.id); results.review_requested++; }
        else results.errors++;
      }
    }
  }

  // ── Pass 4: Birthday bonus ──
  {
    const todayYmd = now.toISOString().slice(0, 10);
    const { data: shopRow } = await db.from("shops").select("birthday_bonus_points, last_birthday_run").eq("id", shop.id).maybeSingle();
    const alreadyRanToday = (shopRow as any)?.last_birthday_run === todayYmd;
    const bonus = Number((shopRow as any)?.birthday_bonus_points ?? 0);
    if (!alreadyRanToday && bonus > 0) {
      const monthDay = todayYmd.slice(5);
      const { data: celebs } = await db
        .from("customers")
        .select("id, line_user_id, full_name, display_name, points, lifetime_points, birthday")
        .eq("shop_id", shop.id).not("birthday", "is", null);
      const todays = (celebs ?? []).filter((c: any) => String(c.birthday ?? "").slice(5) === monthDay);
      for (const c of todays as any[]) {
        await db.from("customers").update({
          points: (c.points ?? 0) + bonus,
          lifetime_points: (c.lifetime_points ?? 0) + bonus,
        }).eq("id", c.id);
        if (c.line_user_id) {
          const name = c.full_name ?? c.display_name ?? "คุณลูกค้า";
          await pushLine(c.line_user_id, `🎂 สุขสันต์วันเกิด ${name} ค่ะ!\nทางร้านมอบแต้มพิเศษ ${bonus} แต้มเป็นของขวัญ ใช้แลกส่วนลดในการจองครั้งถัดไปได้เลยนะคะ 🎁`).catch(() => {});
        }
      }
      await db.from("shops").update({ last_birthday_run: todayYmd } as any).eq("id", shop.id);
    }
  }

  // ── Pass 5: Points expiry ──
  {
    const { data: shopRow } = await db.from("shops").select("points_expiry_days").eq("id", shop.id).maybeSingle();
    const expiryDays = Number((shopRow as any)?.points_expiry_days ?? 0);
    if (expiryDays > 0) {
      const cutoff = new Date(now.getTime() - expiryDays * 86_400_000).toISOString();
      const warnCutoff = new Date(now.getTime() - (expiryDays - 7) * 86_400_000).toISOString();
      const { data: expiring } = await db
        .from("customers")
        .select("id, line_user_id, full_name, display_name, points, last_visit_at")
        .eq("shop_id", shop.id).gt("points", 0).not("last_visit_at", "is", null)
        .lte("last_visit_at", warnCutoff).gt("last_visit_at", cutoff);
      for (const c of (expiring ?? []) as any[]) {
        const name = c.full_name ?? c.display_name ?? "คุณลูกค้า";
        if (c.line_user_id) {
          await pushLine(c.line_user_id, `⚠️ แต้มสะสม ${c.points} แต้มของ ${name} ใกล้หมดอายุแล้วค่ะ!\nกรุณาจองบริการหรือแลกแต้มภายใน 7 วัน ก่อนแต้มหมดอายุนะคะ 🏃`).catch(() => {});
        }
      }
      await db.from("customers").update({ points: 0 } as any)
        .eq("shop_id", shop.id).gt("points", 0).not("last_visit_at", "is", null).lte("last_visit_at", cutoff);
    }
  }

  // ── Pass 6: Churn risk ──
  {
    const churnCutoffDays = 45;
    const churnDate = new Date(now.getTime() - churnCutoffDays * 86_400_000).toISOString();
    const activityDate = new Date(now.getTime() - 90 * 86_400_000).toISOString();
    const todayYmd = now.toISOString().slice(0, 10);
    const { data: atRisk } = await db
      .from("customers")
      .select("id, line_user_id, full_name, display_name, points, churn_push_at")
      .eq("shop_id", shop.id).gte("visit_count", 2).not("last_visit_at", "is", null)
      .lte("last_visit_at", churnDate).gte("last_visit_at", activityDate);
    for (const c of (atRisk ?? []) as any[]) {
      if (c.churn_push_at && String(c.churn_push_at).slice(0, 10) > new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10)) continue;
      if (!c.line_user_id) continue;
      const name = c.full_name ?? c.display_name ?? "คุณลูกค้า";
      const pointsText = c.points > 0 ? `\n(คุณมีแต้มสะสม ${c.points} แต้ม รอแลกส่วนลดอยู่นะคะ 🎁)` : "";
      await pushLine(c.line_user_id, `😢 ไม่ได้เจอ ${name} นานมากเลยค่ะ!\nทางร้านคิดถึงนะคะ ลองจองบริการใหม่ได้เลย มีโปรโมชั่นรอคุณอยู่ค่ะ 💚${pointsText}`).catch(() => {});
      await db.from("customers").update({ churn_push_at: todayYmd } as any).eq("id", c.id);
    }
    results.churn_pushed += (atRisk ?? []).length;
  }

  await db.from("shops").update({ cron_last_run: now.toISOString() } as any).eq("id", shop.id);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();
  const now = new Date();
  const results: Results = { reminded_1h: 0, reminded_2h: 0, reminded_24h: 0, review_requested: 0, errors: 0, churn_pushed: 0 };

  // Multi-tenant: iterate every completed shop with LINE creds.
  const { data: shops } = await db
    .from("shops")
    .select("*")
    .or("line_channel_access_token.not.is.null,id.eq." + Number(process.env.DEFAULT_SHOP_ID ?? 1));

  for (const raw of (shops ?? []) as any[]) {
    const shop = raw as Shop;
    const token = shop.line_channel_access_token || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    if (!token) continue; // no credentials — skip
    await runWithShopContext(
      {
        shop,
        accessToken: token,
        channelSecret: shop.line_channel_secret ?? process.env.LINE_CHANNEL_SECRET ?? "",
        liffId: shop.liff_id,
      },
      async () => {
        await runForShop(shop, now, results);
      },
    );
  }

  console.log("[cron/reminders] done", results);
  return NextResponse.json({ ok: true, ...results, ran_at: now.toISOString(), shops_processed: (shops ?? []).length });
}
