import { NextRequest, NextResponse } from "next/server";
import { verifySignature, replyMessage, getProfile } from "@/lib/line";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { availableSlots } from "@/lib/booking";
import {
  welcomeMessage,
  profileCard,
  myBookingsMessage,
  bookingConfirmedMessage,
  textMessage,
  mainMenuMessage,
  serviceCarouselMessage,
  staffSelectMessage,
  dateCarouselMessage,
  timeSlotMessage,
  confirmBookingFlex
} from "@/lib/flex";
import type { BookingWithJoins, Customer } from "@/types/db";
import { formatDateTH, formatTimeRange } from "@/lib/format";
import { fromZonedTime } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = process.env.SHOP_TIMEZONE || "Asia/Bangkok";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-line-signature");
  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(raw) as { events?: any[] };
  const events = body.events ?? [];

  await Promise.all(
    events.map((e) => handleEvent(e).catch((err) => console.error("event err:", err)))
  );

  return NextResponse.json({ ok: true });
}

// ───────────────────────── event router ─────────────────────────

async function handleEvent(ev: any) {
  const userId: string | undefined = ev.source?.userId;
  if (!userId) return;

  const customer = await upsertCustomerFromLine(userId);
  if (!customer) return;

  if (ev.type === "follow") {
    const name = customer.display_name ?? "คุณลูกค้า";
    return replyMessage(ev.replyToken, [welcomeMessage(name)]);
  }

  if (ev.type === "postback") {
    return handlePostback(ev, customer);
  }

  if (ev.type === "message" && ev.message?.type === "text") {
    return handleMessage(ev, customer);
  }
}

// ───────────────────────── postback handler ─────────────────────────

