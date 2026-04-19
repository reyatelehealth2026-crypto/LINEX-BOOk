# 💚 LineBook — LINE Booking (Barber / Salon / Nails)

ระบบจองคิวผ่าน LINE สำหรับร้านเล็ก–กลาง เช่น ร้านตัดผม เสริมสวย ทำเล็บ
ลูกค้าจองผ่าน **LIFF Mini App** + แอดมินจัดการผ่านหน้าเว็บ realtime

**Stack**: Next.js 14 (App Router) · Supabase (Postgres + Realtime) · LINE Messaging API · LIFF v2 · Tailwind

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

### 3. ตั้งค่า LINE OA

ที่ <https://developers.line.biz/console/>:

1. เปิด **Provider → Messaging API channel** ของ OA ที่มีอยู่
2. **Channel access token (long-lived)** → copy ไปใส่ `LINE_CHANNEL_ACCESS_TOKEN`
3. **Channel secret** → `LINE_CHANNEL_SECRET`
4. ใน *Messaging API* tab:
   - ปิด **Auto-reply messages** (Off)
   - เปิด **Webhooks** = Enabled
   - **Webhook URL** = `https://<your-domain>/api/line/webhook` (ต้อง HTTPS — ใช้ Vercel หรือ ngrok ตอน dev)

### 4. สร้าง LIFF

1. ใน channel เดียวกัน → **LIFF** tab → **Add**
2. Size: **Full** / Endpoint URL: `https://<your-domain>/liff`
3. Scopes: `profile`, `openid`
4. Copy **LIFF ID** → `NEXT_PUBLIC_LIFF_ID`

### 5. `.env.local`

คัดลอกจาก `.env.example` แล้วเติมค่า

### 6. Dev

```bash
npm run dev
# เปิด http://localhost:3000 (หน้าแอดมิน)
# LIFF ต้องเปิดผ่าน https://liff.line.me/<LIFF_ID>
```

สำหรับ dev LIFF + webhook บน localhost ใช้ **ngrok**:
```bash
ngrok http 3000
# แล้ว update LIFF Endpoint + Webhook URL ใน LINE console
```

### 7. Rich menu

1. ทำภาพ **2500×1686 PNG** แบ่ง 2 แถว × 3 คอลัมน์ ตาม `scripts/setup-richmenu.mjs`
2. วางที่ `scripts/richmenu.png`
3. รัน:
   ```bash
   npm run richmenu
   ```

### 8. Cron reminder

Set ให้ run ทุก ~10–15 นาที:

- **Vercel**: เพิ่มใน `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/reminders", "schedule": "*/15 * * * *" }] }
  ```
  *(ต้องสร้าง route `/api/cron/reminders` ที่เรียก logic จาก `scripts/send-reminders.mjs`)*
- **หรือ** รันเองบน VPS: `*/15 * * * * cd /app && npm run reminders`

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
