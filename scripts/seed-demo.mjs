// Demo seed script — ใส่ข้อมูลตัวอย่างสำหรับ pitch/demo
// Usage: node scripts/seed-demo.mjs
// หมายเหตุ: ใช้ SUPABASE_SERVICE_ROLE_KEY เพื่อ bypass RLS

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
const SHOP_ID  = Number(process.env.DEFAULT_SHOP_ID ?? 1);

if (!SUPA_URL || !SUPA_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const headers = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function upsert(table, data, onConflict) {
  const url = new URL(`${SUPA_URL}/rest/v1/${table}`);
  if (onConflict) url.searchParams.set("on_conflict", onConflict);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(Array.isArray(data) ? data : [data]),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`upsert ${table}: ${res.status} ${txt}`);
  }
  return res.json();
}

async function select(table, params = {}) {
  const url = new URL(`${SUPA_URL}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`select ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

console.log("🌱 Seeding demo data for shop_id =", SHOP_ID, "...\n");

// ── 1. Update shop name ──
{
  const url = new URL(`${SUPA_URL}/rest/v1/shops`);
  url.searchParams.set("id", `eq.${SHOP_ID}`);
  await fetch(url.toString(), {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ name: "ร้านตัดผม Demo", phone: "082-000-0001", address: "ถนนสุขุมวิท กรุงเทพฯ" }),
  });
  console.log("✅ Shop updated: ร้านตัดผม Demo");
}

// ── 2. Services ──
const services = await upsert("services", [
  { shop_id: SHOP_ID, name: "ตัดผมชาย", name_en: "Men's Haircut", duration_min: 45, price: 250, sort_order: 1, active: true },
  { shop_id: SHOP_ID, name: "ตัดผม + สระ", name_en: "Cut + Wash", duration_min: 60, price: 350, sort_order: 2, active: true },
  { shop_id: SHOP_ID, name: "ทำสี", name_en: "Hair Color", duration_min: 120, price: 1200, sort_order: 3, active: true },
  { shop_id: SHOP_ID, name: "ทำเล็บมือ", name_en: "Manicure", duration_min: 60, price: 450, sort_order: 4, active: true },
], "shop_id,name");
console.log(`✅ Services: ${services.length} รายการ`);

// ── 3. Staff ──
const staffData = await upsert("staff", [
  { shop_id: SHOP_ID, name: "พี่โอ๋", nickname: "โอ๋", sort_order: 1, active: true },
  { shop_id: SHOP_ID, name: "น้องมิ้น", nickname: "มิ้น", sort_order: 2, active: true },
], "shop_id,name");
console.log(`✅ Staff: ${staffData.length} คน`);

// ── 4. Staff services (ทุกช่างทำได้ทุกบริการ) ──
const allServices = await select("services", { shop_id: `eq.${SHOP_ID}`, select: "id" });
const allStaff    = await select("staff",    { shop_id: `eq.${SHOP_ID}`, select: "id" });
const ssRows = allStaff.flatMap(s => allServices.map(sv => ({ staff_id: s.id, service_id: sv.id })));
if (ssRows.length > 0) {
  await upsert("staff_services", ssRows, "staff_id,service_id");
  console.log(`✅ Staff-Services: ${ssRows.length} mapping`);
}

// ── 5. Working hours (Mon–Sat 10:00–20:00) ──
await upsert("working_hours", [1,2,3,4,5,6].map(d => ({
  shop_id: SHOP_ID, staff_id: null, day_of_week: d, open_time: "10:00", close_time: "20:00"
})), "shop_id,staff_id,day_of_week");
console.log("✅ Working hours: จันทร์–เสาร์ 10:00–20:00");

// ── 6. Demo customer ──
const customers = await upsert("customers", [{
  shop_id: SHOP_ID,
  line_user_id: "U_demo_customer_001",
  display_name: "คุณสมชาย",
  full_name: "สมชาย ตัวอย่าง",
  phone: "081-234-5678",
  points: 150,
  visit_count: 3,
}], "shop_id,line_user_id");
const demoCustomer = customers[0];
console.log(`✅ Customer: ${demoCustomer.full_name ?? demoCustomer.display_name}`);

// ── 7. Demo bookings (วันนี้ + พรุ่งนี้) ──
const bkSvc = allServices[0];
const bkStaff = allStaff[0];
if (bkSvc && bkStaff && demoCustomer) {
  const bangkokNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const todayStr = bangkokNow.toISOString().slice(0, 10);
  const tmrw = new Date(bangkokNow);
  tmrw.setDate(tmrw.getDate() + 1);
  const tmrwStr = tmrw.toISOString().slice(0, 10);

  const bookings = [
    { shop_id: SHOP_ID, customer_id: demoCustomer.id, service_id: bkSvc.id, staff_id: bkStaff.id,
      starts_at: `${todayStr}T10:00:00+07:00`, ends_at: `${todayStr}T10:45:00+07:00`,
      status: "confirmed", price: bkSvc.price, note: "Demo booking #1" },
    { shop_id: SHOP_ID, customer_id: demoCustomer.id, service_id: bkSvc.id, staff_id: bkStaff.id,
      starts_at: `${todayStr}T11:00:00+07:00`, ends_at: `${todayStr}T11:45:00+07:00`,
      status: "completed", price: bkSvc.price, note: "Demo booking #2" },
    { shop_id: SHOP_ID, customer_id: demoCustomer.id, service_id: allServices[1]?.id ?? bkSvc.id, staff_id: allStaff[1]?.id ?? bkStaff.id,
      starts_at: `${todayStr}T14:00:00+07:00`, ends_at: `${todayStr}T15:00:00+07:00`,
      status: "pending", price: (allServices[1] ?? bkSvc).price, note: "Demo booking #3" },
    { shop_id: SHOP_ID, customer_id: demoCustomer.id, service_id: bkSvc.id, staff_id: bkStaff.id,
      starts_at: `${tmrwStr}T10:00:00+07:00`, ends_at: `${tmrwStr}T10:45:00+07:00`,
      status: "confirmed", price: bkSvc.price, note: "Demo booking #4 (พรุ่งนี้)" },
    { shop_id: SHOP_ID, customer_id: demoCustomer.id, service_id: allServices[2]?.id ?? bkSvc.id, staff_id: allStaff[1]?.id ?? bkStaff.id,
      starts_at: `${tmrwStr}T13:00:00+07:00`, ends_at: `${tmrwStr}T15:00:00+07:00`,
      status: "confirmed", price: (allServices[2] ?? bkSvc).price, note: "Demo booking #5 (พรุ่งนี้)" },
  ];

  const created = await upsert("bookings", bookings);
  console.log(`✅ Bookings: ${created.length} รายการ (วันนี้ + พรุ่งนี้)`);
} else {
  console.warn("⚠️  ข้ามการสร้าง bookings — ไม่มี service/staff/customer");
}

console.log("\n🎉 Seed สำเร็จ! พร้อม Demo แล้ว");
console.log("   Admin Dashboard → /admin");
console.log("   Healthcheck    → /admin/healthcheck");
