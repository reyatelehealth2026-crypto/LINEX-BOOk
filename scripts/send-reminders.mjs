// Cron job: push a 1-hour reminder to each confirmed booking.
// Run hourly (or every 15 min) via Vercel Cron / GitHub Actions / Windows Task Scheduler.
//
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
const TOKEN    = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!SUPA_URL || !SUPA_KEY || !TOKEN) throw new Error("Missing env vars");

const now = new Date();
const windowStart = new Date(now.getTime() + 50 * 60_000).toISOString();
const windowEnd   = new Date(now.getTime() + 70 * 60_000).toISOString();

// 1. Fetch confirmed bookings in the window without reminded_at
const q = new URL(`${SUPA_URL}/rest/v1/bookings`);
q.searchParams.set(
  "select",
  "id,starts_at,ends_at,reminded_at,status,service:services(name),staff:staff(nickname),customer:customers(line_user_id)"
);
q.searchParams.set("status", "eq.confirmed");
q.searchParams.set("reminded_at", "is.null");
q.searchParams.set("starts_at", `gte.${windowStart}`);
q.searchParams.append("starts_at", `lte.${windowEnd}`);

const res = await fetch(q.toString(), {
  headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
});
if (!res.ok) throw new Error(`fetch bookings: ${res.status} ${await res.text()}`);
const bookings = await res.json();
console.log(`Found ${bookings.length} booking(s) to remind.`);

for (const b of bookings) {
  const userId = b.customer?.line_user_id;
  if (!userId) continue;
  const fmt = (iso) =>
    new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
  const text = `⏰ เตือนคิว (อีก 1 ชั่วโมง)\nบริการ: ${b.service?.name ?? "-"}\nเวลา: ${fmt(b.starts_at)} – ${fmt(b.ends_at)}\nช่าง: ${b.staff?.nickname ?? "—"}`;

  const push = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ to: userId, messages: [{ type: "text", text }] })
  });
  if (!push.ok) { console.error("push err:", await push.text()); continue; }

  // mark reminded
  await fetch(`${SUPA_URL}/rest/v1/bookings?id=eq.${b.id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ reminded_at: new Date().toISOString() })
  });
  console.log("Reminded booking", b.id);
}

console.log("Done.");
