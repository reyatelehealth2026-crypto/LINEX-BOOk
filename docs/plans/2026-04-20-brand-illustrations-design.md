# Brand Illustrations for LINE Flex Messages

**Date:** 2026-04-20
**Status:** Design approved, awaiting image re-generation (Phase 0)
**Owner:** LIN3 x BOOK

---

## Goal

แทนที่ emoji icons (✂️ 📅 🕐 💇) ใน LINE Flex Message ด้วยภาพ 3D isometric
แบรนด์สีมาวฟ + โรสโกลด์ เพื่อยกระดับแบรนด์จากแชทบอทปกติ → premium experience

---

## Design Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| 1 | Layout strategy | **A) Hero + Thumbnail rows** (hero 2:1 ด้านบน + 5 thumbnails แทน emoji ทุกแถว) |
| 2 | Background consistency | **B) Re-render 5 tiles on unified gradient BG** (mauve → rose gold) |
| 3 | Hosting | Next.js `public/brand/` → served via `${NEXT_PUBLIC_APP_URL}/brand/*.png` |
| 4 | Phase rollout | Phase 1 = `bookingConfirmedMessage` only → validate → Phase 2 = 3 other templates |

---

## Visual Mapping

| Flex element | Asset file | Source reference |
|---|---|---|
| Hero (แทน green header) | `hero-confirmed.png` (1024×512, 2:1) | `2026-04-20-08-51-02-booking-confirmed.png` — crop to 2:1, no re-gen needed |
| บริการ row | `tile-service.png` (400×400) | `2026-04-20-08-51-56-service-tile.png` — **re-gen** with unified BG |
| วันที่ row | `tile-calendar.png` (400×400) | `2026-04-20-08-52-18-calendar-tile.png` — **re-gen** |
| เวลา row | `tile-time.png` (400×400) | `2026-04-20-08-52-45-time-tile.png` — **re-gen** |
| ช่าง row | `tile-staff.png` (400×400) | `2026-04-20-08-53-09-staff-badge.png` — **re-gen** |
| ยอดรวม row | `tile-payment.png` (400×400) | `2026-04-20-08-53-35-payment-tile.png` — **re-gen** |

---

## Master Prompt Template (Midjourney v6 / DALL-E 3)

**Shared styling block** (คงที่ทุก tile — สำคัญมากต้องเหมือนกัน):

```
{OBJECT}, 3D isometric icon, floating at center,
soft radial gradient background blending deep mauve #3b2340
at corners to warm rose gold #d4a574 at center,
premium glass morphism accents, subtle rose gold glow rim,
matte rendering, consistent top-left key lighting,
square 1:1 composition, no text, no borders, no UI chrome,
LINE sticker aesthetic --ar 1:1 --style raw --v 6
```

**Per-tile `{OBJECT}` slot:**

1. **tile-service.png**
   `rose gold scissors crossed over a silver comb, polished metallic finish`

2. **tile-calendar.png**
   `mauve purple calendar card with rose gold spiral binding and one page corner peeling up, single sun ray highlight`

3. **tile-time.png**
   `rose gold circular clock face with roman numerals, minimalist hands at 1:30, glass dome cover`

4. **tile-staff.png**
   `minimalist person silhouette bust inside a glass circular badge with rose gold rim, soft purple inner glow`

5. **tile-payment.png**
   `stack of three rose gold coins with a glowing checkmark floating above, clean premium look`

**Important**: generate all 5 in **one Midjourney session back-to-back** with `--seed` locked
if possible — ensures lighting angle + BG gradient match exactly.

---

## LINE Flex Bubble Structure (target)

```json
{
  "type": "bubble",
  "size": "giga",
  "hero": {
    "type": "image",
    "url": "{APP_URL}/brand/hero-confirmed.png",
    "size": "full",
    "aspectRatio": "2:1",
    "aspectMode": "cover"
  },
  "body": {
    "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "16px",
    "contents": [
      { "type": "text", "text": "BOOKING CONFIRMED", "size": "xs", "weight": "bold", "color": "#6b7280" },
      { "type": "text", "text": "จองคิวสำเร็จ", "size": "xl", "weight": "bold", "color": "#111827", "margin": "sm" },
      { "type": "separator", "margin": "md" },
      // infoRowImg × 4
      // totalCard
      // separator + booking # + button
    ]
  }
}
```

---

## Code Changes (Phase 1)

**File:** `src/lib/flex.ts`

1. เพิ่ม helper ใหม่ (ไม่ลบของเดิม):
   ```ts
   const APP_URL = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");

   function infoRowImg(label: string, value: string, imgFile: string) {
     return {
       type: "box", layout: "horizontal", spacing: "md",
       contents: [
         { type: "image", url: `${APP_URL}/brand/${imgFile}`,
           size: "72px", aspectRatio: "1:1", aspectMode: "cover", flex: 0 },
         { type: "box", layout: "vertical", flex: 1, justifyContent: "center",
           contents: [
             { type: "text", text: label, size: "xs", color: TEXT_MUTED },
             { type: "text", text: value, size: "md", weight: "bold", color: TEXT_MAIN, wrap: true }
           ]
         }
       ]
     };
   }
   ```

2. แก้ `bookingConfirmedMessage` (`flex.ts:270`):
   - ลบ `header` block
   - เพิ่ม `hero` object ตาม structure ข้างบน
   - เปลี่ยน 4 บรรทัด `infoRow(...)` → `infoRowImg(..., "tile-{x}.png")`
   - title box ย้ายขึ้นต้น body

3. เก็บ `infoRow`, `totalCard` เดิม — ยังใช้ใน reminder/confirm/ai templates (Phase 2)

---

## Testing Checklist (Phase 1)

- [ ] ทุกไฟล์ใน `public/brand/` เปิดได้ที่ `http://localhost:3000/brand/*.png`
- [ ] Paste output JSON ของ `bookingConfirmedMessage()` ใน https://developers.line.biz/flex-simulator/ — render ถูก
- [ ] `curl -I ${PROD}/brand/tile-service.png` ได้ `200 OK` + `content-type: image/png`
- [ ] จองทดสอบจริง 1 คิว → ได้ flex บน iOS + Android
- [ ] ทดสอบใน LINE dark mode — tiles อ่านง่าย ไม่กลืนพื้น
- [ ] ขนาดไฟล์: hero ≤ 200KB, tiles ≤ 80KB ต่อไฟล์

---

## Phase 2 (after Phase 1 validated)

Migrate 3 templates ที่เหลือที่ใช้ `infoRow` emoji:

| Template | Location | Hero strategy |
|---|---|---|
| `reminderMessage` | `flex.ts:308` | คง header orange เดิม + แค่ thumbnail rows (ไม่ใช้ hero image — orange tone ต่างจาก brand mauve) |
| `aiBookingConfirmMessage` | `flex.ts:707` | ไม่ใช้ hero (state = ยังไม่ confirm) — แค่ thumbnail rows |
| `confirmBookingFlex` | `flex.ts:1436` | เหมือน aiBookingConfirm |

---

## Rollback

ถ้าพบปัญหา revert `bookingConfirmedMessage` กลับเป็น version เดิม (1 commit) โดยไม่ต้องลบไฟล์ภาพ/helper — Phase 2 ยังไม่เริ่ม จึงไม่มี side effect

---

## Open Items

- [ ] User generate 5 tile images ด้วย master prompt
- [ ] Crop `booking-confirmed.png` → `hero-confirmed.png` (2:1)
- [ ] Optimize PNG (tinypng / squoosh) ให้ตรง size target
- [ ] User แจ้งกลับเมื่อไฟล์พร้อม → ผม implement Phase 1
