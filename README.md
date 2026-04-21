# 💚 LineBook — Multi-tenant LINE Booking SaaS

ระบบจองคิวผ่าน LINE แบบ **SaaS multi-tenant** สำหรับร้านเสริมสวย ร้านทำเล็บ และสปา
เจ้าของร้านสมัครเองได้ที่ `/signup` เลือกพรีเซทธุรกิจ (Salon / Nail / Spa) ผูก LINE OA ของร้านเอง
แล้วใช้งานได้ที่ subdomain ของร้าน เช่น `mysalon.linebook.app`

**Stack**: Next.js 16 (App Router) · Supabase (Postgres + Realtime) · LINE Messaging API · LIFF v2 · Tailwind

## 🏢 Multi-tenant model
- 1 deployment ของ LineBook รองรับหลายร้าน (tenants)
- 1 ร้าน = 1 LINE OA ของร้านเอง (credentials เก็บใน `shops` table)
- routing ผ่าน subdomain: `<slug>.linebook.app` → Next.js middleware → shop context
- webhook (`/api/line/webhook`) resolves shop จาก `destination` ใน payload
- admin auth scoped ต่อร้าน (ดู `admin_users` table)

---

## ✨ ฟีเจอร์

- **LIFF booking flow** — เลือกบริการ → ช่าง → วัน (วันนี้ + 7 วันถัดไป) → slot ว่าง → ยืนยัน
- **Rich menu 6 ปุ่ม** ใช้ `postback` ไม่รบกวนเพื่อน เปิด LIFF เฉพาะจำเป็น
- **CRM card** — Flex message โชว์ชื่อ, เบอร์, แต้มสะสม, จำนวนครั้ง
- **Customer registration** (optional) — ลงทะเบียนรับ 50 แต้ม ใช้บริการแล้วได้แต้มเพิ่ม
- **Push reminder** แจ้งเตือนก่อนคิว 1 ชม. (cron)
- **Admin panel** realtime — confirm / complete (บวกแต้มอัตโนมัติ) / cancel / no-show
- **i18n ไทย/อังกฤษ** toggle ใน LIFF
- **Double-booking prevention** ที่ DB ผ่าน exclusion constraint

---

## 🗺️ Architecture

```
LINE App
  ├── Rich Menu (postback/URI) ──► POST /api/line/webhook ─► Supabase
  ├── Chat ──────────────────────► POST /api/line/webhook
  └── LIFF (Mini App) ──fetch──► /api/catalog, /api/bookings, /api/customers/...

Admin browser ──fetch+realtime──► /api/bookings, /api/admin/*
                                   Supabase Realtime channel
```

---

## 🚀 Setup

### 1. Install

```bash
npm install
```

### 2. สร้าง Supabase project

1. ไปที่ <https://supabase.com> → New Project
2. เปิด **SQL Editor** → Run `supabase/schema.sql`
3. เปิด **Project Settings → API** แล้ว copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` *(อย่าเผยสู่ client)*

### 3. Platform env (.env.local)

คัดลอกจาก `.env.example` แล้วเติมค่า **Supabase + ROOT_DOMAIN** เท่านั้น
(LINE credentials เป็นของแต่ละร้าน ลูกค้ากรอกเองตอน signup)

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ROOT_DOMAIN=linebook.app       # local dev: ใช้ "localhost"
```

### 4. Run migrations

รัน SQL ทั้งหมดใน `supabase/schema.sql` + ทุกไฟล์ใน `supabase/migrations/` ตามลำดับ
ไฟล์สำคัญสำหรับ SaaS mode: `011_saas_multitenant.sql`

### 5. Dev + test multi-tenant

```bash
npm run dev
```

- เปิด `http://localhost:3000` → marketing + signup
- ลงทะเบียนร้านทดสอบผ่าน `/signup` (ต้องมี LINE OA + LIFF ของร้านทดสอบเอง)
- หลัง signup redirect ไป `http://<slug>.localhost:3000/admin/setup`

> Chrome/Safari รองรับ wildcard `*.localhost` โดยอัตโนมัติ ไม่ต้องแก้ /etc/hosts

