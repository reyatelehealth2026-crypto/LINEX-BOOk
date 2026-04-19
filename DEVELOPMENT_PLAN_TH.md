# LineBook — แผนพัฒนาต่อจากนี้ (อิง use case จริง)

> เป้าหมาย: ทำให้ LineBook ไม่ใช่แค่ “ระบบจองคิวผ่าน LINE” แต่เป็น **ระบบหน้าร้าน + CRM + ผู้ช่วยร้าน** ที่ใช้ง่าย, ตั้งค่าเร็ว, และขายได้จริง

---

# 1) เป้าหมายหลักของโปรดักต์

## เป้าหมายธุรกิจ
- ทำให้ร้านปิดการจองได้มากขึ้น
- ลดงานตอบแชทซ้ำๆ ของร้าน
- ลดคิวทับ, ลด no-show, ลดลูกค้าหลุด
- เพิ่มลูกค้าประจำผ่านแต้มสะสม, โปรโมชัน, และประวัติการใช้บริการ
- ทำให้เจ้าของร้านรู้สึกว่า “ใช้ LINE ตัวเดิม แต่ร้านเป็นระบบขึ้นทันที”

## เป้าหมายด้าน UX
- ลูกค้าใหม่เข้าใจได้ใน 10 วินาทีว่าระบบทำอะไรได้บ้าง
- ลูกค้าจองครั้งแรกได้ภายใน 30-60 วินาที
- เจ้าของร้านตั้งค่าระบบครั้งแรกได้ภายใน 15-30 นาที
- เจ้าของร้านแก้บริการ/เวลา/ช่างเองได้ โดยไม่ต้องพึ่ง dev

---

# 2) Use Case หลักที่ต้องรองรับ

## กลุ่ม A: ลูกค้าใหม่

### UC-A1: ลูกค้าเพิ่มเพื่อนครั้งแรก
**สิ่งที่จะเกิดขึ้นจริง**
- ลูกค้ากด add friend จาก QR / ลิงก์ / หน้าเพจร้าน
- ยังไม่รู้ว่าบอททำอะไรได้บ้าง
- ถ้าเจอเมนูงงๆ มีโอกาสหลุดทันที

**สิ่งที่ระบบควรทำ**
- ส่ง welcome message ที่อธิบายสั้นและเข้าใจทันที
- บอก 3 เรื่องหลัก: จองคิว, ดูคิว, ดูแต้ม
- มีตัวอย่างประโยคที่พิมพ์ได้เลย
- มี CTA ชัด: “จองคิวเลย”

**สิ่งที่ควรพัฒนาเพิ่ม**
1. Welcome message 2 ชั้น
   - ชั้น 1: บอกฟังก์ชันหลัก
   - ชั้น 2: Quick actions ตามพฤติกรรม (จอง / ดูบริการ / โปรไฟล์)
2. Dynamic welcome
   - ร้านตัดผม → wording แนว “เลือกช่าง / เวลาว่าง”
   - ร้านเล็บ → wording แนว “บริการ / ระยะเวลา / สี / ลาย”
3. Onboarding ที่จำ state ได้
   - ถ้าลูกค้าไม่เคยลงทะเบียน → ชวนลงทะเบียนหลังจองครั้งแรก ไม่ยัดเยียดตั้งแต่ต้น

---

### UC-A2: ลูกค้าใหม่ถามก่อนจอง
**ตัวอย่าง**
- “มีบริการอะไรบ้าง”
- “ราคาเท่าไหร่”
- “ร้านเปิดกี่โมง”
- “มีช่างคนไหนบ้าง”

**สิ่งที่ระบบควรทำ**
- ตอบได้ทันทีแบบอ่านง่าย
- ไม่โยนลูกค้าไปหน้าอื่นถ้าไม่จำเป็น
- ถ้าคำถามตอบสั้นได้ ให้ตอบในแชทเลย

**สิ่งที่ควรพัฒนาเพิ่ม**
1. FAQ intent
   - บริการ
   - ราคา
   - เวลาทำการ
   - ที่ตั้ง/เบอร์ติดต่อ
