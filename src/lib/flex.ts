// Flex / Quick-reply message builders for the LINE bot.
import type { BookingWithJoins, Customer, Service, Staff } from "@/types/db";
import { formatDateTH, formatTimeRange } from "./format";
import type { Slot } from "./booking";
import { getTheme, type ThemeId, type ThemePreset } from "./themes";

/* ================================================================== */
/*  Dynamic brand palette — driven by the active shop theme.           */
/*  Call `setFlexTheme(shopThemeId)` at the start of each webhook      */
/*  request (synchronous). All builders below read these `let` vars    */
/*  at build time, so no per-builder param threading is required.       */
/* ================================================================== */

// Brand-tied tokens (remapped per theme)
let BRAND = "#6d3bff";
let BRAND_DARK = "#34204d";
let BRAND_SOFT = "#f7f2ff";
let PREMIUM_DEEP = "#171220";
let PREMIUM_MID = "#4d2b73";
let PREMIUM_KICKER = "#d4c2ff";
let PANEL = "#fcfaff";

// Neutral tokens (theme-agnostic)
const TEXT_MAIN = "#221733";
const TEXT_MUTED = "#6b4e7a";
const BORDER = "#e9dff0";
const WARNING = "#ff9b7a";
const IVORY = "#fff7fe";
const PEACH_SOFT = "#ffe3d8";
const DANGER = "#e11d48";

/** Swap brand tokens to match a theme preset. Safe to call synchronously
 *  before building Flex bubbles (the builders read the `let` bindings). */
export function setFlexTheme(themeOrId: ThemeId | ThemePreset | null | undefined): void {
  const theme = typeof themeOrId === "object" && themeOrId != null
    ? (themeOrId as ThemePreset)
    : getTheme(themeOrId ?? undefined);

  BRAND = theme.primary;
  BRAND_DARK = theme.primaryDark;
  BRAND_SOFT = theme.accent;
  PREMIUM_DEEP = theme.surfaceDark;
  PREMIUM_MID = theme.primaryDark;
  PREMIUM_KICKER = theme.accent;
  PANEL = theme.surface;
}

/** Read current active brand color (primary). */
export function getFlexBrand(): string {
  return BRAND;
}

const LIFF_URL = (path = "") => {
  const id = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
  const normalized = path.startsWith("/liff/") ? path.slice(5) : path;
  return `https://liff.line.me/${id}${normalized}`;
};

export function textMessage(text: string, quickReply?: object) {
  return quickReply ? { type: "text", text, quickReply } : { type: "text", text };
}

export function defaultQuickReply() {
  return {
    items: [
      { type: "action", action: { type: "uri", label: "📅 จองคิว", uri: LIFF_URL("/liff/booking") } },
      { type: "action", action: { type: "uri", label: "📋 คิวของฉัน", uri: LIFF_URL("/liff/my-bookings") } },
      { type: "action", action: { type: "uri", label: "⭐ แต้มสะสม", uri: LIFF_URL("/liff/profile") } },
    ],
  };
}

export function welcomeMessage(displayName: string) {
  const safeName = displayName.trim() || "คุณลูกค้า";
  const heroTag = (text: string) => ({
    type: "box",
    layout: "vertical",
    flex: 1,
    paddingAll: "10px",
    cornerRadius: "12px",
    backgroundColor: "#ffffff14",
    borderWidth: "1px",
    borderColor: "#ffffff22",
    contents: [
      { type: "text", text, size: "xs", weight: "bold", color: "#ffffff", align: "center", wrap: true }
    ]
  });

  return {
    type: "flex",
    altText: `ยินดีต้อนรับคุณ ${safeName} สู่ LINEBOOK`,
    contents: {
      type: "bubble",
      size: "giga",
      hero: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        background: {
          type: "linearGradient",
          angle: "135deg",
          startColor: TEXT_MAIN,
          endColor: BRAND,
        },
        contents: [
          { type: "text", text: "LINEBOOK ASSISTANT", color: "#d4c2ff", size: "xs", weight: "bold" },
          { type: "text", text: "จองคิวได้ง่าย ครบ และเร็วในที่เดียว", color: "#ffffff", weight: "bold", size: "xl", margin: "sm", wrap: true },
          { type: "text", text: `สวัสดีคุณ ${safeName}`, color: "#fff7fe", size: "md", weight: "bold", margin: "md", wrap: true },
          { type: "text", text: "ดูคิวเดิม เช็กแต้มสะสม และเปิด Mini App ได้ทันที ทั้งในแชทและหน้าแอป", color: "#f3e8ff", size: "sm", margin: "sm", wrap: true },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            margin: "lg",
            contents: [
              heroTag("จองเร็ว"),
              heroTag("ดูคิว"),
              heroTag("แต้มสะสม")
            ]
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: "#fcfaff",
        contents: [
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            paddingAll: "14px",
            backgroundColor: "#ffffff",
            cornerRadius: "18px",
            borderWidth: "1px",
            borderColor: BORDER,
            contents: [
              { type: "text", text: "พร้อมเริ่มใช้งานแล้ว", size: "sm", weight: "bold", color: TEXT_MAIN },
              { type: "text", text: "เลือกวิธีที่สะดวกที่สุดสำหรับคุณ แล้วระบบจะพาไปขั้นตอนถัดไปให้อัตโนมัติ", size: "sm", color: TEXT_MUTED, wrap: true }
            ]
          },
          infoPanel("เริ่มต้นได้ 3 วิธี", [
            "กดปุ่มจองคิวเพื่อเลือกบริการ ช่าง และเวลาที่ต้องการ",
            "พิมพ์เป็นประโยคธรรมชาติ เช่น จองตัดผมพรุ่งนี้ 14:00",
            "เปิด Mini App เมื่อต้องการดูคิว แก้โปรไฟล์ หรือเช็กแต้ม"
          ]),
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            paddingAll: "14px",
            backgroundColor: BRAND_SOFT,
            cornerRadius: "14px",
            borderWidth: "1px",
            borderColor: BORDER,
            contents: [
              { type: "text", text: "พิมพ์กับผู้ช่วยได้ทันที", size: "sm", weight: "bold", color: TEXT_MAIN },
              { type: "text", text: "เช่น จองทำเล็บพรุ่งนี้ 14:00", size: "sm", color: "#6b4e7a", wrap: true },
              { type: "text", text: "หรือพิมพ์ว่า ดูคิวของฉัน / แต้มสะสม", size: "xs", color: TEXT_MUTED, wrap: true, margin: "xs" }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        backgroundColor: "#fcfaff",
        contents: [
          {
            type: "button",
            style: "primary",
            color: BRAND,
            height: "md",
            action: { type: "uri", label: "✨ เริ่มจองคิวทันที", uri: LIFF_URL("/liff/booking") }
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                flex: 1,
                height: "md",
                action: { type: "postback", label: "📋 คิวของฉัน", data: "action=my_bookings", displayText: "คิวของฉัน" }
              },
              {
                type: "button",
                style: "secondary",
                flex: 1,
                height: "md",
                action: { type: "postback", label: "⭐ โปรไฟล์", data: "action=profile", displayText: "โปรไฟล์ของฉัน" }
              }
            ]
          }
        ]
      }
    }
  };
}