สำหรับ dev LIFF + webhook บน localhost ใช้ **ngrok**:
```bash
ngrok http 3000
# แล้ว update LIFF Endpoint + Webhook URL ใน LINE console
```

### 6. Rich menu (per-shop, อัตโนมัติ)

หลัง signup เจ้าของร้านกดปุ่ม "ติดตั้ง Rich Menu" ในหน้า `/admin/setup` — ระบบจะเรียก
`uploadRichMenuForShop(shopId)` (ดู `src/lib/rich-menu.ts`) โดยใช้ token ของร้านเอง
ภาพ default อ่านจาก `scripts/richmenu.png` (optional)

### 7. Cron reminder (multi-shop)

`/api/cron/reminders` วนทุกร้านที่ onboarding เสร็จแล้ว แล้วส่ง push ด้วย token ของ
แต่ละร้านเอง — ใน `vercel.json` ตั้ง schedule ไว้แล้ว

---

## 📁 โครงสร้าง

| Path | Purpose |
|---|---|
| `supabase/schema.sql` | Schema + seed (services/staff/hours) + RLS |
| `src/app/liff/` | LIFF Mini App (booking, my-bookings, profile, services) |
| `src/app/admin/` | Admin panel (realtime today queue) |
| `src/app/api/line/webhook/` | LINE events (follow, postback, message) |
| `src/app/api/bookings/` | Create / list / slots / cancel |
| `src/app/api/customers/register/` | Register + lookup |
| `src/app/api/admin/bookings/[id]/` | Confirm / complete / cancel |
| `src/lib/line.ts` | Verify signature · reply · push · profile |
| `src/lib/flex.ts` | Flex message builders (welcome, profile, my-bookings, confirm) |
| `src/lib/booking.ts` | Slot availability calculator |
| `src/lib/i18n.tsx` | th/en locale switcher |
| `scripts/setup-richmenu.mjs` | Create + upload + set default rich menu |
| `scripts/send-reminders.mjs` | 1-hour-ahead reminder pusher |

---

## 🧪 สิ่งที่ต้องทดสอบ

- [ ] Follow LINE OA → ได้ welcome flex message
- [ ] กด rich menu "จองคิว" → เปิด LIFF → จองสำเร็จ → ได้ push ยืนยัน
- [ ] กด "คิวของฉัน" → แสดง carousel ของ booking
- [ ] กด "โปรไฟล์" ก่อนลงทะเบียน → เห็นปุ่มลงทะเบียน; หลังลงทะเบียน → เห็นแต้ม
- [ ] จอง 2 คนทับช่างคนเดียวกัน → DB reject ด้วย 409 (`23P01`)
- [ ] แอดมินกด "เสร็จสิ้น" → ลูกค้าได้แต้ม + visit_count +1 + notification
- [ ] เปิด 2 แท็บแอดมิน + จองจาก LIFF → queue เด้งแบบ realtime

---

## 🔐 Security notes

- Service role key ใช้ใน **API routes only**, ไม่มีวันถูก expose ที่ client
- LINE webhook verify signature ด้วย HMAC-SHA256
- Admin login ใช้ password ฝั่ง client `sessionStorage` → ส่งเป็น `x-admin-password` header; เพียงพอสำหรับ MVP ร้านเดียว. สำหรับ production แนะนำเพิ่ม NextAuth + Supabase Auth
- LIFF: MVP ใช้ `lineUserId` ที่ claim จาก client ตรง ๆ; เพื่อความเข้มงวด verify `idToken` ที่ server ผ่าน `https://api.line.me/oauth2/v2.1/verify`

---

## 🛣️ Next steps (TODO)

- [ ] หน้า admin `services` / `staff` / `hours` สำหรับแก้ catalog
- [ ] หน้า admin `customers` (list + CRM drill-down)
- [ ] Cron route `/api/cron/reminders` (สำหรับ Vercel cron)
- [ ] LINE idToken verification ที่ API
- [ ] Multi-shop (ใส่ shop_id ทุก request + RLS)
- [ ] Upload รูปบริการ/ช่างผ่าน Supabase Storage