2. Service quick cards
   - แสดง top services 3-5 รายการก่อน
   - ปุ่ม “ดูทั้งหมด”
3. Opening hours card
   - แยกวันธรรมดา/เสาร์อาทิตย์
   - ถ้าวันนี้ปิดให้บอกเลย

---

## กลุ่ม B: ลูกค้าที่ต้องการจอง

### UC-B1: จองแบบพิมพ์ภาษาคน
**ตัวอย่าง**
- “จองตัดผมพรุ่งนี้บ่ายสองกับพี่โอ๋”
- “ทำเล็บวันศุกร์ 3 โมง”
- “ขอจองทำสีเสาร์หน้า”

**สิ่งที่ระบบควรทำ**
- เข้าใจ service + date + time + staff จากข้อความเดียว
- ถ้าข้อมูลไม่ครบ ให้ถามต่อเฉพาะส่วนที่ขาด
- ถ้าเวลานั้นเต็ม ให้เสนอเวลาใกล้เคียงทันที

**สิ่งที่ควรพัฒนาเพิ่ม**
1. NLP รอบถัดไป
   - รองรับประโยคซับซ้อนขึ้น
   - รองรับการพิมพ์ผิดเล็กน้อย
   - รองรับชื่อบริการย่อ
2. Suggest alternatives
   - เวลาใกล้เคียงก่อน/หลัง
   - ช่างคนอื่นที่ทำบริการเดียวกันได้
3. Confidence system
   - ถ้ามั่นใจต่ำ อย่าเดาเอง ให้ถามย้ำ

**Priority:** สูงมาก

---

### UC-B2: จองแบบกดทีละขั้นตอน
**สิ่งที่ระบบควรทำ**
- ใช้ง่ายสำหรับคนไม่อยากพิมพ์
- เลือกบริการ → ช่าง → วัน → เวลา → ยืนยัน

**สิ่งที่ควรพัฒนาเพิ่ม**
1. แสดง duration / price ชัดขึ้น
2. ถ้า service หนึ่งใช้เวลานาน ให้บอก “ใช้เวลาประมาณ 2 ชั่วโมง” ชัดๆ
3. แสดง tag พิเศษ
   - ยอดนิยม
   - จองบ่อย
   - โปรโมชัน

**Priority:** สูง

---

### UC-B3: ลูกค้าจองซ้ำ
**ตัวอย่าง**
- “เหมือนครั้งก่อน”
- “จองกับช่างเดิม”
- “ตัดผมเหมือนรอบก่อน”

**สิ่งที่ระบบควรทำ**
- จำบริการล่าสุด / ช่างล่าสุด / เวลาที่ชอบได้
- เสนอ one-tap booking

**สิ่งที่ควรพัฒนาเพิ่ม**
1. Quick rebook
   - “จองแบบเดิมอีกครั้ง”
2. Preferred staff
3. Favorite time window
   - เช่น ชอบจองช่วงเย็นวันศุกร์

**Priority:** สูง

---

## กลุ่ม C: หลังจากจองแล้ว

### UC-C1: ลูกค้าดูคิวของตัวเอง
**สิ่งที่ระบบควรทำ**
- ดูวัน/เวลา/บริการ/ช่าง/สถานะ
- ยกเลิกได้ง่าย

**สิ่งที่ควรพัฒนาเพิ่ม**
1. Reschedule
   - เปลี่ยนเวลาโดยไม่ต้องยกเลิกแล้วจองใหม่
2. Add to calendar
3. Share booking
   - ส่งให้เพื่อน / คนมาด้วยกัน

**Priority:** สูง

---

### UC-C2: ลูกค้าลืมนัด / มาก่อนเวลา / มาไม่ทัน
**สิ่งที่จะเกิดขึ้นจริง**
- ลูกค้าลืม
- มาช้า
- อยากเลื่อนเวลา

**สิ่งที่ควรพัฒนาเพิ่ม**
1. Reminder หลายระดับ
   - 24 ชม. ก่อน
   - 2 ชม. ก่อน
   - 30 นาที ก่อน
