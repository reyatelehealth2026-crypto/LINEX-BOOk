// Cron job (multi-tenant): push 1-hour reminders for every shop that has
// LINE credentials configured.  In production, prefer invoking the
// /api/cron/reminders endpoint (Vercel Cron does that) which also handles
// 2h / 24h reminders, reviews, birthdays, and churn pushes.
//
// This script is a lightweight local-dev shortcut for just the 1h reminder.
// Usage: `npm run reminders`

import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) throw new Error("Missing Supabase env vars");

const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

// 1. Get every shop that has a LINE token saved (falls back to env for
//    legacy single-tenant mode).
const shopsRes = await fetch(
  `${SUPA_URL}/rest/v1/shops?select=id,name,slug,line_channel_access_token`,
  { headers: SUPA_HEADERS },
);
if (!shopsRes.ok) throw new Error(`fetch shops: ${shopsRes.status} ${await shopsRes.text()}`);
const shops = await shopsRes.json();

const now = new Date();
const windowStart = new Date(now.getTime() + 50 * 60_000).toISOString();
const windowEnd   = new Date(now.getTime() + 70 * 60_000).toISOString();
let totalReminded = 0;

for (const shop of shops) {
  const token = shop.line_channel_access_token || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) { console.log(`skip ${shop.slug}: no token`); continue; }

  const q = new URL(`${SUPA_URL}/rest/v1/bookings`);
  q.searchParams.set(
    "select",
    "id,starts_at,ends_at,reminded_at,status,service:services(name),staff:staff(nickname),customer:customers(line_user_id)",
  );
  q.searchParams.set("shop_id", `eq.${shop.id}`);
  q.searchParams.set("status", "eq.confirmed");
  q.searchParams.set("reminded_at", "is.null");
  q.searchParams.set("starts_at", `gte.${windowStart}`);
  q.searchParams.append("starts_at", `lte.${windowEnd}`);

  const res = await fetch(q.toString(), { headers: SUPA_HEADERS });
  if (!res.ok) { console.error(`fetch ${shop.slug}: ${res.status}`); continue; }
  const bookings = await res.json();
  if (bookings.length === 0) continue;
  console.log(`[${shop.slug}] ${bookings.length} booking(s) to remind.`);

  for (const b of bookings) {
    const userId = b.customer?.line_user_id;
    if (!userId) continue;
    const fmt = (iso) =>
      new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
    const text = `⏰ เตือนคิว (อีก 1 ชั่วโมง)\nบริการ: ${b.service?.name ?? "-"}\nเวลา: ${fmt(b.starts_at)} – ${fmt(b.ends_at)}\nช่าง: ${b.staff?.nickname ?? "—"}`;

    const push = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] }),
    });
    if (!push.ok) { console.error(`push ${shop.slug}/${b.id}:`, await push.text()); continue; }

    await fetch(`${SUPA_URL}/rest/v1/bookings?id=eq.${b.id}`, {
      method: "PATCH",
      headers: { ...SUPA_HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ reminded_at: new Date().toISOString() }),
    });
    console.log(`  reminded booking ${b.id}`);
    totalReminded++;
  }
}

console.log(`Done. ${totalReminded} reminders sent across ${shops.length} shops.`);