export function profileCard(c: Customer | null, opts: { liffRegisterPath?: string } = {}) {
  if (!c || !c.registered_at) {
    return {
      type: "flex",
      altText: "โปรไฟล์ลูกค้า",
      contents: {
        type: "bubble",
        size: "giga",
        hero: brandHeader({
          kicker: "MEMBER PROFILE",
          title: "ยังไม่ได้ลงทะเบียน",
          subtitle: "ลงทะเบียนเพื่อเก็บแต้ม และรับสิทธิพิเศษของสมาชิก",
          chips: ["เก็บแต้ม", "ดูคิว", "แก้โปรไฟล์"]
        }),
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "18px",
          backgroundColor: PANEL,
          contents: [
            infoPanel("ลงทะเบียนแล้วได้อะไร", [
              "เก็บแต้มสะสมอัตโนมัติ",
              "ดูจำนวนครั้งที่เคยใช้บริการ",
              "แก้ชื่อ, เบอร์โทร, วันเกิดได้เอง"
            ])
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          paddingAll: "16px",
          backgroundColor: PANEL,
          contents: [
            {
              type: "button",
              style: "primary",
              color: BRAND,
              height: "md",
              action: {
                type: "uri",
                label: "✏️ ลงทะเบียนทันที",
                uri: LIFF_URL(opts.liffRegisterPath ?? "/liff/profile")
              }
            }
          ]
        }
      }
    };
  }

  return {
    type: "flex",
    altText: "โปรไฟล์ลูกค้า",
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "MEMBER PROFILE",
        title: c.full_name ?? c.display_name ?? "ลูกค้า",
        subtitle: c.phone ?? "ยังไม่ได้ระบุเบอร์",
        chips: [`${c.points} แต้ม`, `${c.visit_count} ครั้ง`, "สมาชิก"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          statsRow([
            { label: "แต้มสะสม", value: `${c.points}`, tone: "brand" },
            { label: "จำนวนครั้ง", value: `${c.visit_count}`, tone: "default" }
          ]),
          infoRow("เริ่มเป็นสมาชิก", c.registered_at ? formatDateTH(c.registered_at) : "-", "🗓️"),
          infoRow("สถานะ", "พร้อมจองและสะสมแต้ม", "✅")
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        backgroundColor: PANEL,
        contents: [
          {
            type: "button",
            style: "primary",
            color: BRAND,
            height: "md",
            action: { type: "uri", label: "📅 จองคิวใหม่", uri: LIFF_URL("/liff/booking") }
          },
          {
            type: "button",
            style: "secondary",
            height: "md",
            action: { type: "postback", label: "📋 ดูคิวของฉัน", data: "action=my_bookings" }
          }
        ]
      }
    }
  };
}

export function myBookingsMessage(bookings: BookingWithJoins[]) {
  if (bookings.length === 0) {
    return {
      type: "flex",
      altText: "คิวของฉัน",
      contents: {
        type: "bubble",
        size: "giga",
        hero: brandHeader({
          kicker: "MY BOOKINGS",
          title: "ยังไม่มีคิวในตอนนี้",
          subtitle: "เริ่มจองครั้งแรกได้ง่าย แค่เลือกบริการและเวลา"
        }),
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "18px",
          backgroundColor: PANEL,
          contents: [
            infoPanel("เริ่มได้เลย", [
              "เปิดหน้าเลือกบริการ",
              "เลือกเวลาที่สะดวก",
              "ระบบจะยืนยันคิวกลับมาให้ทันที"
            ]),
            noteCard("เพิ่มทางเลือก", "จะกดปุ่มจองคิวหรือพิมพ์เป็นประโยคธรรมดากับผู้ช่วยก็ได้")
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          paddingAll: "16px",
          backgroundColor: PANEL,
          contents: [
            {
              type: "button",
              style: "primary",
              color: BRAND,
              height: "md",
              action: { type: "postback", label: "📅 เริ่มจองคิว", data: "action=book" }
            }
          ]
        }
      }
    };
  }

  const bubbles = bookings.slice(0, 10).map((b) => {
    const actionBtns: any[] = [];
    if (b.status === "pending" || b.status === "confirmed") {
      actionBtns.push({
        type: "button",
        style: "secondary",
        height: "sm",
        margin: "sm",
        action: {
          type: "postback",
          label: "🔄 เปลี่ยนเวลา",
          data: `action=reschedule_booking&id=${b.id}`,
          displayText: `ขอเปลี่ยนเวลาคิว #${b.id}`
        }
      });
      actionBtns.push({
        type: "button",
        style: "secondary",
        height: "sm",
        margin: "sm",
        action: {
          type: "postback",
          label: "ยกเลิก",
          data: `action=cancel_booking&id=${b.id}`,
          displayText: `ขอยกเลิกคิว #${b.id}`
        }
      });
    }

    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "horizontal",
        backgroundColor: statusColor(b.status),
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            flex: 1,
            contents: [
              { type: "text", text: statusLabel(b.status), color: "#ffffff", weight: "bold", size: "sm" },
              { type: "text", text: `Booking #${b.id}`, color: "#ffffffcc", size: "xs", margin: "xs" }
            ]
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        backgroundColor: PANEL,
        contents: [
          { type: "text", text: b.service?.name ?? "-", weight: "bold", wrap: true, size: "lg", color: TEXT_MAIN },
          infoRow("วันนัด", formatDateTH(b.starts_at), "📅"),
          infoRow("เวลา", formatTimeRange(b.starts_at, b.ends_at), "🕐"),
          infoRow("ช่าง", b.staff?.nickname ?? b.staff?.name ?? "ไม่ระบุ", "💇"),
          infoRow("ราคา", `${b.price.toLocaleString()} บาท`, "💵"),
          ...actionBtns
        ]
      }
    };
  });

  return {
    type: "flex",
    altText: "คิวของฉัน",
    contents: { type: "carousel", contents: bubbles }
  };
}

export function bookingConfirmedMessage(b: BookingWithJoins) {
  return {
    type: "flex",
    altText: `ยืนยันการจอง ${b.service?.name}`,
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "BOOKING CONFIRMED",
        title: "จองคิวสำเร็จ",
        subtitle: "ขอบคุณที่ไว้วางใจให้เราดูแล",
        chips: ["เรียบร้อย", "พร้อมเสิร์ฟ", "รอคุณที่ร้าน"],
        tone: "success"
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoRow("บริการ", b.service?.name ?? "-", "✂️"),
          infoRow("วันที่", formatDateTH(b.starts_at), "📅"),
          infoRow("เวลา", formatTimeRange(b.starts_at, b.ends_at), "🕐"),
          infoRow("ช่าง", b.staff?.nickname ?? b.staff?.name ?? "ไม่ระบุ", "💇"),
          totalCard("ยอดรวม", `${b.price.toLocaleString()} บาท`),
          thankYouCard(),
          { type: "text", text: `หมายเลขจอง #${b.id}`, size: "xs", color: TEXT_MUTED, align: "center" }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        backgroundColor: PANEL,
        contents: [
          {
            type: "button",
            style: "secondary",
            height: "md",
            action: { type: "postback", label: "📋 ดูคิวของฉัน", data: "action=my_bookings", displayText: "คิวของฉัน" }
          }
        ]
      }
    }
  };
}

export function reminderMessage(b: BookingWithJoins) {
  return {
    type: "flex",
    altText: `เตือน: คิวของคุณเวลา ${formatTimeRange(b.starts_at, b.ends_at)}`,
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "APPOINTMENT REMINDER",
        title: "เตือนคิวของคุณอีก 1 ชั่วโมง",
        subtitle: formatTimeRange(b.starts_at, b.ends_at),
        chips: ["เตรียมตัว", "เช็กอุปกรณ์", "เดินทางได้"],
        tone: "warning"
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoRow("บริการ", b.service?.name ?? "-", "✂️"),
          infoRow("วันที่", formatDateTH(b.starts_at), "📅"),
          infoRow("เวลา", formatTimeRange(b.starts_at, b.ends_at), "🕐"),
          infoRow("ช่าง", b.staff?.nickname ?? b.staff?.name ?? "ไม่ระบุ", "💇"),
          thankYouCard({ title: "💜 รอพบคุณที่ร้าน", subtitle: "อีกไม่นานเจอกัน" })
        ]
      }
    }
  };
}