2. Confirm attendance
   - “ยังมาตามนัดไหม?”
3. Late arrival flow
   - “มาสาย 15 นาทีได้ไหม”
4. Self-reschedule flow

**Priority:** สูงมาก

---

### UC-C3: คิวเต็ม
**สิ่งที่จะเกิดขึ้นจริง**
- เวลาที่ลูกค้าต้องการเต็ม
- ถ้าไม่มีทางออก ลูกค้าหลุด

**สิ่งที่ควรพัฒนาเพิ่ม**
1. Waitlist
2. Notify-on-cancel
3. Alternative recommendations
   - ช่างอื่น
   - เวลาก่อน/หลัง
   - วันใกล้เคียง

**Priority:** สูงมาก

---

## กลุ่ม D: เจ้าของร้าน / แอดมิน

### UC-D1: ดูคิววันนี้ให้เข้าใจใน 5 วินาที
**สิ่งที่ระบบควรทำ**
- เห็นคิววันนี้ทั้งหมด
- รู้ทันทีว่าอะไรค้าง, อะไรยืนยันแล้ว, อะไรเสร็จแล้ว

**สิ่งที่ควรพัฒนาเพิ่ม**
1. Today board ที่ชัดขึ้น
   - ตอนนี้
   - ถัดไป
   - เลท
   - no-show risk
2. Filters
   - ตามช่าง
   - ตามสถานะ
   - ตามบริการ
3. Timeline view

**Priority:** สูง

---

### UC-D2: จัดการผ่าน LINE โดยไม่เข้าเว็บ
**ตัวอย่าง**
- “คิววันนี้”
- “ยอดวันนี้”
- “ยืนยัน #5”
- “เสร็จ #5”

**สิ่งที่ควรพัฒนาเพิ่ม**
1. Admin identity แบบปลอดภัยกว่า env IDs
   - whitelist ใน DB
   - role-based access
2. Admin chat menu
3. Confirmation step สำหรับคำสั่งที่มีผลกระทบสูง

**Priority:** สูง

---

### UC-D3: ปรับบริการ/ช่าง/เวลาเปิดปิดเอง
**สิ่งที่ระบบควรทำ**
- เจ้าของร้านไม่ต้องพึ่ง dev

**สิ่งที่ควรพัฒนาเพิ่ม**
1. Catalog management UI
   - เพิ่ม/แก้/ลบบริการ
   - ตั้งเวลาและราคา
2. Staff management UI
3. Working hours + time off UI
4. Admin chat config commands
   - เพิ่มบริการ
   - เพิ่มช่าง
   - ลาหยุด

**Priority:** สูงมาก

---

## กลุ่ม E: CRM และการเติบโต

### UC-E1: เปลี่ยนลูกค้าครั้งแรกเป็นลูกค้าประจำ
**สิ่งที่ควรพัฒนาเพิ่ม**
1. Points engine ที่ยืดหยุ่นขึ้น
   - แต้มตามยอด
   - โบนัสช่วงเวลา
   - โบนัสวันเกิด
2. Tier system
   - Silver / Gold / VIP
3. Re-engagement campaigns
   - หายไป 30 วัน → ทักกลับอัตโนมัติ

**Priority:** กลาง-สูง

---

### UC-E2: หลังให้บริการ อยากได้รีวิว / อยากขายซ้ำ
**สิ่งที่ควรพัฒนาเพิ่ม**
1. Post-service follow-up
2. Rating / satisfaction collection
3. Suggested next booking
   - “อีก 3 สัปดาห์เหมาะกับการกลับมาตัดอีกครั้ง”
4. Before/after media memory

**Priority:** กลาง

---

# 3) แผนพัฒนาเป็นเฟส

## Phase 1 — Stabilize & Make It Sellable (1-2 สัปดาห์)
**เป้าหมาย:** ทำให้ใช้งานจริงได้ก่อน, ปิดรูรั่ว, ขายเดโมได้

### งานหลัก
- Fix webhook reply reliability
- Fix LIFF deep link / 404 / liff.state
- ทำ welcome flow ให้ชัดเจน
- ทำ booking flow ในแชทให้เสถียร
- ทำ admin chat commands ชุดแรก
- ตรวจสอบ OA Manager / Bot mode / webhook checklist