async function handlePostback(ev: any, customer: Customer) {
  const data = new URLSearchParams(ev.postback?.data ?? "");
  const action = data.get("action");
  const rt = ev.replyToken;
  const db = supabaseAdmin();

  // ── Main menu ──
  if (action === "menu") {
    return replyMessage(rt, [mainMenuMessage(customer.display_name ?? "คุณ")]);
  }

  // ── Existing quick actions ──
  if (action === "my_bookings") {
    const list = await fetchMyBookings(customer.id);
    return replyMessage(rt, [myBookingsMessage(list)]);
  }

  if (action === "profile") {
    return replyMessage(rt, [profileCard(customer)]);
  }

  if (action === "cancel_booking") {
    const id = Number(data.get("id"));
    if (id) await cancelBookingByCustomer(id, customer.id);
    const list = await fetchMyBookings(customer.id);
    return replyMessage(rt, [textMessage("ยกเลิกคิวเรียบร้อย ✅"), myBookingsMessage(list)]);
  }

  // ── BOOKING FLOW ──

  // Step 1 → show services
  if (action === "book") {
    const { data: services } = await db
      .from("services")
      .select("id, name, duration_min, price")
      .eq("shop_id", SHOP_ID)
      .eq("active", true)
      .order("sort_order");
    if (!services || services.length === 0) {
      return replyMessage(rt, [textMessage("ยังไม่มีบริการในระบบ กรุณาติดต่อร้าน")]);
    }
    return replyMessage(rt, [serviceCarouselMessage(services)]);
  }

  // Step 2 → picked service, show staff
  if (action === "book_svc") {
    const serviceId = Number(data.get("id"));
    const { data: service } = await db
      .from("services")
      .select("id, name")
      .eq("id", serviceId)
      .single();
    if (!service) return replyMessage(rt, [textMessage("ไม่พบบริการ")]);

    const { data: staff } = await db
      .from("staff")
      .select("id, name, nickname")
      .eq("shop_id", SHOP_ID)
      .eq("active", true)
      .order("sort_order");

    return replyMessage(rt, [staffSelectMessage(staff ?? [], serviceId, service.name)]);
  }

  // Step 3 → picked staff, show dates
  if (action === "book_stf") {
    const serviceId = Number(data.get("svc"));
    const staffIdRaw = Number(data.get("id"));
    const staffId = staffIdRaw === 0 ? null : staffIdRaw;

    let staffName = "ช่างคนไหนก็ได้";
    if (staffId) {
      const { data: s } = await db.from("staff").select("nickname, name").eq("id", staffId).single();
      staffName = s?.nickname ?? s?.name ?? "ไม่ระบุ";
    }

    return replyMessage(rt, [dateCarouselMessage(serviceId, staffId, staffName)]);
  }

  // Step 4 → picked date, show time slots
  if (action === "book_date") {
    const serviceId = Number(data.get("svc"));
    const staffIdRaw = Number(data.get("stf"));
    const staffId = staffIdRaw === 0 ? null : staffIdRaw;
    const date = data.get("d") ?? "";

    const slots = await availableSlots({ dateYmd: date, serviceId, staffId });
    const { data: service } = await db.from("services").select("name").eq("id", serviceId).single();

    return replyMessage(rt, [timeSlotMessage(slots, serviceId, staffId, date, service?.name ?? "")]);
  }

  // Step 5 → picked time, show confirmation
  if (action === "book_time") {
    const serviceId = Number(data.get("svc"));
    const staffIdRaw = Number(data.get("stf"));
    const staffId = staffIdRaw === 0 ? null : staffIdRaw;
    const date = data.get("d") ?? "";
    const timeLabel = data.get("t") ?? ""; // "HH:mm"

    const { data: service } = await db
      .from("services")
      .select("name, duration_min, price")
      .eq("id", serviceId)
      .single();
    if (!service) return replyMessage(rt, [textMessage("ไม่พบบริการ")]);

    const [hh, mm] = timeLabel.split(":").map(Number);
    const startUtc = fromZonedTime(
      `${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`,
      TZ
    );
    const endUtc = new Date(startUtc.getTime() + service.duration_min * 60_000);

    const dateDisplay = formatDateTH(startUtc.toISOString());
    const timeRange = formatTimeRange(startUtc.toISOString(), endUtc.toISOString());

    let staffName = "ช่างคนไหนก็ได้";
    if (staffId) {
      const { data: s } = await db.from("staff").select("nickname, name").eq("id", staffId).single();
      staffName = s?.nickname ?? s?.name ?? "ไม่ระบุ";
    }

    return replyMessage(rt, [
      confirmBookingFlex({
        serviceName: service.name,
        staffName,
        dateDisplay,
        timeRange,
        price: service.price,
        serviceId,
        staffId,
        date,
        timeLabel
      })
    ]);
  }

  // Step 6 → confirm and create booking
  if (action === "book_go") {
    const serviceId = Number(data.get("svc"));
    const staffIdRaw = Number(data.get("stf"));
    const staffId = staffIdRaw === 0 ? null : staffIdRaw;
    const date = data.get("d") ?? "";
    const timeLabel = data.get("t") ?? "";

    const { data: service } = await db
      .from("services")
      .select("id, duration_min, price")
      .eq("id", serviceId)
      .single();
    if (!service) return replyMessage(rt, [textMessage("ไม่พบบริการ")]);

    const [hh, mm] = timeLabel.split(":").map(Number);
    const startUtc = fromZonedTime(
      `${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`,
      TZ
    );
    const endUtc = new Date(startUtc.getTime() + service.duration_min * 60_000);

    const { data: booking, error } = await db
      .from("bookings")
      .insert({
        shop_id: SHOP_ID,
        customer_id: customer.id,
        service_id: serviceId,
        staff_id: staffId,
        starts_at: startUtc.toISOString(),
        ends_at: endUtc.toISOString(),
        status: "confirmed",
        price: service.price
      })
      .select(
        "*, service:services(id,name,name_en,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id)"
      )
      .single();

    if (error) {
      if (error.code === "23P01") {
        return replyMessage(rt, [
          textMessage("⚠️ ขออภัย เวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่")
        ]);
      }
      return replyMessage(rt, [textMessage(`เกิดข้อผิดพลาด: ${error.message}`)]);
    }

    return replyMessage(rt, [bookingConfirmedMessage(booking as BookingWithJoins)]);
  }
}

