# LINEX Theme System — LineBook Integration

ระบบ theme 15 preset สำหรับ LineBook (LIFF + admin + public). Ported from the standalone LINEX Design System Builder app.

---

## ไฟล์หลัก

| File | Purpose |
|---|---|
| `src/lib/themes.ts` | Type definitions, 15 `THEME_PRESETS`, WCAG helpers, CSS var serializer |
| `src/lib/theme-context.tsx` | `<ThemeProvider>` (client), `useTheme()` hook, `useThemeOptional()` |
| `src/app/layout.tsx` | Wraps site root with `<ThemeProvider>` |
| `src/app/globals.css` | Default CSS vars (linex preset) + theme-swap transition |

---

## 15 Theme Presets

| ID | ชื่อ | Primary | ใช้กับ |
|---|---|---|---|
| `linex` | LINEX | `#6d3bff` ม่วง/พีช | Booking platform (default) |
| `fnb` | Food & Beverage | `#e8734a` ส้ม/น้ำตาล | ร้านอาหาร, คาเฟ่ |
| `healthcare` | Healthcare | `#2c7a7b` teal (fixed AA) | คลินิก, โรงพยาบาล |
| `fitness` | Fitness | `#facc15` เหลือง + black text | ฟิตเนส, ยิม |
| `beauty` | Beauty | `#ec4899` ชมพู/ทอง | ร้านเสริมสวย, สปา |
| `hospitality` | Hospitality | `#1e3a5f` น้ำเงิน/ทอง | โรงแรม, รีสอร์ท |
| `retail` | Retail | `#ef4444` แดง/ส้ม | ร้านค้า, e-commerce |
| `education` | Education | `#2563eb` น้ำเงิน/เหลือง | สถาบันการศึกษา |
| `realestate` | Real Estate | `#059669` เขียว/น้ำเงิน | อสังหาริมทรัพย์ |
| `automotive` | Automotive | `#dc2626` แดง/เทา | รถยนต์, ศูนย์บริการ |
| `corporate` | Corporate | `#1e40af` น้ำเงินเข้ม/เทา | บริษัท, องค์กร |
| `pet` | Pet & Veterinary | `#c2410c` burnt orange + teal | สัตว์เลี้ยง, คลินิกสัตว์ |
| `tattoo` | Tattoo & Alt | `#0a0a0a` near-black + blood red | ร้านสัก, alt culture |
| `wellness` | Wellness & Spa | `#4f6f52` sage + gold | สปา, โยคะ |
| `tech` | Tech & Startup | `#0891b2` cyan + slate night | SaaS, startup |

---

## CSS Variables ที่ใช้งาน

ทุก preset sync ไปที่ `:root` ผ่าน `ThemeProvider`:

```css
--primary        /* brand color */
--primary-light  /* hover / soft accent */
--primary-dark   /* body text, small labels */
--on-primary     /* text on primary bg (white or black) */
--secondary      /* secondary accent */
--accent         /* soft background chip */
--surface        /* page surface */
--surface-dark   /* dark mode base */
--glow           /* brand shadow */
--mesh           /* radial-gradient background */
--primary-rgb    /* for rgba() usage */
```

`document.documentElement` จะได้ `data-theme="<id>"` เมื่อ active (สำหรับใช้เขียน CSS override เฉพาะ theme)

---

## การใช้งาน

### ใน Client Component

```tsx
"use client";
import { useTheme } from "@/lib/theme-context";

export function ThemePicker() {
  const { themes, activeId, setTheme, cycleTheme } = useTheme();
  return (
    <div>
      <button onClick={cycleTheme}>Cycle</button>
      <select value={activeId} onChange={(e) => setTheme(e.target.value as any)}>
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name.th}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### ใน Server Component / Flex message

```ts
import { getTheme, type ThemeId } from "@/lib/themes";

