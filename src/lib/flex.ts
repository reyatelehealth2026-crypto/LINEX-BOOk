// Flex / Quick-reply message builders for the LINE bot.
import type { BookingWithJoins, Customer, Service, Staff } from "@/types/db";
import { formatDateTH, formatTimeRange } from "./format";
import type { Slot } from "./booking";

const BRAND = "#06c755";

const LIFF_URL = (path = "") => {
  const id = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
  return `https://liff.line.me/${id}${path}`;
};

export function textMessage(text: string) {
  return { type: "text", text };
}

export function welcomeMessage(displayName: string) {
  return {
    type: "flex",
    altText: `สวัสดีคุณ ${displayName}`,
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "20px",
        contents: [
          { type: "text", text: "ยินดีต้อนรับ 🌿", color: "#ffffff", weight: "bold", size: "lg" },
          { type: "text", text: `คุณ ${displayName}`, color: "#ffffff", size: "sm", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "กดปุ่มด้านล่างเพื่อเริ่มใช้งาน", size: "sm", color: "#555555", wrap: true },
          {
            type: "button",
            style: "primary",
            color: BRAND,
            action: { type: "uri", label: "📅 จองคิว", uri: LIFF_URL("/liff/booking") }
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "📋 คิวของฉัน", data: "action=my_bookings", displayText: "คิวของฉัน" }
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "⭐ โปรไฟล์ / แต้ม", data: "action=profile", displayText: "โปรไฟล์" }
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
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: "ยังไม่ได้ลงทะเบียน", weight: "bold", size: "md" },
            {
              type: "text",
              text: "ลงทะเบียนเพื่อรับแต้มสะสมทุกครั้งที่ใช้บริการ 🎁",
              size: "sm",
              color: "#666666",
              wrap: true
            },
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "16px",
        contents: [
          { type: "text", text: c.full_name ?? c.display_name ?? "ลูกค้า", color: "#ffffff", weight: "bold" },
          { type: "text", text: c.phone ?? "", color: "#ffffffcc", size: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          row("แต้มสะสม", `${c.points} แต้ม`, true),
          row("จำนวนครั้งที่ใช้บริการ", `${c.visit_count} ครั้ง`),
          row("สมาชิกตั้งแต่", c.registered_at ? formatDateTH(c.registered_at) : "-"),
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
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: "ยังไม่มีคิวจองค้างไว้", weight: "bold" },
            { type: "text", text: "กดจองคิวใหม่ได้เลย", size: "sm", color: "#666666" },
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

  const bubbles = bookings.slice(0, 10).map((b) => ({
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: statusColor(b.status),
      paddingAll: "12px",
      contents: [
        { type: "text", text: statusLabel(b.status), color: "#ffffff", weight: "bold", size: "sm" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: b.service?.name ?? "-", weight: "bold", wrap: true },
        { type: "text", text: formatDateTH(b.starts_at), size: "sm", color: "#555555" },
        { type: "text", text: formatTimeRange(b.starts_at, b.ends_at), size: "sm", color: "#555555" },
        { type: "text", text: b.staff?.nickname ? `ช่าง: ${b.staff.nickname}` : "ช่าง: ไม่ระบุ", size: "xs", color: "#888" },
        (b.status === "pending" || b.status === "confirmed")
          ? {
              type: "button",
              style: "secondary",
              height: "sm",
              margin: "md",
              action: {
                type: "postback",
                label: "ยกเลิก",
                data: `action=cancel_booking&id=${b.id}`,
                displayText: `ขอยกเลิกคิว #${b.id}`
              }
            }
          : { type: "filler" as const }
      ]
    }
  }));

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
      header: {
        type: "box", layout: "vertical", backgroundColor: BRAND, paddingAll: "16px",
        contents: [{ type: "text", text: "✅ จองคิวสำเร็จ", color: "#ffffff", weight: "bold" }]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          row("บริการ", b.service?.name ?? "-"),
          row("วันที่", formatDateTH(b.starts_at)),
          row("เวลา", formatTimeRange(b.starts_at, b.ends_at)),
          row("ช่าง", b.staff?.nickname ?? "ไม่ระบุ"),
          row("ราคา", `${b.price.toLocaleString()} บาท`),
          { type: "separator", margin: "md" },
          { type: "text", text: `หมายเลขจอง #${b.id}`, size: "xs", color: "#888888", margin: "md" }
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
      header: {
        type: "box", layout: "vertical", backgroundColor: "#ff9800", paddingAll: "16px",
        contents: [{ type: "text", text: "⏰ เตือนคิว (อีก 1 ชม.)", color: "#fff", weight: "bold" }]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          row("บริการ", b.service?.name ?? "-"),
          row("เวลา", formatTimeRange(b.starts_at, b.ends_at)),
          row("ช่าง", b.staff?.nickname ?? "ไม่ระบุ")
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
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "20px",
        contents: [
          { type: "text", text: "💚 LineBook", color: "#ffffff", weight: "bold", size: "xl" },
          { type: "text", text: `สวัสดีคุณ ${name}`, color: "#ffffffcc", size: "sm", margin: "sm" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "เลือกทำอะไรดี?", weight: "bold", size: "md", margin: "sm" },
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
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "16px",
      contents: [
        { type: "text", text: s.name, weight: "bold", size: "md", wrap: true },
        { type: "text", text: `${s.duration_min} นาที`, size: "xs", color: "#888" },
        { type: "text", text: `${s.price.toLocaleString()} บาท`, size: "md", weight: "bold", color: BRAND },
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "16px",
        contents: [
          { type: "text", text: "เลือกช่าง", color: "#fff", weight: "bold" },
          { type: "text", text: `บริการ: ${serviceName}`, color: "#ffffffcc", size: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: buttons
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
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "20px",
          contents: [
            { type: "text", text: "😢 ไม่มีเวลาว่างในวันนี้", weight: "bold" },
            { type: "text", text: "ลองเลือกวันอื่นดูนะ", size: "sm", color: "#888" },
            {
              type: "button",
              style: "secondary",
              margin: "md",
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: BRAND,
        paddingAll: "16px",
        contents: [
          { type: "text", text: "เลือกเวลา", color: "#fff", weight: "bold" },
          { type: "text", text: `${serviceName} · ${date}`, color: "#ffffffcc", size: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: rows
      }
    }
  };
}

/** Step 5 — Booking confirmation with confirm / cancel buttons. */
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
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#ff9800",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "⚠️ ยืนยันการจอง", color: "#fff", weight: "bold", size: "lg" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          row("บริการ", opts.serviceName),
          row("วัน", opts.dateDisplay),
          row("เวลา", opts.timeRange),
          row("ช่าง", opts.staffName),
          row("ราคา", `${opts.price.toLocaleString()} บาท`, true),
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