### Output
- ลูกค้าจองได้จริง
- เจ้าของร้านเห็นคิวได้จริง
- เดโมได้โดยไม่เขิน

---

## Phase 2 — Self-Serve Setup (1-2 สัปดาห์)
**เป้าหมาย:** ตั้งค่าระบบได้เร็วและง่าย

### งานหลัก
1. Setup Wizard
   - Step 1: ข้อมูลร้าน
   - Step 2: เวลาเปิด-ปิด
   - Step 3: เพิ่มบริการ
   - Step 4: เพิ่มช่าง
   - Step 5: ตั้งแต้มสะสม
   - Step 6: เช็ค LINE/Supabase/LIFF/webhook
2. Healthcheck page
   - LINE connected?
   - webhook pass?
   - LIFF pass?
   - Supabase pass?
3. Seed templates ตามประเภทร้าน
   - Barber
   - Salon
   - Nail
   - Spa

### KPI
- ตั้งค่าร้านใหม่ได้ใน 15-30 นาที
- ไม่ต้องแก้ env/manual หลายรอบ

---

## Phase 3 — Owner Control Panel (2-3 สัปดาห์)
**เป้าหมาย:** เจ้าของร้านปรับระบบเองได้หมด

### งานหลัก
- Services management
- Staff management
- Working hours / time off UI
- Rich menu content editor
- Message templates editor
- Branding editor (โลโก้/สี/ชื่อร้าน)

### KPI
- ร้านแก้ข้อมูลเองได้โดยไม่เรียก dev

---

## Phase 4 — CRM & Retention (2-4 สัปดาห์)
**เป้าหมาย:** เพิ่มการกลับมาใช้ซ้ำ

### งานหลัก
- Customer list + profile timeline
- Visit history
- Favorite staff / preferred services
- Reminder campaigns
- Birthday offers
- Lapsed customer campaigns

---

## Phase 5 — Premium Differentiation (3-6 สัปดาห์)
**เป้าหมาย:** ทำให้เหนือกว่าตลาดจริง

### งานหลัก
- Waitlist + auto-fill cancellation slots
- Queue position / ETA
- Rebook one tap
- After-service review flow
- Before/after media memory
- AI recommendations
- Deposit / prepayment support

---

# 4) ตั้งค่าง่าย: หลักการที่ต้องยึด

## เป้าหมาย
> “เจ้าของร้านที่ไม่เก่งเทค ต้องตั้งค่าระบบได้เองภายใน 30 นาที”

## หลักการ
1. **ไม่ให้แก้ env ถ้าไม่จำเป็น**
   - ถ้าโยกไปเก็บใน admin settings ได้ ให้ทำ
2. **มี setup checklist หน้าเดียว**
3. **มี test buttons ทุกจุด**
   - Test webhook
   - Test LIFF
   - Test push message
4. **มี preset ให้เลือก**
   - ร้านตัดผมชาย
   - ร้านเล็บ
   - ร้านเสริมสวย
5. **คำศัพท์ต้องภาษาคน**
   - ไม่ใช้ “route / callback / endpoint / RLS” กับเจ้าของร้าน
6. **มีสถานะสีชัดเจน**
   - เขียว = พร้อม
   - เหลือง = ยังไม่ครบ
   - แดง = ใช้งานไม่ได้

## สิ่งที่ควรมีในหน้าตั้งค่า
- ข้อมูลร้าน
- ประเภทร้าน
- เวลาเปิดปิด
- บริการ
- ช่าง
- โลโก้/สีร้าน
- LINE settings
- LIFF settings
- Webhook test
- Message templates
- Loyalty settings

---

# 5) งานเทคนิคที่ต้องจัดระเบียบ

## ฝั่งโค้ด
- แยก webhook logic เป็น module ย่อย
  - message handlers
  - postback handlers
  - admin handlers
  - booking handlers
- เพิ่ม logging ที่ดี
- เพิ่ม error telemetry
- เพิ่ม fallback responses
- ลด Flex schema ที่เสี่ยง reject