// ---------------- helpers ----------------
function statusLabel(s: string) {
  return { pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", completed: "เสร็จสิ้น", cancelled: "ยกเลิก", no_show: "ไม่มาตามนัด" }[s] ?? s;
}
function statusColor(s: string) {
  return { pending: WARNING, confirmed: BRAND, completed: PREMIUM_MID, cancelled: "#94a3b8", no_show: DANGER }[s] ?? PREMIUM_MID;
}

type FlexTone = "brand" | "dark" | "warning" | "success" | "critical";

function toneTheme(tone: FlexTone = "brand") {
  switch (tone) {
    case "dark":
      return { start: PREMIUM_DEEP, end: TEXT_MAIN, kicker: PREMIUM_KICKER, meta: "#e9dff0", subtitle: "#f3e8ff" };
    case "warning":
      return { start: "#7c2d12", end: WARNING, kicker: PEACH_SOFT, meta: "#fff1eb", subtitle: "#fff7fe" };
    case "success":
      return { start: PREMIUM_MID, end: "#8f63ff", kicker: PREMIUM_KICKER, meta: "#eee6ff", subtitle: "#fff7fe" };
    case "critical":
      return { start: "#4c0519", end: DANGER, kicker: "#fecdd3", meta: "#ffe4e6", subtitle: "#fff1f2" };
    default:
      return { start: TEXT_MAIN, end: BRAND, kicker: PREMIUM_KICKER, meta: "#eee6ff", subtitle: "#f3e8ff" };
  }
}

function headerChip(text: string) {
  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    paddingAll: "10px",
    cornerRadius: "12px",
    backgroundColor: "#ffffff14",
    borderWidth: "1px",
    borderColor: "#ffffff22",
    contents: [
      { type: "text", text, size: "xs", weight: "bold", color: "#ffffff", align: "center", wrap: true }
    ]
  };
}

function brandHeader(opts: {
  kicker: string;
  title: string;
  subtitle?: string;
  metaLines?: string[];
  chips?: string[];
  tone?: FlexTone;
  compact?: boolean;
}) {
  const theme = toneTheme(opts.tone);
  return {
    type: "box",
    layout: "vertical",
    paddingAll: opts.compact ? "18px" : "20px",
    background: {
      type: "linearGradient",
      angle: "135deg",
      startColor: theme.start,
      endColor: theme.end,
    },
    contents: [
      { type: "text", text: opts.kicker, color: theme.kicker, size: "xs", weight: "bold", wrap: true },
      ...(opts.metaLines ?? []).map((line) => ({ type: "text", text: line, color: theme.meta, size: "xs", margin: "xs", wrap: true })),
      { type: "text", text: opts.title, color: "#ffffff", weight: "bold", size: opts.compact ? "lg" : "xl", margin: "sm", wrap: true },
      ...(opts.subtitle ? [{ type: "text", text: opts.subtitle, color: theme.subtitle, size: "sm", margin: "sm", wrap: true } as any] : []),
      ...(opts.chips?.length ? [{ type: "box", layout: "horizontal", spacing: "sm", margin: "lg", contents: opts.chips.slice(0, 3).map((chip) => headerChip(chip)) } as any] : [])
    ]
  };
}

function noteCard(title: string, description: string, tone: FlexTone | "soft" = "soft") {
  const config = tone === "warning"
    ? { bg: "#fff7f2", border: "#ffd7c7", title: "#9a3412", body: "#9a3412" }
    : tone === "critical"
      ? { bg: "#fff1f2", border: "#fecdd3", title: "#9f1239", body: "#9f1239" }
      : tone === "dark"
        ? { bg: "#f5f0f7", border: BORDER, title: TEXT_MAIN, body: TEXT_MUTED }
        : { bg: IVORY, border: BORDER, title: TEXT_MAIN, body: TEXT_MUTED };
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    paddingAll: "14px",
    backgroundColor: config.bg,
    cornerRadius: "16px",
    borderWidth: "1px",
    borderColor: config.border,
    contents: [
      { type: "text", text: title, size: "sm", weight: "bold", color: config.title, wrap: true },
      { type: "text", text: description, size: "sm", color: config.body, wrap: true }
    ]
  };
}

function miniStat(label: string, value: string, tone: "brand" | "soft" | "warning" = "soft") {
  const palette = tone === "brand"
    ? { bg: BRAND_SOFT, border: BORDER, value: BRAND }
    : tone === "warning"
      ? { bg: "#fff7f2", border: "#ffd7c7", value: "#c2410c" }
      : { bg: "#ffffff", border: BORDER, value: TEXT_MAIN };
  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    spacing: "xs",
    paddingAll: "14px",
    cornerRadius: "16px",
    backgroundColor: palette.bg,
    borderWidth: "1px",
    borderColor: palette.border,
    contents: [
      { type: "text", text: label, size: "xs", color: TEXT_MUTED, align: "center", wrap: true },
      { type: "text", text: value, size: "xl", weight: "bold", color: palette.value, align: "center", wrap: true }
    ]
  };
}

// ======================= CHATBOT MENU & BOOKING FLOW =======================

const THAI_DAY_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** Main menu — shown when user types "เมนู" or unrecognized text. */
export function mainMenuMessage(name: string) {
  return {
    type: "flex",
    altText: "เมนูหลัก LineBook",
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "LINEBOOK HOME",
        title: "สวัสดีคุณ " + name,
        subtitle: "จัดการการจอง ดูคิวเดิม และเปิด Mini App ได้จากเมนูเดียว",
        chips: ["จองคิว", "คิวของฉัน", "แต้มสะสม"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          noteCard("เลือกวิธีที่สะดวกที่สุด", "จะกดจากปุ่มด้านล่าง หรือพิมพ์เป็นประโยคธรรมชาติกับผู้ช่วยก็ได้"),
          infoPanel("เริ่มได้ทันที", [
            "จองคิวแบบกดทีละขั้น",
            "ดูคิวที่จองไว้และจัดการนัด",
            "เช็กโปรไฟล์และแต้มสะสม"
          ]),
          noteCard("ตัวอย่างที่พิมพ์ได้", "เช่น จองทำผมพรุ่งนี้ 14:00 หรือพิมพ์ว่า คิวของฉัน")
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        backgroundColor: PANEL,
        contents: [
          {
            type: "button",
            style: "primary",
            color: BRAND,
            height: "md",
            action: { type: "postback", label: "✨ เริ่มจองคิว", data: "action=book" }
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              { type: "button", style: "secondary", flex: 1, height: "md", action: { type: "postback", label: "📋 คิวของฉัน", data: "action=my_bookings" } },
              { type: "button", style: "secondary", flex: 1, height: "md", action: { type: "postback", label: "⭐ โปรไฟล์", data: "action=profile" } }
            ]
          },
          {
            type: "button",
            style: "secondary",
            height: "md",
            action: { type: "uri", label: "🌐 เปิดแอปจอง (LIFF)", uri: LIFF_URL("/liff/booking") }
          }
        ]
      }
    }
  };
}

/** Step 1 — Service selection carousel. */
export function serviceCarouselMessage(
  services: Array<Pick<Service, "id" | "name" | "duration_min" | "price">>
) {
  if (services.length === 0) return textMessage("ยังไม่มีบริการในระบบ");

  const bubbles = services.map((s) => ({
    type: "bubble",
    size: "kilo",
    header: brandHeader({
      kicker: "SERVICE",
      title: s.name,
      subtitle: `${s.duration_min} นาที`,
      compact: true
    }),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "16px",
      backgroundColor: PANEL,
      contents: [
        totalCard("ราคาเริ่มต้น", `${s.price.toLocaleString()} บาท`),
        noteCard("ขั้นตอนถัดไป", "กดเลือกเพื่อไปต่อที่การเลือกช่างและเวลาที่สะดวก")
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "14px",
      backgroundColor: PANEL,
      contents: [
        {
          type: "button",
          style: "primary",
          color: BRAND,
          height: "sm",
          action: { type: "postback", label: "เลือก", data: `action=book_svc&id=${s.id}` }
        }
      ]
    }
  }));

  return {
    type: "flex",
    altText: "เลือกบริการ",
    contents: { type: "carousel", contents: bubbles }
  };
}