const theme = getTheme(shop.themeId); // falls back to `linex` if invalid
const buttonBg = theme.primary;
const buttonFg = theme.onPrimary;
```

### ใน CSS / className

```tsx
<button
  style={{ background: "var(--primary)", color: "var(--on-primary)" }}
  className="px-4 py-2 rounded-xl"
>
  ยืนยัน
</button>
```

---

## Accessibility Rules

### Rule 1 — บทบาทของแต่ละสี (Semantic color roles)

- **Body text / paragraph** → `text-ink-900` (theme-agnostic neutral)
- **Muted label / caption** → `text-ink-500`
- **หัวข้อแบรนด์ / metric หลัก** → `--primary-dark` (ไม่ใช่ `--primary` ตรง ๆ)
- **ข้อความบนปุ่ม primary** → `--on-primary` (อัตโนมัติต่อ theme)

ธีม FNB, Beauty, Retail, Real Estate มี primary/surface contrast เพียง ~3.x ซึ่งผ่านแค่ AA large เท่านั้น. ใช้ `--primary-dark` สำหรับ body copy เพื่อให้ contrast ≥ 4.5

### Rule 2 — ขอบเขตการใช้ `--primary`

**ใช้ได้**
- หัวข้อใหญ่ ≥ 24px
- Icon fills
- Button background
- Gradient / mesh / glow accents
- Active state indicators

**ห้ามใช้**
- Body text / paragraph
- Label ≤ 14px
- Status indicator (error/critical)
- Placeholder text

### Rule 3 — Fitness theme (yellow) ต้องใช้ black text

`#facc15` (Fitness primary) มี contrast ต่อขาวเพียง 1.5:1 (FAIL WCAG).
Schema แก้โดย set `onPrimary: "#171717"`. ในทุก button ให้ใช้:

```css
.btn-primary {
  background: var(--primary);
  color: var(--on-primary); /* white เสมอ ยกเว้น fitness = black */
}
```

หรือใน TS:
```ts
const { activeTheme } = useTheme();
const textColor = activeTheme.onPrimary; // '#ffffff' or '#171717'
```

### Rule 4 — ทดสอบ contrast ก่อน merge

- ใช้ `contrastRatio()` จาก `@/lib/themes`:
  ```ts
  import { contrastRatio, wcagLevel } from "@/lib/themes";
  const ratio = contrastRatio("#ffffff", theme.primary);
  console.log(wcagLevel(ratio)); // 'AAA' | 'AA' | 'AA-large' | 'Fail'
  ```
- หลีกเลี่ยงการ hardcode สี — อ้าง CSS variable หรือ `THEME_MAP` เสมอ
- ทดสอบ component ใหม่ใน 15 ธีมด้วย `cycleTheme()`

---

## WCAG Scorecard — Primary on Surface

| Theme | Primary → Surface | White → Primary | Verdict |
|---|---|---|---|
| `linex` | 5.47 · AA | 5.63 · AA | ✅ Solid |
| `fnb` | 2.91 · Fail | 3.03 · AA-large | ⚠️ Body → primaryDark |
| `healthcare` | ~7 · AAA | ~7 · AAA | ✅ Fixed |
| `fitness` | 1.49 · Fail | 1.53 · Fail | 🔴 Use `onPrimary` = black |
| `beauty` | 3.43 · AA-large | 3.53 · AA-large | ⚠️ Body → primaryDark |
| `hospitality` | 10.77 · AAA | 11.4 · AAA | ✅✅ Gold |
| `retail` | 3.67 · AA-large | 3.78 · AA-large | ⚠️ Body → primaryDark |
| `education` | 4.93 · AA | 5.15 · AA | ✅ Solid |
| `realestate` | 3.66 · AA-large | 3.76 · AA-large | ⚠️ Body → primaryDark |
| `automotive` | 4.62 · AA | 4.84 · AA | ✅ Solid |
| `corporate` | 8.15 · AAA | 8.54 · AAA | ✅✅ Gold |
| `pet` | ~5.1 · AA | ~5.3 · AA | ✅ New |
| `tattoo` | ~20 · AAA | ~20 · AAA | ✅✅ New |
| `wellness` | ~5.2 · AA | ~5.4 · AA | ✅ New |
| `tech` | ~4.7 · AA | ~4.9 · AA | ✅ New |