// ───────────────────────── message handler ─────────────────────────

async function handleMessage(ev: any, customer: Customer) {
  const text: string = ev.message.text.trim();
  const rt = ev.replyToken;
  const name = customer.display_name ?? "คุณ";
  const db = supabaseAdmin();

  // ── Book / จอง → start booking flow ──
  if (/จอง|book|booking|เลือกบริการ/i.test(text)) {
    const { data: services } = await db
      .from("services")
      .select("id, name, duration_min, price")
      .eq("shop_id", SHOP_ID)
      .eq("active", true)
      .order("sort_order");
    if (!services || services.length === 0) {
      return replyMessage(rt, [textMessage("ยังไม่มีบริการในระบบ")]);
    }
    return replyMessage(rt, [serviceCarouselMessage(services)]);
  }

  // ── คิว / queue ──
  if (/คิว|บุ๊ค|queue/i.test(text)) {
    const list = await fetchMyBookings(customer.id);
    return replyMessage(rt, [myBookingsMessage(list)]);
  }

  // ── แต้ม / points ──
  if (/แต้ม|point|profile|โปรไฟล์/i.test(text)) {
    return replyMessage(rt, [profileCard(customer)]);
  }

  // ── ยกเลิก / cancel ──
  if (/ยกเลิก|cancel/i.test(text)) {
    const list = await fetchMyBookings(customer.id);
    if (list.length === 0) {
      return replyMessage(rt, [textMessage("คุณไม่มีคิวที่สามารถยกเลิกได้")]);
    }
    return replyMessage(rt, [myBookingsMessage(list)]);
  }

  // ── บริการ / ราคา ──
  if (/บริการ|ราคา|service|price/i.test(text)) {
    return replyMessage(rt, [textMessage("ดูรายการบริการได้ที่แอป 👇"), {
      type: "flex",
      altText: "บริการทั้งหมด",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "16px",
          contents: [
            { type: "text", text: "ดูบริการและราคาทั้งหมด", weight: "bold" },
            { type: "text", text: "เปิดในแอป LINE เพื่อดูรายละเอียด", size: "sm", color: "#888" },
            {
              type: "button",
              style: "primary",
              color: "#06c755",
              margin: "md",
              action: {
                type: "uri",
                label: "🔍 ดูบริการ/ราคา",
                uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID ?? ""}/liff/services`
              }
            }
          ]
        }
      }
    }]);
  }

  // ── เมนู / help / default ──
  return replyMessage(rt, [mainMenuMessage(name)]);
}

// ───────────────────────── helpers ─────────────────────────

async function upsertCustomerFromLine(lineUserId: string): Promise<Customer | null> {
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("customers")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (existing) return existing as Customer;

  const p = await getProfile(lineUserId);
  const { data: inserted } = await db
    .from("customers")
    .insert({
      shop_id: SHOP_ID,
      line_user_id: lineUserId,
      display_name: p?.displayName ?? null,
      picture_url: p?.pictureUrl ?? null
    })
    .select("*")
    .single();
  return (inserted ?? null) as Customer | null;
}

async function fetchMyBookings(customerId: number): Promise<BookingWithJoins[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("bookings")
    .select(
      "*, service:services(id,name,name_en,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id)"
    )
    .eq("customer_id", customerId)
    .in("status", ["pending", "confirmed", "completed"])
    .gte("starts_at", new Date(Date.now() - 86400_000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(10);
  return (data ?? []) as BookingWithJoins[];
}

async function cancelBookingByCustomer(bookingId: number, customerId: number) {
  const db = supabaseAdmin();
  await db
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("customer_id", customerId)
    .in("status", ["pending", "confirmed"]);
}