/** Step 2 — Staff selection. */
export function staffSelectMessage(
  staff: Array<Pick<Staff, "id" | "name" | "nickname">>,
  serviceId: number,
  serviceName: string
) {
  const buttons: any[] = [
    {
      type: "button",
      style: "primary",
      color: "#607d8b",
      height: "md",
      action: { type: "postback", label: "👥 ช่างคนไหนก็ได้", data: `action=book_stf&svc=${serviceId}&id=0` }
    },
    ...staff.map((s) => ({
      type: "button" as const,
      style: "secondary" as const,
      height: "md" as const,
      action: {
        type: "postback",
        label: `💇 ${s.nickname ?? s.name}`,
        data: `action=book_stf&svc=${serviceId}&id=${s.id}`
      }
    }))
  ];

  return {
    type: "flex",
    altText: `เลือกช่าง — ${serviceName}`,
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "STEP 2 · เลือกช่าง",
        title: "เลือกช่างที่ถูกใจ",
        subtitle: `บริการ: ${serviceName}`,
        chips: ["ช่างว่าง", "ประสบการณ์", "ลงคิวเร็ว"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          noteCard("เคล็ดลับจองเร็ว", "ถ้ายังไม่ได้เลือกคนที่ต้องการ กด “ช่างคนไหนก็ได้” ให้ระบบหาเวลาว่างให้ทันที"),
          ...buttons
        ]
      }
    }
  };
}

/** Step 3 — Date carousel (today + 6 days). */
export function dateCarouselMessage(
  serviceId: number,
  staffId: number | null,
  staffName: string
) {
  const now = new Date();
  const bubbles: any[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const ymd = d.toISOString().slice(0, 10);
    const dayName = i === 0 ? "วันนี้" : THAI_DAY_SHORT[d.getDay()];
    const dateNum = d.getDate();
    const monthName = THAI_MONTH_SHORT[d.getMonth()];

    const isToday = i === 0;
    bubbles.push({
      type: "bubble",
      size: "micro",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        paddingAll: "14px",
        backgroundColor: isToday ? BRAND_SOFT : "#ffffff",
        cornerRadius: "18px",
        borderWidth: "1px",
        borderColor: BORDER,
        contents: [
          { type: "text", text: dayName, align: "center", size: "xs", weight: "bold", color: isToday ? BRAND : TEXT_MUTED },
          { type: "text", text: String(dateNum), align: "center", size: "xxl", weight: "bold", color: TEXT_MAIN },
          { type: "text", text: monthName, align: "center", size: "xs", color: TEXT_MUTED },
          {
            type: "button",
            style: "primary",
            color: BRAND,
            height: "sm",
            margin: "md",
            action: {
              type: "postback",
              label: "เลือก",
              data: `action=book_date&svc=${serviceId}&stf=${staffId ?? 0}&d=${ymd}`
            }
          }
        ]
      }
    });
  }

  return {
    type: "flex",
    altText: `เลือกวันที่ — ช่าง${staffName}`,
    contents: { type: "carousel", contents: bubbles }
  };
}

/** Step 4 — Time slot grid. */
export function timeSlotMessage(
  slots: Slot[],
  serviceId: number,
  staffId: number | null,
  date: string,
  serviceName: string
) {
  if (slots.length === 0) {
    return {
      type: "flex",
      altText: "ไม่มีเวลาว่าง",
      contents: {
        type: "bubble",
        size: "giga",
        hero: brandHeader({
          kicker: "NO SLOTS",
          title: "ไม่มีเวลาว่างในวันนี้",
          subtitle: `${serviceName} · ${date}`,
          tone: "warning"
        }),
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "18px",
          backgroundColor: PANEL,
          contents: [
            noteCard("ทางเลือกสำหรับคุณ", "เลือกเปลี่ยนวัน หรือเปิดแจ้งเตือนเมื่อมีคิวหลุด ระบบจะส่งข้อความทันที", "warning"),
            {
              type: "button",
              style: "primary",
              color: BRAND,
              height: "md",
              action: {
                type: "postback",
                label: "🔔 แจ้งเตือนเมื่อมีคิวว่าง",
                data: `action=join_waitlist&svc=${serviceId}&stf=${staffId ?? 0}&d=${date}`,
                displayText: "ขอแจ้งเตือนเมื่อมีคิวว่าง"
              }
            },
            {
              type: "button",
              style: "secondary",
              height: "md",
              action: {
                type: "postback",
                label: "← เลือกวันใหม่",
                data: `action=book_stf&svc=${serviceId}&id=${staffId ?? 0}`
              }
            }
          ]
        }
      }
    };
  }

  const shown = slots.slice(0, 15);
  const rows: any[] = [];
  for (let i = 0; i < shown.length; i += 3) {
    const chunk = shown.slice(i, i + 3);
    const padded = [...chunk];
    while (padded.length < 3) padded.push(null as any);
    rows.push({
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: padded.map((s, idx) =>
        s
          ? {
              type: "button",
              flex: 1,
              style: "secondary",
              height: "sm",
              action: {
                type: "postback",
                label: s.label,
                data: `action=book_time&svc=${serviceId}&stf=${staffId ?? 0}&d=${date}&t=${s.label}`
              }
            }
          : { type: "filler", flex: 1 }
      )
    });
  }

  return {
    type: "flex",
    altText: `เลือกเวลา — ${serviceName}`,
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "STEP 4 · เลือกเวลา",
        title: "เลือกเวลาที่สะดวก",
        subtitle: `${serviceName} · ${date}`,
        chips: [`ว่าง ${slots.length} ช่วง`, "กดเพื่อจอง", "ยืนยันเร็ว"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        backgroundColor: PANEL,
        contents: [
          noteCard("กดเลือกได้ทันที", `มีเวลาว่าง ${slots.length} ช่วง ระบบจะพาไปหน้ายืนยันหลังจากเลือก`),
          ...rows
        ]
      }
    }
  };
}

/** Step 5 — Booking confirmation with confirm / cancel buttons. */
// ======================= AI BOOKING FLEX (Beautiful Design) =======================

/** AI-parsed booking confirmation — premium card design. */
export function aiBookingConfirmMessage(opts: {
  serviceName: string;
  durationMin: number;
  price: number;
  staffName: string;
  dateDisplay: string;
  timeRange: string;
  serviceId: number;
  staffId: number | null;
  date: string;
  timeLabel: string;
}) {
  return {
    type: "flex",
    altText: `ยืนยันจอง ${opts.serviceName} ${opts.timeRange}`,
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "AI BOOKING REVIEW",
        title: "จองตามที่คุณพิมพ์ไว้",
        subtitle: "ตรวจสอบรายละเอียดก่อนยืนยัน",
        chips: ["ตรวจข้อมูล", "กดยืนยัน", "พร้อมไป"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoRow("บริการ", `${opts.serviceName} · ${opts.durationMin} นาที`, "✂️"),
          infoRow("วันที่", opts.dateDisplay, "📅"),
          infoRow("เวลา", opts.timeRange, "🕐"),
          infoRow("ช่าง", opts.staffName, "💇"),
          totalCard("ยอดรวม", `${opts.price.toLocaleString()} บาท`)
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        backgroundColor: PANEL,
        contents: [
          { type: "button", style: "primary", color: BRAND, height: "md", action: {
            type: "postback", label: "✅ ยืนยันจอง", data: `action=book_go&svc=${opts.serviceId}&stf=${opts.staffId ?? 0}&d=${opts.date}&t=${opts.timeLabel}`
          }},
          { type: "button", style: "secondary", height: "md", action: { type: "postback", label: "เลือกใหม่", data: "action=book" } }
        ]
      }
    }
  };
}