---

## Persistence

ระบบมี 2 ระดับ:

- **Shop-level (DB)** — เก็บใน `shops.theme_id` column (migration `010_shop_theme.sql`). เป็น "default ของร้าน" ใช้กับทั้ง LIFF, admin, และ Flex message ใน LINE
- **Client-level (localStorage)** — `localStorage["linex-theme"]` สำหรับลูกค้าที่กดพรีวิวใน LIFF. Override shop default เฉพาะใน browser นั้น ไม่กระทบร้าน

Server seed: `src/app/layout.tsx` เรียก `getShopThemeId()` ก่อน render → pass เข้า `<ThemeProvider initialThemeId={...}>` → ไม่มี flicker ตอนโหลด

---

## Endpoints

| Route | Method | Auth | หน้าที่ |
|---|---|---|---|
| `/api/shop/theme` | GET | Public | คืน `{ themeId, theme }` สำหรับ LIFF bootstrap |
| `/api/admin/theme` | GET | Admin | คืน `{ themeId, presets[], migrated }` สำหรับหน้า admin picker |
| `/api/admin/theme` | POST | Admin | `{ themeId }` → บันทึกลง `shops.theme_id` + invalidate cache |

---

## UI Surfaces

| Location | Purpose |
|---|---|
| `src/app/admin/theme/page.tsx` | **Admin**: Picker 15 ธีมพร้อม WCAG badge + save button |
| `src/components/ThemePicker.tsx` | **LIFF**: Compact icon + bottom-sheet ให้ลูกค้าพรีวิว |
| Added to admin nav (`src/app/admin/layout.tsx`) | "ธีมของร้าน" link |
| Added to LIFF header (`src/app/liff/layout.tsx`) | ThemePicker icon next to LanguageToggle |

---

## Flex Integration

`src/lib/flex.ts` exports `setFlexTheme(themeOrId)` — เปลี่ยน palette ของ brand-tied tokens (`BRAND`, `BRAND_DARK`, `BRAND_SOFT`, `PREMIUM_DEEP`, `PREMIUM_MID`, `PREMIUM_KICKER`, `PANEL`) ทั้งไฟล์

Webhook `src/app/api/line/webhook/route.ts` เรียก `setFlexTheme(await getShopThemeId())` ก่อนทุก event → Flex bubble ที่ส่งกลับลูกค้าใช้สีของร้านอัตโนมัติ

**Neutral tokens** (`TEXT_MAIN`, `TEXT_MUTED`, `BORDER`, `IVORY`, `PEACH_SOFT`, `WARNING`, `DANGER`) **ไม่เปลี่ยน** — คงความอ่านง่ายข้ามทุกธีม

**Cache**: `src/lib/shop-theme.ts` cache TTL 30s เพื่อลด DB hit ใน webhook. Admin POST invalidate cache ทันที

---

## Status ✅

- [x] Admin page: `/admin/theme` ให้เจ้าของร้านเลือก theme
- [x] DB column: `shops.theme_id` (migration 010) + `getShopThemeId()` cached loader
- [x] Flex messages ใช้ theme ของร้าน (via `setFlexTheme` in webhook)
- [x] LIFF header picker (preview only, localStorage)

## ถัดไป (Future)

- [ ] Per-customer theme preference (ถ้าอยากให้ลูกค้า save เป็น persistent)
- [ ] Theme analytics: track ว่าลูกค้าเลือกเปลี่ยนธีมบ่อยแค่ไหน
- [ ] Dark mode variant ของแต่ละ preset
- [ ] Custom theme builder (admin สร้าง palette เองได้)
