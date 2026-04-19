// Flex / Quick-reply message builders for the LINE bot.
import type { BookingWithJoins, Customer } from "@/types/db";
import { formatDateTH, formatTimeRange } from "./format";

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