/** Ask for missing time — show available slots. */
export function aiAskTimeMessage(slots: Slot[], serviceId: number, staffId: number | null, date: string, dateDisplay: string, serviceName: string) {
  const shown = slots.slice(0, 12);
  const rows: any[] = [];
  for (let i = 0; i < shown.length; i += 3) {
    const chunk = shown.slice(i, i + 3);
    const padded = [...chunk];
    while (padded.length < 3) padded.push(null as any);
    rows.push({ type: "box", layout: "horizontal", spacing: "sm", margin: i === 0 ? "none" : "sm",
      contents: padded.map((s) => s ? { type: "button", flex: 1, style: "primary", color: BRAND, height: "sm", action: { type: "postback", label: s.label, data: `action=book_time&svc=${serviceId}&stf=${staffId ?? 0}&d=${date}&t=${s.label}` } } : { type: "filler", flex: 1 })
    });
  }
  return { type: "flex", altText: `เลือกเวลา — ${serviceName}`, contents: { type: "bubble", size: "giga",
    hero: brandHeader({
      kicker: "AI SUGGESTED TIMES",
      title: "เลือกเวลาที่ต้องการ",
      subtitle: `${serviceName} · ${dateDisplay}`,
      chips: slots.length > 0 ? [`ว่าง ${slots.length} ช่วง`, "กดเพื่อจอง", "ยืนยันเร็ว"] : undefined
    }),
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "18px", backgroundColor: PANEL, contents: slots.length === 0 ? [
      noteCard("วันนี้ไม่มีเวลาว่าง", "ลองเปิดแจ้งเตือนคิวหลุดหรือเปลี่ยนวันใหม่ได้เลย", "warning"),
      { type: "button", style: "primary", color: BRAND, margin: "md", action: { type: "postback", label: "🔔 แจ้งเตือนเมื่อมีคิวว่าง", data: `action=join_waitlist&svc=${serviceId}&stf=${staffId ?? 0}&d=${date}`, displayText: "ขอแจ้งเตือนเมื่อมีคิวว่าง" } },
      { type: "button", style: "secondary", margin: "sm", action: { type: "postback", label: "← เลือกวันอื่น", data: `action=book_stf&svc=${serviceId}&id=${staffId ?? 0}` } }
    ] : [noteCard("กดเลือกได้ทันที", `มีเวลาว่าง ${slots.length} ช่วง ระบบจะพาไปหน้ายืนยันหลังจากเลือก`), ...rows] }
  }};
}

/** Admin: queue summary header. */
export function adminQueueHeader(date: string, total: number, pending: number, confirmed: number, completed: number, revenue: number) {
  return { type: "flex", altText: `สรุปคิว ${date}`, contents: { type: "bubble", size: "giga",
    hero: brandHeader({
      kicker: "TODAY\u2019S QUEUE",
      title: "คิววันนี้",
      subtitle: date,
      chips: [`รวม ${total}`, `รอยืนยัน ${pending}`, `เสร็จ ${completed}`],
      tone: "dark"
    }),
    body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "18px", backgroundColor: PANEL,
      contents: [
        statsRow([
          { label: "คิวทั้งหมด", value: String(total), tone: "brand" },
          { label: "รอยืนยัน", value: String(pending) }
        ]),
        statsRow([
          { label: "ยืนยันแล้ว", value: String(confirmed) },
          { label: "เสร็จสิ้น", value: String(completed) }
        ]),
        totalCard("💰 ยอดรวม", `${revenue.toLocaleString()} บาท`)
      ]
    }
  }};
}

/** Admin: single booking card for carousel. */
export function adminBookingCard(b: BookingWithJoins) {
  const styles: Record<string, { bg: string; label: string }> = {
    pending: { bg: WARNING, label: "⏳ รอยืนยัน" }, confirmed: { bg: BRAND, label: "✅ ยืนยันแล้ว" },
    completed: { bg: PREMIUM_MID, label: "✅ เสร็จสิ้น" }, cancelled: { bg: "#94a3b8", label: "❌ ยกเลิก" }, no_show: { bg: DANGER, label: "🚫 ไม่มา" }
  };
  const st = styles[b.status] ?? { bg: PREMIUM_MID, label: b.status };
  const time = new Date(b.starts_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: process.env.SHOP_TIMEZONE || "Asia/Bangkok" });
  const btns: any[] = [];
  if (b.status === "pending") btns.push({ type: "button", style: "primary", color: BRAND, height: "sm", flex: 1, action: { type: "postback", label: "ยืนยัน", data: `action=adm_confirm&id=${b.id}` } });
  if (b.status === "pending" || b.status === "confirmed") {
    btns.push({ type: "button", style: "secondary", height: "sm", flex: 1, action: { type: "postback", label: "เสร็จ", data: `action=adm_complete&id=${b.id}` } });
    btns.push({ type: "button", style: "secondary", height: "sm", flex: 1, action: { type: "postback", label: "ยกเลิก", data: `action=adm_cancel&id=${b.id}` } });
    btns.push({ type: "button", style: "secondary", height: "sm", flex: 1, action: { type: "postback", label: "ไม่มา", data: `action=adm_noshow&id=${b.id}` } });
  }
  return { type: "bubble", size: "micro",
    header: { type: "box", layout: "horizontal", backgroundColor: st.bg, paddingAll: "12px", contents: [
      { type: "text", text: st.label, color: "#ffffff", weight: "bold", size: "sm", flex: 1 },
      { type: "text", text: `#${b.id}`, color: "#ffffffaa", size: "xs" }
    ]},
    body: { type: "box", layout: "vertical", spacing: "xs", paddingAll: "14px", backgroundColor: PANEL, contents: [
      { type: "text", text: time, weight: "bold", size: "xl", color: TEXT_MAIN },
      { type: "text", text: b.service?.name ?? "-", size: "sm", weight: "bold", color: TEXT_MAIN, wrap: true },
      { type: "text", text: `💇 ${b.staff?.nickname ?? b.staff?.name ?? "—"} · ฿${b.price.toLocaleString()}`, size: "xs", color: TEXT_MUTED, wrap: true },
      { type: "text", text: `👤 ${b.customer?.full_name ?? b.customer?.display_name ?? "ลูกค้า"}${b.customer?.phone ? ` · ${b.customer.phone}` : ""}`, size: "xs", color: TEXT_MUTED, wrap: true },
      ...(btns.length > 0 ? [{ type: "box", layout: "horizontal", spacing: "xs", margin: "sm", contents: btns } as any] : [])
    ]}
  };
}

/** Admin: revenue summary. */
export function adminRevenueMessage(opts: {
  date: string; totalBookings: number; completed: number; cancelled: number; noShows: number;
  totalRevenue: number; byService: Array<{ name: string; count: number; revenue: number }>;
}) {
  return { type: "flex", altText: `ยอดวันนี้ ${opts.totalRevenue.toLocaleString()}฿`, contents: { type: "bubble", size: "giga",
    hero: brandHeader({
      kicker: "TODAY\u2019S REVENUE",
      title: `${opts.totalRevenue.toLocaleString()} บาท`,
      subtitle: opts.date,
      chips: [`จอง ${opts.totalBookings}`, `เสร็จ ${opts.completed}`, `ยกเลิก ${opts.cancelled}`],
      tone: "dark"
    }),
    body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "18px", backgroundColor: PANEL,
      contents: [
        statsRow([
          { label: "จอง", value: String(opts.totalBookings), tone: "brand" },
          { label: "เสร็จ", value: String(opts.completed) },
          { label: "ยกเลิก", value: String(opts.cancelled) }
        ]),
        ...(opts.byService.length > 0 ? [
          { type: "text", text: "📊 แยกตามบริการ", weight: "bold", size: "sm", color: TEXT_MAIN, margin: "sm" } as any,
          {
            type: "box" as const,
            layout: "vertical" as const,
            spacing: "xs" as const,
            paddingAll: "14px" as const,
            backgroundColor: "#ffffff",
            cornerRadius: "16px" as const,
            borderWidth: "1px" as const,
            borderColor: BORDER,
            contents: opts.byService.slice(0, 5).map((s) => ({ type: "box" as const, layout: "horizontal" as const, contents: [
              { type: "text", text: s.name, size: "xs", color: TEXT_MAIN, flex: 3, wrap: true } as any,
              { type: "text", text: `${s.count} คิว`, size: "xs", color: TEXT_MUTED, flex: 1, align: "center" } as any,
              { type: "text", text: `${s.revenue.toLocaleString()}฿`, size: "xs", weight: "bold", color: BRAND, flex: 2, align: "end" } as any
            ]}))
          }
        ] : [])
      ]
    }
  }};
}

