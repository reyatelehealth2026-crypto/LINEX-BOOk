# LineBook — Product Roadmap
> ระบบจองคิวผ่าน LINE สำหรับธุรกิจไทย | ฉบับ Long-term Strategic Roadmap

---

## สถานะปัจจุบัน (Done ✅)

| Feature | สถานะ |
|---|---|
| LIFF Booking Flow (4 steps) | ✅ |
| Staff selection + Time slots | ✅ |
| Admin dashboard (Today's queue) | ✅ |
| My Bookings + Cancel/Reschedule | ✅ |
| Waitlist system | ✅ |
| Customer profile + Points | ✅ |
| Message templates + LINE notifications | ✅ |
| AI Chat settings | ✅ |
| Working hours management | ✅ |
| LINEX Design System merge | ✅ |
| TH/EN bilingual i18n | ✅ |

---

## Phase 1 — Conversion Engine (1–2 เดือน)
> **เป้าหมาย**: เพิ่ม Booking conversion rate + ลด No-show

### 1.1 Smart Reminders
- [x] Reminder ก่อนนัด 24h **Flex** พร้อมปุ่ม confirm/reschedule/cancel — `reminder24hFlex`
- [x] Reminder 2h พร้อมปุ่ม Confirm/ยกเลิก (Flex) — `reminder2hFlex`
- [x] Reminder ก่อนนัด 1h (text)
- [x] Rebook CTA หลังยกเลิก (flex ปุ่ม "จองใหม่ บริการเดิม") — `rebookCtaFlex`

### 1.2 Deposit & No-Show Prevention
- [ ] **Defer** ระบบมัดจำ PromptPay QR / LINE Pay (ต้องมี merchant account)
- [x] บล็อกลูกค้า no-show เกิน 2 ครั้ง (auto-block 30 วัน) — migration 007 + trigger `bump_no_show_counter`
- [ ] **Defer** Auto-charge มัดจำ (ขึ้นกับ payment 3.x)

### 1.3 Smart Booking Suggestions
- [x] แนะนำ slot ว่างใกล้เคียง เมื่อ slot เต็ม — `nearbySlotSuggestions` + `/api/bookings/slots?mode=nearby`
- [x] "Popular times" API (histogram) — `popularTimesByHour` + `/api/bookings/slots?mode=popular`
- [ ] Recurring booking (จอง "ทุกอาทิตย์") — **backlog**

### 1.4 Review & Social Proof
- [x] หน้า Review post-service (star + text) — `/liff/review`
- [x] Review request push หลังเสร็จบริการ 24h — cron pass 3
- [x] แสดง avg rating + count บนหน้า Services — `/api/reviews/summary`
- [x] Admin reply to reviews — `PATCH /api/reviews` + column `reply/replied_at`
- [ ] Export reviews → Google My Business (manual guide) — **docs task**

---

## Phase 2 — Loyalty & Retention (2–4 เดือน)
> **เป้าหมาย**: เพิ่ม Customer LTV + Repeat visits

### 2.1 Points 2.0
- [x] Points tiers (Bronze / Silver / Gold / Platinum) — `@/lib/loyalty` `tierFor/tierProgress`
- [x] Redeem: แลกแต้มเป็น coupon ส่วนลด — `redeemPoints` + `POST /api/loyalty`
- [x] Birthday bonus points อัตโนมัติ — cron pass 4 (idempotent per day)
- [x] Referral program — `referral_code` + `applyReferral`, bonus ทั้งสองฝั่ง
- [x] `lifetime_points` tracking สำหรับ tier computation
- [ ] Points expiry policy cron (DB column พร้อมแล้วใน migration 008)

### 2.2 Promotions Engine
- [x] Coupon / Promo code engine — table `coupons` + `/api/coupons` (CRUD + validate) + wire เข้า POST /api/bookings (`couponCode`)
- [x] Per-customer limit + max_uses + expiry + service-scope support
- [ ] Flash sale (time-window coupons) — **schema รองรับ starts_at/expires_at แล้ว, เหลือแค่ UI admin**
- [ ] Bundle packages — **Defer** (ขึ้นกับ 3.3 Package)
- [ ] Broadcast coupon ผ่าน LINE — **backlog** (รอ Messaging API push broadcast)

### 2.3 Customer Segments & CRM
- [x] Segment: New / Returning / At-risk / VIP — `customerSegments` + `/api/admin/analytics?mode=segments`
- [x] LTV report (avg LTV รวมใน KPI) — `shopKPIs.avg_ltv`
- [ ] Automated win-back campaign ตาม at-risk segment — **backlog** (ใช้ร่วม broadcast)
- [ ] Export CSV สำหรับ broadcast — **backlog**

---

## Phase 3 — Payments & Revenue (3–5 เดือน) — **Defer ทั้ง phase**
> **สถานะ**: รอ merchant/bank integration (LINE Pay, PromptPay). ทำ code ล่วงหน้าไม่ได้ — ต้องเปิดบัญชีกับ provider ก่อน
> **เป้าหมาย**: ปิด Revenue loop ใน LINE ไม่ต้องออก app

### 3.1 LINE Pay Integration
- [ ] ชำระเงินใน LIFF ด้วย LINE Pay (ไม่ออก chat)
- [ ] ชำระมัดจำ + ส่วนที่เหลือ (split payment)
- [ ] Auto-refund เมื่อร้านยกเลิกนัด

### 3.2 PromptPay QR
- [ ] Generate QR ใน LIFF สำหรับ pay deposit
- [ ] Admin: ยืนยันรับชำระ + mark booking paid
- [ ] Payment history ใน My Bookings

### 3.3 Package & Subscription
- [ ] ขาย Package ล่วงหน้า (เช่น 10 บริการ)
- [ ] Subscription monthly (รับบริการ X ครั้ง/เดือน)
- [ ] Package balance แสดงใน profile

---

## Phase 4 — AI & Intelligence (4–7 เดือน)
> **เป้าหมาย**: ระบบ "คิดแทน" ทั้งร้านและลูกค้า — จุดที่แข่งขันได้สูงสุด

### 4.1 AI Receptionist (LINE Chat)
- [x] Chatbot ตอบ: "มีคิวว่างไหมพรุ่งนี้?" → จองได้เลยใน chat — `parseBookingIntent` + `handleAIBooking`
- [x] รองรับภาษาไทยธรรมชาติ (Z.AI GLM + Thai-NLP) — `@/lib/zai`, `@/lib/thai-nlp`
- [x] Fallback → human handoff เมื่อ bot ไม่เข้าใจ — `@/lib/handoff` + migration 005
- [x] Intent: จอง, ยกเลิก, ถามราคา, ถามเวลาทำการ
- [x] Admin UI: ตั้งค่า bot name / temperature / custom rules — `/admin/ai-settings`

### 4.2 Demand Forecasting
- [x] Predict busy days (avg per weekday จาก 60-day history) — `demandForecast` + `/api/admin/analytics?mode=forecast`
- [ ] UI: หน้า admin แสดงพยากรณ์ + แนะนำเปิดปิด slot — **backlog** (มี API แล้ว)
- [ ] Alert push ไปหา admin เมื่อคาดว่า full — **backlog**

### 4.3 Dynamic Pricing (Revenue Management) — **Defer** (รอ Phase 3 payments)
- [ ] ราคาสูงขึ้น off-peak / peak
- [ ] Early-bird / Last-minute discount

### 4.4 Smart Staff Assignment
- [x] Auto-assign ช่าง least-busy เมื่อลูกค้าไม่เจาะจง — `suggestLeastBusyStaff` + integrated in `POST /api/bookings`
- [ ] แนะนำช่างตามประวัติลูกค้า — **backlog** (ต้องดู historical per customer)

### 4.5 Predictive Churn
- [ ] คะแนน churn risk ต่อลูกค้า
- [ ] Auto-trigger campaign เมื่อ risk สูง
- [ ] A/B test message effectiveness

---

## Phase 5 — Multi-Vendor SaaS (6–12 เดือน) — **Defer ทั้ง phase**
> **สถานะ**: ต้อง redesign infra (multi-tenant), domain/subdomain routing, billing system — แยกเป็น project หลังได้ product-market fit
> **เป้าหมาย**: เปลี่ยน LineBook จาก single-shop เป็น SaaS Platform

### 5.1 Multi-Shop Architecture
- [ ] Shop onboarding wizard (ตั้งค่าร้านใน 5 นาที)
- [ ] Shop sub-domain: `myshop.linebook.app`
- [ ] Plan tiers: Free / Pro / Business / Enterprise

### 5.2 Franchise & Chain Management
- [ ] Central admin ดู revenue ทุกสาขา
- [ ] Cross-branch booking (ลูกค้าจองสาขาอื่นได้)
- [ ] Shared customer profile ข้ามสาขา
- [ ] Branch performance comparison

### 5.3 Marketplace Discovery
- [ ] ลูกค้าค้นหาร้านใกล้เคียงใน LINE Mini App
- [ ] Rating + Reviews แบบ public
- [ ] SEO landing page ต่อร้าน
- [ ] LINE Official Account directory

### 5.4 API & Integrations
- [ ] Public API สำหรับ POS systems
- [ ] Google Calendar sync (ช่าง + ลูกค้า)
- [ ] Google My Business: auto-update hours + availability
- [ ] Zapier / Make integration

---

## Phase 6 — Staff & Operations Excellence (8–14 เดือน) — **บางส่วนเริ่มได้**
> **เป้าหมาย**: เครื่องมือหลังบ้านครบ ลด admin overhead 70%

### 6.1 Staff App (LIFF)
- [ ] หน้า schedule ของช่างแต่ละคนใน LINE
- [ ] Check-in / Check-out ต่อ booking
- [ ] ดูประวัติลูกค้าก่อนเริ่มบริการ (ชอบอะไร, แพ้อะไร)
- [ ] แจ้งเตือน booking ใหม่ใน LINE OA

### 6.2 Commission & Payroll
- [ ] ตั้งค่า commission rate ต่อช่าง / ต่อบริการ
- [ ] สรุป commission รายสัปดาห์/เดือน
- [ ] Export payslip PDF

### 6.3 Inventory & Products
- [ ] จัดการสินค้า/วัสดุที่ใช้ต่อบริการ
- [ ] แจ้งเตือนเมื่อสต็อกต่ำ
- [ ] Cost per service (margin report)

### 6.4 Advanced Analytics Dashboard
- [x] Revenue by service / staff / day-of-week — `/api/admin/analytics?mode=kpi` (by_service, by_staff, by_day_of_week)
- [x] LTV + retention rate + no-show rate — `shopKPIs`
- [ ] UI dashboard page — **backlog** (API พร้อมแล้ว ต่อ UI ได้ทันที)
- [ ] NPS score tracking — **backlog** (ใช้ร่วมกับ reviews rating)
- [ ] Capacity utilization heat map — **backlog**

---

## Phase 7 — Ecosystem & Growth (12–24 เดือน) — **Defer ทั้ง phase**
> **สถานะ**: ขึ้นอยู่กับ business deal + marketplace product — ยังไม่ใช่ MVP code
> **เป้าหมาย**: สร้าง moat ที่คู่แข่งลอกไม่ได้

### 7.1 LineBook Marketplace App
- [ ] LINE Mini App สาธารณะ (ไม่ต้องมี OA ของตัวเอง)
- [ ] ลูกค้า search "ร้านตัดผมใกล้ฉัน" ใน Marketplace
- [ ] Booking จาก Marketplace ตรงได้เลย

### 7.2 Community & Network Effects
- [ ] ลูกค้า share บริการให้เพื่อน (earn points)
- [ ] "ไปด้วยกัน" — Group booking feature
- [ ] Influencer/KOL referral tracking

### 7.3 B2B Vertical Expansion
- [ ] **Dental Clinic** — X-ray records, treatment plans
- [ ] **Fitness Studio** — Class booking, capacity limits, instructor schedules
- [ ] **Spa & Wellness** — Package rooms, duration-based slots
- [ ] **Pet Grooming** — Pet profiles, vaccine records
- [ ] **Tutoring / Coaching** — Recurring sessions, homework tracking

### 7.4 White-Label Solution
- [ ] White-label สำหรับ LINE Official Account Partners
- [ ] Custom branding per shop (colors, logo)
- [ ] Agency dashboard: manage 100+ shops
- [ ] Revenue share model

### 7.5 Data Monetization (Privacy-first)
- [ ] Anonymized trend reports สำหรับ suppliers
- [ ] Industry benchmarking reports
- [ ] Predictive demand ขาย upstream ให้ distributors

---

## จุดขายเหนือคู่แข่ง

| คู่แข่ง | ช่องว่างที่ LineBook ชนะได้ |
|---|---|
| **Fresha** | ไม่มี LINE native, ไม่รองรับไทยดี, ราคาสูง |
| **MindBody** | ซับซ้อนเกินไป, ไม่มี LINE Pay, UI ไม่ friendly สำหรับไทย |
| **Appointy / Calendly** | ไม่มี loyalty, ไม่มี AI, ไม่ใช่ social-first |
| **Google Booking** | ไม่มี chat-based UX, ไม่มี Thai payment |
| **แอป local ทั่วไป** | ไม่มี design system, ไม่มี AI, ไม่ scale |

### LineBook's Unfair Advantages
1. **LINE-native** — ลูกค้าไม่ต้องดาวน์โหลด app ใหม่ (คนไทย 55M คนใช้ LINE)
2. **Conversational Booking** — จองผ่าน chat ได้เลย ไม่ต้องเปิดหน้าเว็บ
3. **AI + Thai NLP** — เข้าใจภาษาไทย slang และความต้องการที่ซับซ้อน
4. **Zero CAC via LINE** — Organic reach ผ่าน OA broadcast ฟรี
5. **Full revenue loop** — จอง → ชำระ → Loyalty → Rebook ทั้งหมดใน LINE
6. **LINEX Design System** — UI สวยกว่าคู่แข่งในตลาด ทุก industry
7. **SaaS + Marketplace** — Network effect เมื่อ shops มากขึ้น

---

## Business Model

| Tier | ราคา/เดือน | Features |
|---|---|---|
| **Free** | ฿0 | 1 staff, 50 bookings/mo, basic notifications |
| **Starter** | ฿299 | 3 staff, unlimited bookings, AI reminders, reviews |
| **Pro** | ฿799 | 10 staff, payments, loyalty 2.0, analytics |
| **Business** | ฿1,999 | Unlimited staff, AI receptionist, dynamic pricing |
| **Enterprise** | Custom | Multi-branch, white-label, API, SLA |

---

## KPIs ที่วัดความสำเร็จ

- **Booking conversion rate** (target: >65%)
- **No-show rate** (target: <8%)
- **Customer return rate** (target: >50% within 60 days)
- **Monthly Recurring Revenue (MRR)**
- **Net Promoter Score (NPS)** (target: >60)
- **Shops on platform** (milestone: 100 → 1,000 → 10,000)

---

*Last updated: April 2026 | Maintained by LineBook Engineering Team*