## ฝั่งข้อมูล
- เพิ่ม audit log
- เพิ่ม admin roles ใน DB
- เพิ่ม saved preferences ของลูกค้า
- เพิ่ม message template storage
- เตรียมรองรับ multi-shop

## ฝั่ง deployment
- หน้า healthcheck
- หน้า setup status
- sample env ที่ชัดเจน
- deploy checklist 1 หน้า

---

# 6) ความเสี่ยงที่ต้องกันไว้

## ความเสี่ยง 1: LINE OA config งง
**ทางแก้:** setup wizard + healthcheck + คู่มือภาพ

## ความเสี่ยง 2: LIFF deep link เพี้ยน
**ทางแก้:** alias routes + liff.state handler + e2e tests

## ความเสี่ยง 3: webhook ตอบไม่ออกเพราะ Flex schema พัง
**ทางแก้:** safe template mode + payload validator

## ความเสี่ยง 4: เจ้าของร้านใช้ไม่เป็น
**ทางแก้:** onboarding ที่สั้นและใช้ภาษาคน

## ความเสี่ยง 5: ลูกค้าหลุดตอนจอง
**ทางแก้:** เสนอเวลาทดแทน, waitlist, one-tap rebook

---

# 7) Prioritized Backlog (เรียงลำดับทำจริง)

## P0 — ต้องทำก่อนขายจริง
- [ ] ตรวจ webhook/chat reply ให้เสถียร 100%
- [ ] setup checklist + LINE OA troubleshooting page
- [ ] LIFF route/deep link test ครบ
- [ ] welcome flow ที่ชัดและปลอดภัย
- [ ] booking flow ในแชทให้จบครบ

## P1 — ใช้งานจริงแล้วรู้สึกดี
- [ ] services/staff/hours admin UI
- [ ] owner chat commands ให้ครบ
- [ ] customer profile timeline
- [ ] reschedule flow
- [ ] multi-reminder flow

## P2 — เริ่มต่างจากตลาด
- [ ] waitlist + auto-fill
- [ ] queue position / ETA
- [ ] quick rebook
- [ ] satisfaction / review flow
- [ ] before-after media history

## P3 — ใช้เป็นจุดขายระดับพรีเมียม
- [ ] deposits/prepayment
- [ ] AI recommendations
- [ ] campaign automation
- [ ] multi-branch
- [ ] analytics dashboard ระดับ owner

---

# 8) ข้อเสนอแนะเชิงกลยุทธ์

ถ้าจะให้โปรดักต์นี้ “ชนะตลาด” จริง, ผมแนะนำให้โฟกัสลำดับนี้:

1. **ให้มันตอบแชทและจองได้เสถียรก่อน**
2. **ทำให้ตั้งค่าง่ายจนร้านตั้งเองได้**
3. **ทำ owner control ให้ร้านไม่ต้องพึ่ง dev**
4. **ค่อยใส่ AI/waitlist/CRM premium เป็นตัวชนะ**

เพราะตอนนี้สิ่งที่จะฆ่า conversion ไม่ใช่ lack of AI อย่างเดียว แต่คือ:
- ตั้งค่ายาก
- LINE config งง
- ตอบไม่เสถียร
- เจ้าของร้านแก้เองไม่ได้

---

# 9) เป้าหมายเวอร์ชันถัดไป (แนะนำ)

## v0.2
- ระบบเสถียร
- จองผ่านแชท + LIFF ได้
- welcome flow ดี
- owner chat commands เบื้องต้น

## v0.3
- setup wizard
- admin UI ครบสำหรับร้านเดียว
- reminder + reschedule

## v0.4
- waitlist
- quick rebook
- CRM timeline

## v0.5
- deposits
- analytics
- multi-branch

---

ถ้าต้องการ ผมทำต่อให้ได้อีก 2 แบบ:
1. แตกแผนนี้เป็น **task list ลงมือทำทีละไฟล์**
2. แปลงเป็น **เอกสารเสนอขาย / roadmap ให้ลูกค้าอ่าน**