/** Admin: action result. */
export function adminActionResultMessage(bookingId: number, action: string, customerName: string) {
  const m: Record<string, { e: string; t: string; tone: FlexTone }> = {
    confirmed: { e: "✅", t: "ยืนยันแล้ว", tone: "success" },
    completed: { e: "🎉", t: "เสร็จสิ้น + บวกแต้ม", tone: "success" },
    cancelled: { e: "❌", t: "ยกเลิกแล้ว", tone: "warning" },
    no_show: { e: "🚫", t: "บันทึกไม่มาตามนัด", tone: "critical" }
  };
  const info = m[action] ?? { e: "✓", t: action, tone: "brand" as FlexTone };
  return { type: "flex", altText: `#${bookingId} ${info.t}`, contents: { type: "bubble", size: "kilo",
    hero: brandHeader({
      kicker: "ADMIN ACTION",
      title: `${info.e} ${info.t}`,
      subtitle: `#${bookingId} · ${customerName}`,
      tone: info.tone,
      compact: true
    }),
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", backgroundColor: PANEL,
      contents: [
        noteCard("อัปเดตสถานะคิวเรียบร้อย", "ระบบบันทึกและส่งแจ้งไปยังลูกค้าเรียบร้อยแล้ว")
      ]
    }
  }};
}

export function adminAuthPromptMessage() {
  return {
    type: "flex",
    altText: "เข้าสู่โหมดแอดมิน",
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "ADMIN ACCESS",
        title: "เข้าสู่โหมดแอดมินผ่านแชท",
        subtitle: "ยืนยันตัวตนแล้วระบบจะพาไปยังเมนูจัดการร้านทันที",
        tone: "dark"
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoPanel("วิธีเข้าใช้งาน", [
            "พิมพ์: รหัสแอดมิน <รหัสของคุณ>",
            "ตัวอย่าง: รหัสแอดมิน 1234",
            "เมื่อผ่านแล้วจะเปิดเมนูตั้งค่าร้านใน LINE ให้ทันที"
          ]),
          noteCard("เริ่มได้ไวขึ้น", "กดปุ่มด้านล่างเพื่อเติมข้อความเริ่มต้น แล้วพิมพ์รหัสต่อท้ายได้เลย", "dark"),
          {
            type: "button",
            style: "secondary",
            action: { type: "message", label: "พิมพ์คำสั่งล็อกอิน", text: "รหัสแอดมิน " }
          }
        ]
      }
    }
  };
}

export function adminAuthRecoveryMessage(opts?: {
  title?: string;
  reason?: string;
  pendingLabel?: string;
}) {
  return {
    type: "flex",
    altText: "ยืนยันตัวตนแอดมินอีกครั้ง",
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "ADMIN SESSION CHECK",
        title: opts?.title ?? "ต้องยืนยันตัวตนอีกครั้ง",
        subtitle: "ระบบต้องตรวจสอบสิทธิ์อีกครั้งก่อนพาคุณกลับไปทำงานต่อ",
        tone: "warning"
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoPanel("เกิดอะไรขึ้น", [
            opts?.reason ?? "session แอดมินอาจหมดอายุหรือข้อมูลยืนยันตัวตนหลุดระหว่างทาง",
            ...(opts?.pendingLabel ? ["สิ่งที่คุณกำลังกดอยู่: " + opts.pendingLabel] : []),
            "พิมพ์รหัสแอดมินอีกครั้ง แล้วระบบจะพากลับไปต่อให้อัตโนมัติ"
          ]),
          {
            type: "button",
            style: "secondary",
            action: { type: "message", label: "พิมพ์คำสั่งล็อกอิน", text: "รหัสแอดมิน " }
          }
        ]
      }
    }
  };
}

export function adminAuthSuccessMessage() {
  return {
    type: "flex",
    altText: "เข้าสู่โหมดแอดมินสำเร็จ",
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "ADMIN MODE ENABLED",
        title: "เปิดโหมดแอดมินแล้ว",
        subtitle: "ตอนนี้คุณจัดการร้าน ดูคิว และตั้งค่าหลักผ่าน LINE ได้ทันที",
        chips: ["ตั้งค่าร้าน", "คิววันนี้", "เปิดแอดมิน"],
        tone: "success"
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoPanel("ตอนนี้คุณทำอะไรได้", [
            "เปิดแอดมินในแอป LINE (แนะนำ)",
            "ดูคิว เพิ่มบริการ เพิ่มช่างจากแชท",
            "ตั้งชื่อร้าน, เบอร์, ที่อยู่, เวลาทำการ"
          ]),
          {
            type: "button",
            style: "primary",
            color: BRAND,
            height: "md",
            action: { type: "uri", label: "🛠 เปิดแอดมินในแอป LINE", uri: LIFF_URL("/liff/admin") }
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              { type: "button", style: "secondary", flex: 1, action: { type: "postback", label: "เมนูแอดมิน", data: "action=adm_menu" } },
              { type: "button", style: "secondary", flex: 1, action: { type: "postback", label: "คิววันนี้", data: "action=adm_queue_today" } }
            ]
          }
        ]
      }
    }
  };
}

export function adminMenuMessage() {
  return {
    type: "flex",
    altText: "เมนูแอดมิน",
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "LINE ADMIN HOME",
        title: "หน้าแรกแอดมินผ่าน LINE",
        subtitle: "ทุกปุ่มจะพาคุณเข้า step ถัดไปทันที พร้อมสถานะการทำงานที่อ่านง่ายขึ้น",
        chips: ["ตั้งค่าร้าน", "คิวและรายได้", "จัดการระบบ"],
        tone: "dark"
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          noteCard("เริ่มจากโหมดที่ต้องการ", "ถ้าจะตั้งค่าร้าน แนะนำให้เปิด Setup Wizard เพื่อไล่ทีละขั้น"),
          infoPanel("โหมด 1 · ตั้งค่าร้าน", ["ใช้เมื่ออยากไล่ตั้งค่า shop, service, staff, hours ผ่านแชท"]),
          { type: "box", layout: "horizontal", spacing: "sm", contents: [
            { type: "button", style: "primary", color: BRAND, flex: 1, height: "md", action: { type: "postback", label: "⚙️ ตั้งค่าร้าน", data: "action=adm_setup" } },
            { type: "button", style: "secondary", flex: 1, height: "md", action: { type: "postback", label: "📊 สถานะร้าน", data: "action=adm_status" } }
          ] },
          infoPanel("โหมด 2 · คิวและรายได้", ["ใช้ดูงานวันนี้เร็ว ๆ โดยไม่ต้องเปิดเว็บหลังบ้าน"]),
          { type: "box", layout: "horizontal", spacing: "sm", contents: [
            { type: "button", style: "secondary", flex: 1, height: "md", action: { type: "postback", label: "📋 คิววันนี้", data: "action=adm_queue_today" } },
            { type: "button", style: "secondary", flex: 1, height: "md", action: { type: "postback", label: "💰 ยอดวันนี้", data: "action=adm_revenue" } }
          ] },
          infoPanel("โหมด 3 · จัดการระบบ", ["ใช้ตอนอยากเปิดเว็บหลังบ้านหรือออกจากโหมดแอดมิน"]),
          { type: "box", layout: "horizontal", spacing: "sm", contents: [
            { type: "button", style: "primary", color: BRAND, flex: 1, height: "md", action: { type: "uri", label: "🛠 เปิดแอดมินใน LINE", uri: LIFF_URL("/liff/admin") } },
            { type: "button", style: "secondary", flex: 1, height: "md", action: { type: "postback", label: "🚪 ออก", data: "action=adm_logout" } }
          ] }
        ]
      }
    }
  };
}

