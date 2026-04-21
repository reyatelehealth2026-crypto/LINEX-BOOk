// Flex / Quick-reply message builders for the LINE bot.
import type { BookingWithJoins, Customer, Service, Staff } from "@/types/db";
import { formatDateTH, formatTimeRange } from "./format";
import type { Slot } from "./booking";

const BRAND = "#06c755";
const BRAND_DARK = "#049c44";
const BRAND_SOFT = "#e8f8ee";
const TEXT_MAIN = "#111827";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const PANEL = "#f8fafc";
const WARNING = "#f59e0b";
const PREMIUM_DARK = "#221733";
const PREMIUM_PRIMARY = "#6d3bff";
const PREMIUM_SOFT = "#f7f2ff";
const PREMIUM_BORDER = "#e9dff0";

const LIFF_URL = (path = "") => {
  const id = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
  const normalized = path.startsWith("/liff/") ? path.slice(5) : path;
  return `https://liff.line.me/${id}${normalized}`;
};

const APP_URL = (path = "") => {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return base ? `${base}${path}` : "https://example.com";
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
          startColor: PREMIUM_DARK,
          endColor: PREMIUM_PRIMARY,
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
            borderColor: PREMIUM_BORDER,
            contents: [
              { type: "text", text: "พร้อมเริ่มใช้งานแล้ว", size: "sm", weight: "bold", color: PREMIUM_DARK },
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
            backgroundColor: PREMIUM_SOFT,
            cornerRadius: "14px",
            borderWidth: "1px",
            borderColor: PREMIUM_BORDER,
            contents: [
              { type: "text", text: "พิมพ์กับผู้ช่วยได้ทันที", size: "sm", weight: "bold", color: PREMIUM_DARK },
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
            color: PREMIUM_PRIMARY,
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
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: BRAND,
          paddingAll: "18px",
          contents: [
            { type: "text", text: "โปรไฟล์สมาชิก", color: "#ffffffcc", size: "xs", weight: "bold" },
            { type: "text", text: "ยังไม่ได้ลงทะเบียน", color: "#ffffff", weight: "bold", size: "xl", margin: "sm" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            infoPanel("ลงทะเบียนแล้วได้อะไร", [
              "เก็บแต้มสะสมอัตโนมัติ",
              "ดูจำนวนครั้งที่เคยใช้บริการ",
              "แก้ชื่อ, เบอร์โทร, วันเกิดได้เอง"
            ]),
            {
              type: "button",
              style: "primary",
              color: BRAND,
              action: {
                type: "uri",
                label: "ลงทะเบียน",
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "16px",
        contents: [
          { type: "text", text: "MEMBER PROFILE", color: "#ffffffcc", size: "xs", weight: "bold" },
          { type: "text", text: c.full_name ?? c.display_name ?? "ลูกค้า", color: "#ffffff", weight: "bold", size: "xl", margin: "sm" },
          { type: "text", text: c.phone ?? "ยังไม่ได้ระบุเบอร์", color: "#ffffffcc", size: "sm", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          statsRow([
            { label: "แต้มสะสม", value: `${c.points}`, tone: "brand" },
            { label: "จำนวนครั้ง", value: `${c.visit_count}`, tone: "default" }
          ]),
          infoRow("เริ่มเป็นสมาชิก", c.registered_at ? formatDateTH(c.registered_at) : "-", "🗓️"),
          infoRow("สถานะ", "พร้อมจองและสะสมแต้ม", "✅"),
          {
            type: "button",
            style: "secondary",
            action: { type: "uri", label: "📅 จองคิวใหม่", uri: LIFF_URL("/liff/booking") },
            margin: "md"
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
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: BRAND,
          paddingAll: "18px",
          contents: [
            { type: "text", text: "MY BOOKINGS", color: "#ffffffcc", size: "xs", weight: "bold" },
            { type: "text", text: "ยังไม่มีคิวในตอนนี้", color: "#ffffff", weight: "bold", size: "xl", margin: "sm" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            infoPanel("เริ่มได้เลย", [
              "เปิดหน้าเลือกบริการ",
              "เลือกเวลาที่สะดวก",
              "ระบบจะยืนยันคิวกลับมาให้ทันที"
            ]),
            {
              type: "button",
              style: "primary",
              color: BRAND,
              action: { type: "uri", label: "📅 จองคิว", uri: LIFF_URL("/liff/booking") }
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
        layout: "vertical",
        backgroundColor: statusColor(b.status),
        paddingAll: "14px",
        contents: [
          { type: "text", text: statusLabel(b.status), color: "#ffffff", weight: "bold", size: "sm" },
          { type: "text", text: `Booking #${b.id}`, color: "#ffffffcc", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
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
      hero: {
        type: "image",
        url: APP_URL("/brand/hero-confirmed.png"),
        size: "full",
        aspectRatio: "2:1",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "BOOKING CONFIRMED", color: TEXT_MUTED, size: "xs", weight: "bold" },
          { type: "text", text: "จองคิวสำเร็จ", color: TEXT_MAIN, weight: "bold", size: "xl", margin: "sm" },
          { type: "separator", margin: "md" },
          infoRow("บริการ", b.service?.name ?? "-", "✂️"),
          infoRow("วันที่", formatDateTH(b.starts_at), "📅"),
          infoRow("เวลา", formatTimeRange(b.starts_at, b.ends_at), "🕐"),
          infoRow("ช่าง", b.staff?.nickname ?? b.staff?.name ?? "ไม่ระบุ", "💇"),
          totalCard("ยอดรวม", `${b.price.toLocaleString()} บาท`),
          thankYouCard(),
          { type: "text", text: `หมายเลขจอง #${b.id}`, size: "xs", color: TEXT_MUTED, margin: "md" },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "📋 ดูคิวของฉัน", data: "action=my_bookings", displayText: "คิวของฉัน" },
            margin: "sm"
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
      header: {
        type: "box", layout: "vertical", backgroundColor: WARNING, paddingAll: "16px",
        contents: [
          { type: "text", text: "APPOINTMENT REMINDER", color: "#fff7ed", size: "xs", weight: "bold" },
          { type: "text", text: "เตือนคิวของคุณอีก 1 ชั่วโมง", color: "#fff", weight: "bold", size: "lg", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
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
function row(label: string, value: string, highlight = false) {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, size: "sm", color: "#888888", flex: 3 },
      {
        type: "text",
        text: value,
        size: highlight ? "md" : "sm",
        color: highlight ? BRAND : "#111111",
        weight: highlight ? "bold" : "regular",
        wrap: true,
        flex: 5
      }
    ]
  };
}

function statusLabel(s: string) {
  return { pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", completed: "เสร็จสิ้น", cancelled: "ยกเลิก", no_show: "ไม่มาตามนัด" }[s] ?? s;
}
function statusColor(s: string) {
  return { pending: "#ff9800", confirmed: BRAND, completed: "#607d8b", cancelled: "#9e9e9e", no_show: "#e53935" }[s] ?? "#607d8b";
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
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "20px",
        contents: [
          { type: "text", text: "LINEBOOK", color: "#ffffffcc", weight: "bold", size: "xs" },
          { type: "text", text: `สวัสดีคุณ ${name}`, color: "#ffffff", weight: "bold", size: "xl", margin: "sm" },
          { type: "text", text: "เลือกสิ่งที่ต้องการได้เลยจากเมนูด้านล่าง", color: "#ffffffcc", size: "sm", margin: "sm", wrap: true }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          infoPanel("ใช้ได้ทั้งในแชทและ Mini App", [
            "จองคิวแบบกดทีละขั้น",
            "ดูคิวที่จองไว้",
            "เช็กโปรไฟล์และแต้มสะสม"
          ]),
          {
            type: "button",
            style: "primary",
            color: BRAND,
            height: "md",
            action: { type: "postback", label: "📅 จองคิว", data: "action=book" }
          },
          {
            type: "button",
            style: "secondary",
            height: "md",
            action: { type: "postback", label: "📋 คิวของฉัน", data: "action=my_bookings" }
          },
          {
            type: "button",
            style: "secondary",
            height: "md",
            action: { type: "postback", label: "⭐ โปรไฟล์ / แต้ม", data: "action=profile" }
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
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: BRAND_SOFT,
      paddingAll: "14px",
      contents: [
        { type: "text", text: "SERVICE", size: "xs", weight: "bold", color: BRAND_DARK },
        { type: "text", text: `${s.duration_min} นาที`, size: "xs", color: TEXT_MUTED, margin: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "16px",
      contents: [
        { type: "text", text: s.name, weight: "bold", size: "lg", wrap: true, color: TEXT_MAIN },
        totalCard("ราคาเริ่มต้น", `${s.price.toLocaleString()} บาท`),
        { type: "text", text: "เหมาะสำหรับกดเลือกเพื่อไปต่อขั้นตอนเลือกช่างและเวลา", size: "xs", color: TEXT_MUTED, wrap: true },
        {
          type: "button",
          style: "primary",
          color: BRAND,
          height: "sm",
          margin: "md",
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "16px",
        contents: [
          { type: "text", text: "เลือกช่าง", color: "#fff", weight: "bold", size: "xl" },
          { type: "text", text: `บริการ: ${serviceName}`, color: "#ffffffcc", size: "sm", margin: "sm", wrap: true }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "ถ้ายังไม่ได้เลือกคนที่ต้องการ สามารถกด “ช่างคนไหนก็ได้” เพื่อให้ระบบหาเวลาว่างให้เร็วที่สุด", size: "sm", color: TEXT_MUTED, wrap: true },
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

    bubbles.push({
      type: "bubble",
      size: "micro",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "xs",
        paddingAll: "12px",
        contents: [
          { type: "text", text: dayName, align: "center", size: "xs", color: "#888" },
          { type: "text", text: String(dateNum), align: "center", size: "xl", weight: "bold" },
          { type: "text", text: monthName, align: "center", size: "xs", color: "#888" },
          {
            type: "button",
            style: "primary",
            color: BRAND,
            height: "sm",
            margin: "sm",
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
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: WARNING,
          paddingAll: "16px",
          contents: [
            { type: "text", text: "ไม่มีเวลาว่างในวันนี้", weight: "bold", size: "xl", color: "#fff" },
            { type: "text", text: `${serviceName} · ${date}`, size: "sm", color: "#fffbeb", margin: "sm" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "20px",
          contents: [
            { type: "text", text: "ลองเปลี่ยนวัน หรือเปิดแจ้งเตือนเพื่อให้ระบบบอกทันทีเมื่อมีคิวหลุด", size: "sm", color: TEXT_MUTED, wrap: true },
            {
              type: "button",
              style: "primary",
              color: "#8b5cf6",
              margin: "md",
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
              margin: "sm",
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "16px",
        contents: [
          { type: "text", text: "เลือกเวลาที่สะดวก", color: "#fff", weight: "bold", size: "xl" },
          { type: "text", text: `${serviceName} · ${date}`, color: "#ffffffcc", size: "sm", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          { type: "text", text: `มีเวลาว่าง ${slots.length} ช่วง`, size: "sm", color: TEXT_MUTED },
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "20px",
        contents: [
          { type: "text", text: "จองตามที่คุณพิมพ์ไว้ได้เลย", color: "#ffffff", weight: "bold", size: "xl" },
          { type: "text", text: "ตรวจสอบรายละเอียดก่อนยืนยัน", color: "#ffffffcc", size: "sm", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "20px",
        contents: [
          infoRow("บริการ", `${opts.serviceName} · ${opts.durationMin} นาที`, "✂️"),
          infoRow("วันที่", opts.dateDisplay, "📅"),
          infoRow("เวลา", opts.timeRange, "🕐"),
          infoRow("ช่าง", opts.staffName, "💇"),
          totalCard("ยอดรวม", `${opts.price.toLocaleString()} บาท`),
          { type: "box", layout: "horizontal", spacing: "sm", margin: "xl", contents: [
            { type: "button", style: "primary", color: BRAND, flex: 3, height: "md", action: {
              type: "postback", label: "✅ ยืนยันจอง", data: `action=book_go&svc=${opts.serviceId}&stf=${opts.staffId ?? 0}&d=${opts.date}&t=${opts.timeLabel}`
            }},
            { type: "button", style: "secondary", flex: 2, height: "md", action: { type: "postback", label: "เลือกใหม่", data: "action=book" } }
          ]}
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
    header: { type: "box", layout: "vertical", backgroundColor: BRAND, paddingAll: "16px",
      contents: [
        { type: "text", text: "เลือกเวลาที่ต้องการ", color: "#ffffff", weight: "bold", size: "xl" },
        { type: "text", text: `${serviceName} · ${dateDisplay}`, color: "#ffffffcc", size: "sm", margin: "sm" }
      ]
    },
    body: { type: "box", layout: "vertical", paddingAll: "16px", contents: slots.length === 0 ? [
      { type: "text", text: "ไม่มีเวลาว่างในวันที่เลือก ลองเปิดแจ้งเตือนคิวหลุดหรือเปลี่ยนวันได้เลย", align: "center", color: TEXT_MUTED, wrap: true },
      { type: "button", style: "primary", color: "#8b5cf6", margin: "md", action: { type: "postback", label: "🔔 แจ้งเตือนเมื่อมีคิวว่าง", data: `action=join_waitlist&svc=${serviceId}&stf=${staffId ?? 0}&d=${date}`, displayText: "ขอแจ้งเตือนเมื่อมีคิวว่าง" } },
      { type: "button", style: "secondary", margin: "sm", action: { type: "postback", label: "← เลือกวันอื่น", data: `action=book_stf&svc=${serviceId}&id=${staffId ?? 0}` } }
    ] : [{ type: "text", text: `มีเวลาว่าง ${slots.length} ช่วง`, size: "sm", color: TEXT_MUTED, margin: "sm" }, ...rows] }
  }};
}

/** Admin: queue summary header. */
export function adminQueueHeader(date: string, total: number, pending: number, confirmed: number, completed: number, revenue: number) {
  const stat = (label: string, value: number, bg: string) => ({ type: "box", layout: "vertical", flex: 1, paddingAll: "12px", cornerRadius: "12px", backgroundColor: bg,
    contents: [{ type: "text", text: String(value), weight: "bold", size: "xl", align: "center" }, { type: "text", text: label, size: "xs", color: "#666", align: "center" }]
  });
  return { type: "flex", altText: `สรุปคิว ${date}`, contents: { type: "bubble",
    header: { type: "box", layout: "vertical", background: { type: "linearGradient", angle: "135deg", startColor: "#06c755", endColor: "#049040" }, paddingAll: "18px",
      contents: [
        { type: "text", text: "📋 คิววันนี้", color: "#ffffff", weight: "bold", size: "lg" },
        { type: "text", text: date, color: "#ffffffcc", size: "xs", margin: "xs" }
      ]
    },
    body: { type: "box", layout: "vertical", spacing: "md", paddingAll: "16px",
      contents: [
        { type: "box", layout: "horizontal", spacing: "sm", contents: [stat("คิวทั้งหมด", total, "#f0fdf4"), stat("รอยืนยัน", pending, "#fffbeb")] },
        { type: "box", layout: "horizontal", spacing: "sm", contents: [stat("ยืนยันแล้ว", confirmed, "#f0fdf4"), stat("เสร็จสิ้น", completed, "#f1f5f9")] },
        { type: "box", layout: "horizontal", paddingAll: "14px", cornerRadius: "12px", backgroundColor: "#1a1a1a", margin: "sm",
          contents: [
            { type: "text", text: "💰 ยอดรวม", color: "#ffffffcc", size: "sm", gravity: "center" },
            { type: "text", text: `${revenue.toLocaleString()} ฿`, color: BRAND, weight: "bold", size: "xl", align: "end", gravity: "center" }
          ]
        }
      ]
    }
  }};
}

/** Admin: single booking card for carousel. */
export function adminBookingCard(b: BookingWithJoins) {
  const styles: Record<string, { bg: string; label: string }> = {
    pending: { bg: "#f59e0b", label: "⏳ รอยืนยัน" }, confirmed: { bg: BRAND, label: "✅ ยืนยันแล้ว" },
    completed: { bg: "#64748b", label: "✅ เสร็จสิ้น" }, cancelled: { bg: "#94a3b8", label: "❌ ยกเลิก" }, no_show: { bg: "#ef4444", label: "🚫 ไม่มา" }
  };
  const st = styles[b.status] ?? { bg: "#64748b", label: b.status };
  const time = new Date(b.starts_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: process.env.SHOP_TIMEZONE || "Asia/Bangkok" });
  const btns: any[] = [];
  if (b.status === "pending") btns.push({ type: "button", style: "primary", color: BRAND, height: "sm", flex: 1, action: { type: "postback", label: "ยืนยัน", data: `action=adm_confirm&id=${b.id}` } });
  if (b.status === "pending" || b.status === "confirmed") {
    btns.push({ type: "button", style: "secondary", height: "sm", flex: 1, action: { type: "postback", label: "เสร็จ", data: `action=adm_complete&id=${b.id}` } });
    btns.push({ type: "button", style: "secondary", height: "sm", flex: 1, action: { type: "postback", label: "ยกเลิก", data: `action=adm_cancel&id=${b.id}` } });
    btns.push({ type: "button", style: "secondary", height: "sm", flex: 1, action: { type: "postback", label: "ไม่มา", data: `action=adm_noshow&id=${b.id}` } });
  }
  return { type: "bubble", size: "micro",
    header: { type: "box", layout: "horizontal", backgroundColor: st.bg, paddingAll: "10px", contents: [
      { type: "text", text: st.label, color: "#ffffff", weight: "bold", size: "sm", flex: 1 },
      { type: "text", text: `#${b.id}`, color: "#ffffffaa", size: "xs" }
    ]},
    body: { type: "box", layout: "vertical", spacing: "xs", paddingAll: "12px", contents: [
      { type: "text", text: time, weight: "bold", size: "xl" },
      { type: "text", text: b.service?.name ?? "-", size: "sm", weight: "bold" },
      { type: "text", text: `💇 ${b.staff?.nickname ?? b.staff?.name ?? "—"} · ฿${b.price.toLocaleString()}`, size: "xs", color: "#666" },
      { type: "text", text: `👤 ${b.customer?.full_name ?? b.customer?.display_name ?? "ลูกค้า"}${b.customer?.phone ? ` · ${b.customer.phone}` : ""}`, size: "xs", color: "#888" },
      ...(btns.length > 0 ? [{ type: "box", layout: "horizontal", spacing: "xs", margin: "sm", contents: btns } as any] : [])
    ]}
  };
}

/** Admin: revenue summary. */
export function adminRevenueMessage(opts: {
  date: string; totalBookings: number; completed: number; cancelled: number; noShows: number;
  totalRevenue: number; byService: Array<{ name: string; count: number; revenue: number }>;
}) {
  const stat = (label: string, value: number, bg: string) => ({ type: "box", layout: "vertical", flex: 1, paddingAll: "12px", cornerRadius: "12px", backgroundColor: bg,
    contents: [{ type: "text", text: String(value), weight: "bold", size: "xl", align: "center" }, { type: "text", text: label, size: "xs", color: "#666", align: "center" }]
  });
  return { type: "flex", altText: `ยอดวันนี้ ${opts.totalRevenue.toLocaleString()}฿`, contents: { type: "bubble",
    header: { type: "box", layout: "vertical", background: { type: "linearGradient", angle: "135deg", startColor: "#1a1a1a", endColor: "#333333" }, paddingAll: "20px",
      contents: [
        { type: "text", text: "💰 สรุปยอดวันนี้", color: "#ffffff", weight: "bold", size: "lg" },
        { type: "text", text: opts.date, color: "#ffffffaa", size: "xs", margin: "xs" },
        { type: "text", text: `${opts.totalRevenue.toLocaleString()} บาท`, color: BRAND, weight: "bold", size: "3xl", margin: "md" }
      ]
    },
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px",
      contents: [
        { type: "box", layout: "horizontal", spacing: "sm", contents: [stat("จอง", opts.totalBookings, "#f0fdf4"), stat("เสร็จ", opts.completed, "#f0fdf4"), stat("ยกเลิก", opts.cancelled, "#fef2f2")] },
        { type: "separator", margin: "md" },
        { type: "text", text: "📊 แยกตามบริการ", weight: "bold", size: "sm", margin: "md" },
        ...opts.byService.slice(0, 5).map((s) => ({ type: "box", layout: "horizontal", margin: "xs", contents: [
          { type: "text", text: s.name, size: "xs", color: "#666", flex: 3 },
          { type: "text", text: `${s.count} คิว`, size: "xs", color: "#999", flex: 1, align: "center" },
          { type: "text", text: `${s.revenue.toLocaleString()}฿`, size: "xs", weight: "bold", color: "#333", flex: 2, align: "end" }
        ]}))
      ]
    }
  }};
}

/** Admin: action result. */
export function adminActionResultMessage(bookingId: number, action: string, customerName: string) {
  const m: Record<string, { e: string; t: string }> = {
    confirmed: { e: "✅", t: "ยืนยันแล้ว" }, completed: { e: "🎉", t: "เสร็จสิ้น + บวกแต้ม" },
    cancelled: { e: "❌", t: "ยกเลิกแล้ว" }, no_show: { e: "🚫", t: "บันทึกไม่มาตามนัด" }
  };
  const info = m[action] ?? { e: "✓", t: action };
  return { type: "flex", altText: `#${bookingId} ${info.t}`, contents: { type: "bubble",
    body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "20px",
      contents: [
        { type: "text", text: `${info.e} ${info.t}`, weight: "bold", size: "lg" },
        { type: "text", text: `#${bookingId} · ${customerName}`, size: "sm", color: "#666" }
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#111827",
        paddingAll: "18px",
        contents: [
          { type: "text", text: "ADMIN ACCESS", color: "#9ca3af", size: "xs", weight: "bold" },
          { type: "text", text: "เข้าสู่โหมดแอดมินผ่านแชท", color: "#ffffff", size: "xl", weight: "bold", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          infoPanel("วิธีเข้าใช้งาน", [
            "พิมพ์: รหัสแอดมิน <รหัสของคุณ>",
            "ตัวอย่าง: รหัสแอดมิน 1234",
            "เมื่อผ่านแล้วจะเปิดเมนูตั้งค่าร้านใน LINE ให้ทันที"
          ]),
          {
            type: "text",
            text: "กดปุ่มด้านล่างเพื่อเติมข้อความเริ่มต้น แล้วค่อยพิมพ์รหัสต่อท้ายได้เลย",
            size: "xs",
            color: TEXT_MUTED,
            wrap: true
          },
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#7c2d12",
        paddingAll: "18px",
        contents: [
          { type: "text", text: "ADMIN SESSION CHECK", color: "#fed7aa", size: "xs", weight: "bold" },
          { type: "text", text: opts?.title ?? "ต้องยืนยันตัวตนอีกครั้ง", color: "#ffffff", size: "xl", weight: "bold", margin: "sm", wrap: true }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          infoPanel("เกิดอะไรขึ้น", [
            opts?.reason ?? "session แอดมินอาจหมดอายุหรือข้อมูลยืนยันตัวตนหลุดระหว่างทาง",
            ...(opts?.pendingLabel ? [`สิ่งที่คุณกำลังกดอยู่: ${opts.pendingLabel}`] : []),
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "18px",
        contents: [
          { type: "text", text: "ADMIN MODE ENABLED", color: "#d1fae5", size: "xs", weight: "bold" },
          { type: "text", text: "เปิดโหมดแอดมินแล้ว", color: "#ffffff", size: "xl", weight: "bold", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#111827",
        paddingAll: "18px",
        contents: [
          { type: "text", text: "LINE ADMIN HOME", color: "#9ca3af", size: "xs", weight: "bold" },
          { type: "text", text: "หน้าแรกแอดมินผ่าน LINE", color: "#ffffff", size: "xl", weight: "bold", margin: "sm" },
          { type: "text", text: "แอดมิน > หน้าแรก", color: "#d1d5db", size: "xs", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "ทุกปุ่มจะพาคุณเข้า step ถัดไปทันที และระบบจะแสดงสถานะกำลังทำงานก่อนตอบกลับ", size: "xs", color: TEXT_MUTED, wrap: true },
          infoPanel("โหมด 1 · ตั้งค่าร้าน", ["ใช้เมื่ออยากไล่ตั้งค่า shop, service, staff, hours ผ่านแชท"]),
          { type: "box", layout: "horizontal", spacing: "sm", contents: [
            { type: "button", style: "primary", color: BRAND, flex: 1, height: "md", action: { type: "postback", label: "⚙️ ตั้งค่าร้าน", data: "action=adm_setup" } },
            { type: "button", style: "secondary", flex: 1, height: "md", action: { type: "postback", label: "📊 สถานะร้าน", data: "action=adm_status" } }
          ] },
          infoPanel("โหมด 2 · คิวและรายได้", ["ใช้ดูงานวันนี้เร็วๆ โดยไม่ต้องเปิดเว็บหลังบ้าน"]),
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "18px",
        contents: [
          { type: "text", text: "SHOP SETUP VIA LINE", color: "#d1fae5", size: "xs", weight: "bold" },
          { type: "text", text: "ตั้งค่าร้านผ่านแชท", color: "#ffffff", size: "xl", weight: "bold", margin: "sm" },
          { type: "text", text: "แอดมิน > ตั้งค่าร้าน", color: "#ecfdf5", size: "xs", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "แนะนำให้เริ่มจาก Setup Wizard เพราะมันพาไปทีละขั้นและลดความงงระหว่างตั้งค่า", size: "xs", color: TEXT_MUTED, wrap: true },
          { type: "button", style: "primary", color: BRAND, height: "md", action: { type: "postback", label: "🪄 Setup Wizard", data: "action=adm_wizard_start" } },
          { type: "button", style: "secondary", height: "md", action: { type: "postback", label: "📊 สถานะร้านตอนนี้", data: "action=adm_status" } },
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: opts.readyCount === opts.totalCount ? BRAND : "#111827",
        paddingAll: "18px",
        contents: [
          { type: "text", text: "SHOP STATUS", color: "#d1fae5", size: "xs", weight: "bold" },
          { type: "text", text: `${opts.readyCount}/${opts.totalCount} พร้อมแล้ว`, color: "#ffffff", size: "xl", weight: "bold", margin: "sm" },
          { type: "text", text: opts.summary, color: "#ffffffcc", size: "sm", margin: "sm", wrap: true },
          { type: "text", text: "แอดมิน > สถานะร้าน", color: "#d1d5db", size: "xs", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
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
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          { type: "text", text: title, weight: "bold", size: "lg", color: TEXT_MAIN, wrap: true },
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "18px",
        contents: [
          { type: "text", text: opts.stepLabel ?? "SETUP WIZARD", color: "#d1fae5", size: "xs", weight: "bold" },
          ...(opts.progressText ? [{ type: "text", text: opts.progressText, color: "#ecfdf5", size: "xs", margin: "xs" } as any] : []),
          ...(opts.breadcrumb ? [{ type: "text", text: opts.breadcrumb, color: "#ecfdf5", size: "xs", margin: "xs", wrap: true } as any] : []),
          { type: "text", text: opts.title, color: "#ffffff", size: "xl", weight: "bold", margin: "sm", wrap: true }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: opts.description, size: "sm", color: TEXT_MUTED, wrap: true },
          ...(opts.savedItems?.length ? [infoPanel("บันทึกไปแล้ว", opts.savedItems)] : []),
          ...(opts.example ? [infoPanel("ตัวอย่างข้อความที่พิมพ์ได้", [opts.example])] : []),
          ...(opts.tip ? [{ type: "text", text: opts.tip, size: "xs", color: TEXT_MUTED, wrap: true } as any] : []),
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "18px",
        contents: [
          { type: "text", text: "SETUP WIZARD · STEP 6/6", color: "#d1fae5", size: "xs", weight: "bold" },
          { type: "text", text: "● ● ● ● ● ●", color: "#ecfdf5", size: "xs", margin: "xs" },
          { type: "text", text: "แอดมิน > ตั้งค่าร้าน > Setup Wizard > เวลาทำการ", color: "#ecfdf5", size: "xs", margin: "xs", wrap: true },
          { type: "text", text: "เลือกว่าเวลาทำการนี้ใช้กับวันไหน", color: "#ffffff", size: "xl", weight: "bold", margin: "sm", wrap: true }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          ...(savedItems.length ? [infoPanel("บันทึกไปแล้ว", savedItems)] : []),
          { type: "text", text: "กดเลือกวัน แล้วผมจะถามเวลาของวันนั้นต่อทันที", size: "xs", color: TEXT_MUTED, wrap: true },
          ...days.map((day) => ({
            type: "button",
            style: "secondary",
            height: "md",
            action: { type: "postback", label: day.label, data: `action=adm_wizard_day&value=${day.value}&label=${encodeURIComponent(day.label)}`, displayText: `เลือกวัน${day.label}` }
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
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          { type: "text", text: `STEP ${opts.currentStep}/${opts.totalSteps}`, size: "xs", weight: "bold", color: BRAND_DARK },
          { type: "text", text: progress, size: "sm", color: BRAND_DARK },
          ...(opts.breadcrumb ? [{ type: "text", text: opts.breadcrumb, size: "xs", color: TEXT_MUTED, wrap: true } as any] : []),
          { type: "text", text: opts.title, size: "md", weight: "bold", color: TEXT_MAIN, wrap: true },
          ...(opts.description ? [{ type: "text", text: opts.description, size: "xs", color: TEXT_MUTED, wrap: true } as any] : []),
          ...(opts.savedItems?.length ? [{ type: "text", text: `บันทึกแล้ว: ${opts.savedItems.join(" • ")}`, size: "xs", color: TEXT_MUTED, wrap: true } as any] : []),
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "18px",
        contents: [
          { type: "text", text: "SETUP COMPLETE", color: "#d1fae5", size: "xs", weight: "bold" },
          { type: "text", text: "ตั้งค่าพื้นฐานร้านเสร็จแล้ว", color: "#ffffff", size: "xl", weight: "bold", margin: "sm", wrap: true }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          infoPanel("สิ่งที่ wizard ทำให้แล้ว", summary),
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: BRAND, action: { type: "postback", label: "➕ เพิ่มบริการอีก", data: "action=adm_wizard_more_service", displayText: "เพิ่มบริการอีก" } },
              { type: "button", style: "secondary", action: { type: "postback", label: "➕ เพิ่มช่างอีก", data: "action=adm_wizard_more_staff", displayText: "เพิ่มช่างอีก" } },
              { type: "button", style: "secondary", action: { type: "postback", label: "✅ เสร็จแล้ว ไปเมนูแอดมิน", data: "action=adm_menu", displayText: "กลับเมนูแอดมิน" } }
            ]
          }
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
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          { type: "text", text: opts.title, weight: "bold", size: "lg", color: TEXT_MAIN, wrap: true },
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
    altText: `ยินดีต้อนรับ คุณ ${name}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "20px",
        contents: [
          { type: "text", text: "WELCOME TO LINEBOOK", color: "#ffffffcc", weight: "bold", size: "xs" },
          { type: "text", text: `สวัสดีค่ะ คุณ ${name}`, color: "#ffffff", weight: "bold", size: "xl", margin: "sm" },
          { type: "text", text: "จองคิวผ่าน LINE ได้ทันที ไม่ต้องออกจากแชท", color: "#ffffffcc", size: "sm", margin: "sm", wrap: true }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          infoPanel("ลองพิมพ์แบบนี้ได้เลย", [
            "จองตัดผมพรุ่งนี้บ่ายสอง",
            "คิวของฉัน",
            "แต้มสะสม"
          ]),
          {
            type: "button",
            style: "primary",
            color: BRAND,
            action: { type: "postback", label: "📅 จองคิวเลย", data: "action=book" }
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "📋 คิวของฉัน", data: "action=my_bookings" }
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "⭐ โปรไฟล์ / แต้ม", data: "action=profile" }
          }
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "16px",
        contents: [
          { type: "text", text: "BOOKING REVIEW", color: "#ffffffcc", size: "xs", weight: "bold" },
          { type: "text", text: "ตรวจสอบก่อนยืนยันการจอง", color: "#fff", weight: "bold", size: "xl", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          infoRow("บริการ", opts.serviceName, "✂️"),
          infoRow("วัน", opts.dateDisplay, "📅"),
          infoRow("เวลา", opts.timeRange, "🕐"),
          infoRow("ช่าง", opts.staffName, "💇"),
          totalCard("ราคา", `${opts.price.toLocaleString()} บาท`),
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            margin: "lg",
            contents: [
              {
                type: "button",
                style: "primary",
                color: BRAND,
                flex: 1,
                action: {
                  type: "postback",
                  label: "✅ ยืนยัน",
                  data: `action=book_go&svc=${opts.serviceId}&stf=${opts.staffId ?? 0}&d=${opts.date}&t=${opts.timeLabel}`
                }
              },
              {
                type: "button",
                style: "secondary",
                flex: 1,
                action: { type: "postback", label: "❌ ยกเลิก", data: "action=menu" }
              }
            ]
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
    backgroundColor: PANEL,
    cornerRadius: "14px",
    borderWidth: "1px",
    borderColor: BORDER,
    contents: [
      { type: "text", text: title, size: "sm", weight: "bold", color: TEXT_MAIN },
      ...items.map((item) => ({ type: "text", text: `• ${item}`, size: "sm", color: TEXT_MUTED, wrap: true }))
    ]
  };
}

function infoRow(label: string, value: string, emoji: string) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    paddingAll: "12px",
    backgroundColor: PANEL,
    cornerRadius: "12px",
    borderWidth: "1px",
    borderColor: BORDER,
    contents: [
      { type: "text", text: emoji, size: "lg", flex: 0, gravity: "center" },
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
    backgroundColor: "#f5f0f7",
    cornerRadius: "12px",
    borderWidth: "1px",
    borderColor: "#e9dff0",
    contents: [
      { type: "text", text: title, color: "#3b2340", size: "sm", weight: "bold", align: "center" },
      { type: "text", text: subtitle, color: "#6b4e7a", size: "xs", align: "center", margin: "xs" }
    ]
  };
}

function totalCard(label: string, value: string) {
  return {
    type: "box",
    layout: "horizontal",
    paddingAll: "14px",
    backgroundColor: "#111827",
    cornerRadius: "14px",
    contents: [
      { type: "text", text: label, color: "#d1d5db", size: "sm", gravity: "center" },
      { type: "text", text: value, color: "#ffffff", size: "xl", weight: "bold", align: "end", gravity: "center" }
    ]
  };
}

function statsRow(items: Array<{ label: string; value: string; tone?: "brand" | "default" }>) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: items.map((item) => ({
      type: "box",
      layout: "vertical",
      flex: 1,
      spacing: "xs",
      paddingAll: "14px",
      cornerRadius: "14px",
      backgroundColor: item.tone === "brand" ? BRAND_SOFT : PANEL,
      borderWidth: "1px",
      borderColor: item.tone === "brand" ? "#b7ebcb" : BORDER,
      contents: [
        { type: "text", text: item.label, size: "xs", color: TEXT_MUTED, align: "center", wrap: true },
        { type: "text", text: item.value, size: "xl", weight: "bold", color: item.tone === "brand" ? BRAND_DARK : TEXT_MAIN, align: "center" }
      ]
    }))
  };
}