export function adminSetupMenuMessage() {
  return {
    type: "flex",
    altText: "ตั้งค่าร้านผ่าน LINE",
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "SHOP SETUP VIA LINE",
        title: "ตั้งค่าร้านผ่านแชท",
        subtitle: "เริ่มจาก Setup Wizard หรือเลือกหัวข้อที่ต้องการจัดการได้ทันที",
        chips: ["Wizard", "สถานะร้าน", "เปิดตั้งค่า"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          noteCard("แนะนำสำหรับครั้งแรก", "เริ่มจาก Setup Wizard เพราะมันพาไปทีละขั้นและลดความงงระหว่างตั้งค่า"),
          { type: "button", style: "primary", color: BRAND, height: "md", action: { type: "postback", label: "🪄 Setup Wizard", data: "action=adm_wizard_start" } },
          { type: "button", style: "secondary", height: "md", action: { type: "postback", label: "📊 สถานะร้านตอนนี้", data: "action=adm_status" } },
          infoPanel("หัวข้อที่ตั้งค่าแยกได้", [
            "ตั้งชื่อ / เบอร์ / ที่อยู่ร้าน",
            "เพิ่มบริการและราคา",
            "เพิ่มช่างและเวลาทำการ"
          ]),
          { type: "button", style: "secondary", height: "md", action: { type: "postback", label: "🏪 ตั้งชื่อ / เบอร์ / ที่อยู่", data: "action=adm_help_shop" } },
          { type: "button", style: "secondary", height: "md", action: { type: "postback", label: "✂️ เพิ่มบริการ", data: "action=adm_help_service" } },
          { type: "button", style: "secondary", height: "md", action: { type: "postback", label: "💇 เพิ่มช่าง", data: "action=adm_help_staff" } },
          { type: "button", style: "secondary", height: "md", action: { type: "postback", label: "🕒 ตั้งเวลาเปิดปิดร้าน", data: "action=adm_help_hours" } },
          { type: "button", style: "secondary", height: "md", action: { type: "postback", label: "🧑‍🔧 ตั้งเวลารายช่าง", data: "action=adm_help_staff_hours" } },
          { type: "button", style: "primary", color: BRAND, height: "md", action: { type: "uri", label: "🛠 เปิดหน้าตั้งค่าใน LINE", uri: LIFF_URL("/liff/admin/setup") } }
        ]
      }
    }
  };
}

export function adminSetupStatusMessage(opts: {
  readyCount: number;
  totalCount: number;
  summary: string;
  missing: string[];
}) {
  return {
    type: "flex",
    altText: "สถานะร้าน",
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "SHOP STATUS",
        title: String(opts.readyCount) + "/" + String(opts.totalCount) + " พร้อมแล้ว",
        subtitle: opts.summary,
        chips: ["พร้อมแล้ว " + String(opts.readyCount), "เหลือ " + String(Math.max(opts.totalCount - opts.readyCount, 0))],
        tone: opts.readyCount === opts.totalCount ? "success" : "dark"
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          statsRow([
            { label: "พร้อมแล้ว", value: String(opts.readyCount), tone: "brand" },
            { label: "เหลือ", value: String(Math.max(opts.totalCount - opts.readyCount, 0)), tone: "default" }
          ]),
          noteCard("สรุปตอนนี้", opts.summary),
          infoPanel("สิ่งที่ยังควรทำต่อ", opts.missing.length ? opts.missing : ["ตอนนี้พร้อมใช้งานพื้นฐานแล้ว"]),
          { type: "box", layout: "horizontal", spacing: "sm", contents: [
            { type: "button", style: "primary", color: BRAND, flex: 1, action: { type: "postback", label: "🪄 Setup Wizard", data: "action=adm_wizard_start" } },
            { type: "button", style: "secondary", flex: 1, action: { type: "postback", label: "⚙️ เมนูตั้งค่า", data: "action=adm_setup" } }
          ] }
        ]
      }
    }
  };
}

export function adminTextExamplesMessage(title: string, examples: string[]) {
  return {
    type: "flex",
    altText: title,
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "TEXT EXAMPLES",
        title,
        subtitle: "คัดลอกแนวทางแล้วพิมพ์ต่อได้เลย",
        tone: "dark",
        compact: true
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoPanel("พิมพ์ตามตัวอย่างนี้ได้เลย", examples),
          { type: "button", style: "secondary", action: { type: "postback", label: "⬅️ กลับเมนูตั้งค่า", data: "action=adm_setup" } }
        ]
      }
    }
  };
}

export function adminWizardPromptMessage(opts: {
  title: string;
  description: string;
  example?: string;
  stepLabel?: string;
  allowSkip?: boolean;
  progressText?: string;
  savedItems?: string[];
  tip?: string;
  breadcrumb?: string;
}) {
  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: opts.stepLabel ?? "SETUP WIZARD",
        title: opts.title,
        subtitle: opts.description,
        metaLines: [
          ...(opts.progressText ? [opts.progressText] : []),
          ...(opts.breadcrumb ? [opts.breadcrumb] : [])
        ]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          ...(opts.savedItems?.length ? [infoPanel("บันทึกไปแล้ว", opts.savedItems)] : []),
          ...(opts.example ? [infoPanel("ตัวอย่างข้อความที่พิมพ์ได้", [opts.example])] : []),
          ...(opts.tip ? [noteCard("Tips", opts.tip, "dark")] : []),
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              ...(opts.allowSkip ? [{ type: "button", style: "secondary", flex: 1, action: { type: "postback", label: "ข้าม", data: "action=adm_wizard_skip", displayText: "ข้ามขั้นตอนนี้" } } as any] : []),
              { type: "button", style: "secondary", flex: 1, action: { type: "postback", label: "ยกเลิก", data: "action=adm_wizard_cancel", displayText: "ยกเลิก Setup Wizard" } }
            ]
          }
        ]
      }
    }
  };
}

export function adminWizardDayPickerMessage(savedItems: string[] = []) {
  const days = [
    { label: "จันทร์", value: 1 },
    { label: "อังคาร", value: 2 },
    { label: "พุธ", value: 3 },
    { label: "พฤหัส", value: 4 },
    { label: "ศุกร์", value: 5 },
    { label: "เสาร์", value: 6 },
    { label: "อาทิตย์", value: 0 },
  ];

  return {
    type: "flex",
    altText: "เลือกวันสำหรับเวลาทำการ",
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "SETUP WIZARD · STEP 6/6",
        title: "เลือกว่าเวลาทำการนี้ใช้กับวันไหน",
        subtitle: "กดเลือกวัน แล้วผมจะถามเวลาของวันนั้นต่อทันที",
        metaLines: ["● ● ● ● ● ●", "แอดมิน > ตั้งค่าร้าน > Setup Wizard > เวลาทำการ"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          ...(savedItems.length ? [infoPanel("บันทึกไปแล้ว", savedItems)] : []),
          noteCard("เลือกรายวัน", "เหมาะสำหรับร้านที่มีเวลาเปิดปิดต่างกันในแต่ละวัน"),
          ...days.map((day) => ({
            type: "button",
            style: "secondary",
            height: "md",
            action: { type: "postback", label: day.label, data: "action=adm_wizard_day&value=" + day.value + "&label=" + encodeURIComponent(day.label), displayText: "เลือกวัน" + day.label }
          })),
          { type: "button", style: "secondary", action: { type: "postback", label: "ยกเลิก", data: "action=adm_wizard_cancel", displayText: "ยกเลิก Setup Wizard" } }
        ]
      }
    }
  };
}

export function adminWizardProgressMessage(opts: {
  title: string;
  currentStep: number;
  totalSteps: number;
  description?: string;
  savedItems?: string[];
  breadcrumb?: string;
}) {
  const progress = Array.from({ length: opts.totalSteps }, (_, i) => (i < opts.currentStep ? "●" : "○")).join(" ");
  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      size: "giga",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          miniStat("ความคืบหน้า", String(opts.currentStep) + "/" + String(opts.totalSteps), "brand"),
          noteCard("กำลังไปขั้นถัดไป", opts.title, "dark"),
          { type: "text", text: progress, size: "sm", color: BRAND_DARK, align: "center" },
          ...(opts.breadcrumb ? [{ type: "text", text: opts.breadcrumb, size: "xs", color: TEXT_MUTED, wrap: true } as any] : []),
          ...(opts.description ? [{ type: "text", text: opts.description, size: "sm", color: TEXT_MUTED, wrap: true } as any] : []),
          ...(opts.savedItems?.length ? [infoPanel("บันทึกแล้ว", opts.savedItems)] : [])
        ]
      }
    }
  };
}

export function adminWizardDoneMessage(summary: string[]) {
  return {
    type: "flex",
    altText: "ตั้งค่าพื้นฐานร้านเสร็จแล้ว",
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "SETUP COMPLETE",
        title: "ตั้งค่าพื้นฐานร้านเสร็จแล้ว",
        subtitle: "พร้อมไปต่อที่เมนูแอดมิน หรือเพิ่มข้อมูลร้านต่อได้ทันที",
        tone: "success",
        chips: ["พร้อมใช้งาน", "เพิ่มบริการ", "เพิ่มช่าง"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoPanel("สิ่งที่ wizard ทำให้แล้ว", summary),
          { type: "box", layout: "vertical", spacing: "sm", contents: [
            { type: "button", style: "primary", color: BRAND, action: { type: "postback", label: "➕ เพิ่มบริการอีก", data: "action=adm_wizard_more_service", displayText: "เพิ่มบริการอีก" } },
            { type: "button", style: "secondary", action: { type: "postback", label: "➕ เพิ่มช่างอีก", data: "action=adm_wizard_more_staff", displayText: "เพิ่มช่างอีก" } },
            { type: "button", style: "secondary", action: { type: "postback", label: "✅ เสร็จแล้ว ไปเมนูแอดมิน", data: "action=adm_menu", displayText: "กลับเมนูแอดมิน" } }
          ] }
        ]
      }
    }
  };
}

export function adminWizardBatchResultMessage(opts: {
  title: string;
  lines: string[];
  primaryLabel: string;
  primaryAction: string;
  secondaryLabel: string;
  secondaryAction: string;
  tertiaryLabel?: string;
  tertiaryAction?: string;
}) {
  const buttons: any[] = [
    { type: "button", style: "primary", color: BRAND, action: { type: "postback", label: opts.primaryLabel, data: opts.primaryAction, displayText: opts.primaryLabel } },
    { type: "button", style: "secondary", action: { type: "postback", label: opts.secondaryLabel, data: opts.secondaryAction, displayText: opts.secondaryLabel } },
  ];

  if (opts.tertiaryLabel && opts.tertiaryAction) {
    buttons.push({ type: "button", style: "secondary", action: { type: "postback", label: opts.tertiaryLabel, data: opts.tertiaryAction, displayText: opts.tertiaryLabel } });
  }

  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      size: "giga",
      header: brandHeader({
        kicker: "WIZARD RESULT",
        title: opts.title,
        subtitle: "สรุปสิ่งที่ทำสำเร็จและปุ่มไปต่อที่เกี่ยวข้อง",
        tone: "dark",
        compact: true
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoPanel("สรุป", opts.lines),
          { type: "box", layout: "vertical", spacing: "sm", contents: buttons }
        ]
      }
    }
  };
}

/** Safe welcome card for LINE reply API. */
export function smartWelcomeMessage(name: string) {
  return {
    type: "flex",
    altText: "ยินดีต้อนรับ คุณ " + name,
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "WELCOME TO LINEBOOK",
        title: "สวัสดีค่ะ คุณ " + name,
        subtitle: "จองคิวผ่าน LINE ได้ทันที ไม่ต้องออกจากแชท",
        chips: ["จองคิว", "คิวของฉัน", "โปรไฟล์"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoPanel("ลองพิมพ์แบบนี้ได้เลย", [
            "จองตัดผมพรุ่งนี้บ่ายสอง",
            "คิวของฉัน",
            "แต้มสะสม"
          ]),
          noteCard("เริ่มใช้งานแบบเร็ว", "คุณสามารถแตะปุ่มด้านล่าง หรือพิมพ์คุยกับผู้ช่วยได้ทันที")
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        backgroundColor: PANEL,
        contents: [
          { type: "button", style: "primary", color: BRAND, action: { type: "postback", label: "📅 จองคิวเลย", data: "action=book" } },
          { type: "box", layout: "horizontal", spacing: "sm", contents: [
            { type: "button", style: "secondary", flex: 1, action: { type: "postback", label: "📋 คิวของฉัน", data: "action=my_bookings" } },
            { type: "button", style: "secondary", flex: 1, action: { type: "postback", label: "⭐ โปรไฟล์ / แต้ม", data: "action=profile" } }
          ] }
        ]
      }
    }
  };
}

export function confirmBookingFlex(opts: {
  serviceName: string;
  staffName: string;
  dateDisplay: string;
  timeRange: string;
  price: number;
  serviceId: number;
  staffId: number | null;
  date: string;
  timeLabel: string;
}) {
  return {
    type: "flex",
    altText: "ยืนยันการจอง",
    contents: {
      type: "bubble",
      size: "giga",
      hero: brandHeader({
        kicker: "BOOKING REVIEW",
        title: "ตรวจสอบก่อนยืนยันการจอง",
        subtitle: "เช็กรายละเอียดให้ครบก่อนยืนยัน",
        chips: ["ตรวจครบ", "กดยืนยัน", "เสร็จทันที"]
      }),
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        backgroundColor: PANEL,
        contents: [
          infoRow("บริการ", opts.serviceName, "✂️"),
          infoRow("วัน", opts.dateDisplay, "📅"),
          infoRow("เวลา", opts.timeRange, "🕐"),
          infoRow("ช่าง", opts.staffName, "💇"),
          totalCard("ราคา", `${opts.price.toLocaleString()} บาท`)
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        backgroundColor: PANEL,
        contents: [
          {
            type: "button",
            style: "primary",
            color: BRAND,
            height: "md",
            action: {
              type: "postback",
              label: "✅ ยืนยันการจอง",
              data: `action=book_go&svc=${opts.serviceId}&stf=${opts.staffId ?? 0}&d=${opts.date}&t=${opts.timeLabel}`
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "md",
            action: { type: "postback", label: "❌ ยกเลิก / กลับเมนู", data: "action=menu" }
          }
        ]
      }
    }
  };
}

function infoPanel(title: string, items: string[]) {
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    paddingAll: "14px",
    backgroundColor: "#ffffff",
    cornerRadius: "16px",
    borderWidth: "1px",
    borderColor: BORDER,
    contents: [
      { type: "text", text: title, size: "sm", weight: "bold", color: TEXT_MAIN, wrap: true },
      ...items.map((item) => ({ type: "text", text: "• " + item, size: "sm", color: TEXT_MUTED, wrap: true }))
    ]
  };
}

function infoRow(label: string, value: string, emoji: string) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    paddingAll: "14px",
    backgroundColor: "#ffffff",
    cornerRadius: "16px",
    borderWidth: "1px",
    borderColor: BORDER,
    contents: [
      {
        type: "box",
        layout: "vertical",
        flex: 0,
        paddingAll: "8px",
        justifyContent: "center",
        backgroundColor: BRAND_SOFT,
        cornerRadius: "12px",
        contents: [
          { type: "text", text: emoji, size: "lg", align: "center", gravity: "center" }
        ]
      },
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        spacing: "xs",
        contents: [
          { type: "text", text: label, size: "xs", color: TEXT_MUTED },
          { type: "text", text: value, size: "sm", color: TEXT_MAIN, weight: "bold", wrap: true }
        ]
      }
    ]
  };
}

/** Soft mauve brand card: typography-only brand touch for completion / see-you moments. */
function thankYouCard(opts: { title?: string; subtitle?: string } = {}) {
  const title = opts.title ?? "💜 ขอบคุณที่ไว้วางใจ";
  const subtitle = opts.subtitle ?? "LIN3 × BOOK";
  return {
    type: "box",
    layout: "vertical",
    margin: "md",
    paddingAll: "14px",
    backgroundColor: IVORY,
    cornerRadius: "16px",
    borderWidth: "1px",
    borderColor: BORDER,
    contents: [
      { type: "text", text: title, color: TEXT_MAIN, size: "sm", weight: "bold", align: "center", wrap: true },
      { type: "text", text: subtitle, color: "#6b4e7a", size: "xs", align: "center", margin: "xs" }
    ]
  };
}

function totalCard(label: string, value: string) {
  return {
    type: "box",
    layout: "horizontal",
    paddingAll: "14px",
    background: {
      type: "linearGradient",
      angle: "135deg",
      startColor: TEXT_MAIN,
      endColor: BRAND,
    },
    cornerRadius: "16px",
    contents: [
      { type: "text", text: label, color: "#e9dff0", size: "sm", gravity: "center" },
      { type: "text", text: value, color: "#ffffff", size: "xl", weight: "bold", align: "end", gravity: "center" }
    ]
  };
}

function statsRow(items: Array<{ label: string; value: string; tone?: "brand" | "default" }>) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: items.map((item) => miniStat(item.label, item.value, item.tone === "brand" ? "brand" : "soft"))
  };
}
