import { NextRequest, NextResponse } from "next/server";
import { verifySignature, replyMessage, getProfile, pushMessage } from "@/lib/line";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { availableSlots } from "@/lib/booking";
import { parseBookingIntent, parseAdminCommand } from "@/lib/thai-nlp";
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
  confirmBookingFlex,
  aiBookingConfirmMessage,
  aiAskTimeMessage,
  adminQueueHeader,
  adminBookingCard,
  adminRevenueMessage,
  adminActionResultMessage,
  smartWelcomeMessage,
} from "@/lib/flex";
import type { BookingWithJoins, Customer } from "@/types/db";
import { formatDateTH, formatTimeRange } from "@/lib/format";
import { fromZonedTime } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = process.env.SHOP_TIMEZONE || "Asia/Bangkok";

function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_LINE_IDS ?? "";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-line-signature");
  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(raw) as { events?: any[] };
  const events = body.events ?? [];

  await Promise.all(events.map((e) => handleEvent(e).catch((err) => console.error("event err:", err))));

  return NextResponse.json({ ok: true });
}

// ───────────────── event router ─────────────────

async function handleEvent(ev: any) {
  const userId: string | undefined = ev.source?.userId;
  if (!userId) return;

  const customer = await upsertCustomerFromLine(userId);
  if (!customer) return;

  if (ev.type === "follow") {
    return replyMessage(ev.replyToken, [smartWelcomeMessage(customer.display_name ?? "คุณลูกค้า")]);
  }

  if (ev.type === "postback") {
    return handlePostback(ev, customer);
  }

  if (ev.type === "message" && ev.message?.type === "text") {
    return handleMessage(ev, customer);
  }
}

// ───────────────── postback handler ─────────────────

async function handlePostback(ev: any, customer: Customer) {
  const data = new URLSearchParams(ev.postback?.data ?? "");
  const action = data.get("action");
  const rt = ev.replyToken;
  const db = supabaseAdmin();

  // ── Menu ──
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

  // ── STEP-BY-STEP BOOKING FLOW ──

  if (action === "book") {
    const { data: services } = await db.from("services").select("id, name, duration_min, price").eq("shop_id", SHOP_ID).eq("active", true).order("sort_order");
    if (!services?.length) return replyMessage(rt, [textMessage("ยังไม่มีบริการในระบบ")]);
    return replyMessage(rt, [serviceCarouselMessage(services)]);
  }

  if (action === "book_svc") {
    const serviceId = Number(data.get("id"));
    const { data: service } = await db.from("services").select("id, name").eq("id", serviceId).single();
    if (!service) return replyMessage(rt, [textMessage("ไม่พบบริการ")]);
    const { data: staff } = await db.from("staff").select("id, name, nickname").eq("shop_id", SHOP_ID).eq("active", true).order("sort_order");
    return replyMessage(rt, [staffSelectMessage(staff ?? [], serviceId, service.name)]);
  }

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

  if (action === "book_date") {
    const serviceId = Number(data.get("svc"));
    const staffIdRaw = Number(data.get("stf"));
    const staffId = staffIdRaw === 0 ? null : staffIdRaw;
    const date = data.get("d") ?? "";
    const slots = await availableSlots({ dateYmd: date, serviceId, staffId });
    const { data: service } = await db.from("services").select("name").eq("id", serviceId).single();
    return replyMessage(rt, [timeSlotMessage(slots, serviceId, staffId, date, service?.name ?? "")]);
  }

  if (action === "book_time") {
    const serviceId = Number(data.get("svc"));
    const staffIdRaw = Number(data.get("stf"));
    const staffId = staffIdRaw === 0 ? null : staffIdRaw;
    const date = data.get("d") ?? "";
    const timeLabel = data.get("t") ?? "";

    const { data: service } = await db.from("services").select("name, duration_min, price").eq("id", serviceId).single();
    if (!service) return replyMessage(rt, [textMessage("ไม่พบบริการ")]);

    const [hh, mm] = timeLabel.split(":").map(Number);
    const startUtc = fromZonedTime(`${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`, TZ);
    const endUtc = new Date(startUtc.getTime() + service.duration_min * 60_000);

    let staffName = "ช่างคนไหนก็ได้";
    if (staffId) {
      const { data: s } = await db.from("staff").select("nickname, name").eq("id", staffId).single();
      staffName = s?.nickname ?? s?.name ?? "ไม่ระบุ";
    }

    return replyMessage(rt, [confirmBookingFlex({
      serviceName: service.name, staffName, dateDisplay: formatDateTH(startUtc.toISOString()),
      timeRange: formatTimeRange(startUtc.toISOString(), endUtc.toISOString()),
      price: service.price, serviceId, staffId, date, timeLabel
    })]);
  }

  if (action === "book_go") {
    const result = await createBooking(data, customer);
    if (result.error) return replyMessage(rt, [textMessage(result.error)]);
    return replyMessage(rt, [bookingConfirmedMessage(result.booking!)]);
  }

  // ── ADMIN POSTBACK ACTIONS (from Flex buttons) ──

  if (action === "adm_confirm" || action === "adm_complete" || action === "adm_cancel" || action === "adm_noshow") {
    const id = Number(data.get("id"));
    const statusMap: Record<string, string> = { adm_confirm: "confirmed", adm_complete: "completed", adm_cancel: "cancelled", adm_noshow: "no_show" };
    const newStatus = statusMap[action] as "confirmed" | "completed" | "cancelled" | "no_show";
    const result = await adminSetBookingStatus(id, newStatus);
    return replyMessage(rt, [adminActionResultMessage(id, newStatus, result.customerName)]);
  }
}

// ───────────────── message handler ─────────────────

async function handleMessage(ev: any, customer: Customer) {
  const text: string = ev.message.text.trim();
  const rt = ev.replyToken;
  const userId: string = ev.source?.userId;
  const db = supabaseAdmin();

  // ── Check if admin ──
  const isAdmin = getAdminIds().has(userId);
  if (isAdmin) {
    const adminCmd = parseAdminCommand(text);
    if (adminCmd) {
      return handleAdminCommand(rt, adminCmd);
    }
  }

  // ── AI Natural Language Booking ──
  const { data: services } = await db.from("services").select("id, name, name_en").eq("shop_id", SHOP_ID).eq("active", true);
  const { data: staff } = await db.from("staff").select("id, name, nickname").eq("shop_id", SHOP_ID).eq("active", true);

  const intent = parseBookingIntent(text, services ?? [], staff ?? []);
  if (intent && intent.confidence !== "low") {
    return handleAIBooking(rt, intent, customer, services ?? [], staff ?? []);
  }

  // ── Keyword shortcuts ──
  if (/คิว|บุ๊ค|queue/i.test(text)) {
    const list = await fetchMyBookings(customer.id);
    return replyMessage(rt, [myBookingsMessage(list)]);
  }
  if (/แต้ม|point|profile|โปรไฟล์/i.test(text)) {
    return replyMessage(rt, [profileCard(customer)]);
  }
  if (/ยกเลิก|cancel/i.test(text)) {
    const list = await fetchMyBookings(customer.id);
    if (list.length === 0) return replyMessage(rt, [textMessage("คุณไม่มีคิวที่สามารถยกเลิกได้")]);
    return replyMessage(rt, [myBookingsMessage(list)]);
  }
  if (/บริการ|ราคา|service|price/i.test(text)) {
    return replyMessage(rt, [textMessage("ดูรายการบริการได้ที่แอป 👇"), {
      type: "flex", altText: "บริการทั้งหมด",
      contents: { type: "bubble", body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", contents: [
        { type: "text", text: "ดูบริการและราคาทั้งหมด", weight: "bold" },
        { type: "button", style: "primary", color: "#06c755", margin: "md", action: { type: "uri", label: "🔍 ดูบริการ/ราคา", uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID ?? ""}/liff/services` } }
      ]}}
    }]);
  }

  // ── Default: smart welcome ──
  return replyMessage(rt, [smartWelcomeMessage(customer.display_name ?? "คุณลูกค้า")]);
}

// ───────────────── AI Booking Handler ─────────────────

async function handleAIBooking(
  rt: string,
  intent: any,
  customer: Customer,
  services: any[],
  staffList: any[]
) {
  const db = supabaseAdmin();

  // HIGH confidence: all 3 fields present → show confirmation
  if (intent.confidence === "high" && intent.serviceId && intent.date && intent.time) {
    const { data: service } = await db.from("services").select("name, duration_min, price").eq("id", intent.serviceId).single();
    if (!service) return replyMessage(rt, [textMessage("ไม่พบบริการ ลองใหม่นะ")]);

    const [hh, mm] = intent.time.split(":").map(Number);
    const startUtc = fromZonedTime(`${intent.date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`, TZ);
    const endUtc = new Date(startUtc.getTime() + service.duration_min * 60_000);

    let staffName = "ช่างคนไหนก็ได้";
    if (intent.staffId) {
      const { data: s } = await db.from("staff").select("nickname, name").eq("id", intent.staffId).single();
      staffName = s?.nickname ?? s?.name ?? "ไม่ระบุ";
    }

    return replyMessage(rt, [aiBookingConfirmMessage({
      serviceName: service.name, durationMin: service.duration_min, price: service.price,
      staffName, dateDisplay: formatDateTH(startUtc.toISOString()),
      timeRange: formatTimeRange(startUtc.toISOString(), endUtc.toISOString()),
      serviceId: intent.serviceId, staffId: intent.staffId ?? null, date: intent.date, timeLabel: intent.time
    })]);
  }

  // MEDIUM confidence: have service + date but missing time → show slots
  if (intent.serviceId && intent.date && !intent.time) {
    const slots = await availableSlots({ dateYmd: intent.date, serviceId: intent.serviceId, staffId: intent.staffId });
    const { data: service } = await db.from("services").select("name").eq("id", intent.serviceId).single();
    return replyMessage(rt, [aiAskTimeMessage(
      slots, intent.serviceId, intent.staffId ?? null, intent.date,
      formatDateTH(fromZonedTime(`${intent.date}T00:00:00`, TZ).toISOString()),
      service?.name ?? ""
    )]);
  }

  // MEDIUM confidence: have service but missing date → fallback to date carousel
  if (intent.serviceId && !intent.date) {
    let staffId = intent.staffId ?? null;
    let staffName = "ช่างคนไหนก็ได้";
    if (staffId) {
      const { data: s } = await db.from("staff").select("nickname, name").eq("id", staffId).single();
      staffName = s?.nickname ?? s?.name ?? "ไม่ระบุ";
    }
    return replyMessage(rt, [dateCarouselMessage(intent.serviceId, staffId, staffName)]);
  }

  // LOW → fallback to step-by-step
  const { data: allServices } = await db.from("services").select("id, name, duration_min, price").eq("shop_id", SHOP_ID).eq("active", true).order("sort_order");
  if (!allServices?.length) return replyMessage(rt, [textMessage("ยังไม่มีบริการในระบบ")]);
  return replyMessage(rt, [serviceCarouselMessage(allServices)]);
}

// ───────────────── Admin Command Handler ─────────────────

async function handleAdminCommand(rt: string, cmd: any) {
  const db = supabaseAdmin();

  if (cmd.action === "queue_today" || cmd.action === "queue_tomorrow") {
    const date = cmd.action === "queue_today"
      ? new Date().toISOString().slice(0, 10)
      : new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
    return sendAdminQueue(rt, date);
  }

  if (cmd.action === "queue_date" && cmd.args.date) {
    return sendAdminQueue(rt, cmd.args.date);
  }

  if (cmd.action === "revenue") {
    return sendAdminRevenue(rt);
  }

  if (["confirm", "complete", "cancel", "noshow"].includes(cmd.action)) {
    const statusMap: Record<string, string> = { confirm: "confirmed", complete: "completed", cancel: "cancelled", noshow: "no_show" };
    const newStatus = statusMap[cmd.action] as "confirmed" | "completed" | "cancelled" | "no_show";
    const result = await adminSetBookingStatus(cmd.args.id, newStatus);
    return replyMessage(rt, [adminActionResultMessage(cmd.args.id, newStatus, result.customerName)]);
  }

  if (cmd.action === "add_service") {
    const { error } = await db.from("services").insert({ shop_id: SHOP_ID, name: cmd.args.name, price: cmd.args.price, duration_min: cmd.args.duration });
    if (error) return replyMessage(rt, [textMessage(`เพิ่มไม่สำเร็จ: ${error.message}`)]);
    return replyMessage(rt, [textMessage(`✅ เพิ่มบริการ "${cmd.args.name}" ${cmd.args.price}บาท / ${cmd.args.duration}นาที สำเร็จ`)]);
  }

  if (cmd.action === "add_staff") {
    const { error } = await db.from("staff").insert({ shop_id: SHOP_ID, name: cmd.args.name });
    if (error) return replyMessage(rt, [textMessage(`เพิ่มไม่สำเร็จ: ${error.message}`)]);
    // Auto-map to all services
    const { data: svcs } = await db.from("services").select("id").eq("shop_id", SHOP_ID);
    const { data: stf } = await db.from("staff").select("id").eq("shop_id", SHOP_ID).order("id", { ascending: false }).limit(1).single();
    if (stf && svcs) {
      await db.from("staff_services").insert(svcs.map(s => ({ staff_id: stf.id, service_id: s.id }))).then(() => {});
    }
    return replyMessage(rt, [textMessage(`✅ เพิ่มช่าง "${cmd.args.name}" สำเร็จ`)]);
  }
}

async function sendAdminQueue(rt: string, date: string) {
  const db = supabaseAdmin();
  const startUtc = fromZonedTime(`${date}T00:00:00`, TZ).toISOString();
  const endUtc = fromZonedTime(`${date}T23:59:59`, TZ).toISOString();

  const { data: bookings } = await db
    .from("bookings")
    .select("*, service:services(id,name,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id,points,visit_count)")
    .eq("shop_id", SHOP_ID)
    .gte("starts_at", startUtc)
    .lte("starts_at", endUtc)
    .order("starts_at", { ascending: true });

  const list = (bookings ?? []) as BookingWithJoins[];
  const pending = list.filter(b => b.status === "pending").length;
  const confirmed = list.filter(b => b.status === "confirmed").length;
  const completed = list.filter(b => b.status === "completed").length;
  const revenue = list.filter(b => b.status === "completed" || b.status === "confirmed").reduce((s, b) => s + Number(b.price), 0);

  const dateDisplay = formatDateTH(fromZonedTime(`${date}T00:00:00`, TZ).toISOString());

  const messages: any[] = [adminQueueHeader(dateDisplay, list.length, pending, confirmed, completed, revenue)];

  // Add booking cards (up to 10)
  if (list.length > 0) {
    messages.push({
      type: "flex",
      altText: "รายการคิว",
      contents: { type: "carousel", contents: list.slice(0, 10).map(b => adminBookingCard(b)) }
    });
  }

  return replyMessage(rt, messages);
}

async function sendAdminRevenue(rt: string) {
  const db = supabaseAdmin();
  const todayStr = new Date().toISOString().slice(0, 10);
  const startUtc = fromZonedTime(`${todayStr}T00:00:00`, TZ).toISOString();
  const endUtc = fromZonedTime(`${todayStr}T23:59:59`, TZ).toISOString();

  const { data: bookings } = await db
    .from("bookings")
    .select("price, status, service:services(name)")
    .eq("shop_id", SHOP_ID)
    .gte("starts_at", startUtc)
    .lte("starts_at", endUtc);

  const list = bookings ?? [];
  const totalBookings = list.length;
  const completed = list.filter((b: any) => b.status === "completed").length;
  const cancelled = list.filter((b: any) => b.status === "cancelled").length;
  const noShows = list.filter((b: any) => b.status === "no_show").length;
  const totalRevenue = list.filter((b: any) => b.status === "completed" || b.status === "confirmed").reduce((s: number, b: any) => s + Number(b.price), 0);

  // Group by service
  const byService = new Map<string, { count: number; revenue: number }>();
  for (const b of list) {
    if (b.status === "completed" || b.status === "confirmed") {
      const name = (b.service as any)?.name ?? "อื่นๆ";
      const entry = byService.get(name) ?? { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += Number(b.price);
      byService.set(name, entry);
    }
  }

  return replyMessage(rt, [adminRevenueMessage({
    date: formatDateTH(startUtc),
    totalBookings, completed, cancelled, noShows, totalRevenue,
    byService: Array.from(byService.entries()).map(([name, data]) => ({ name, ...data }))
  })]);
}

// ───────────────── Booking Helpers ─────────────────

async function createBooking(data: URLSearchParams, customer: Customer) {
  const db = supabaseAdmin();
  const serviceId = Number(data.get("svc"));
  const staffIdRaw = Number(data.get("stf"));
  const staffId = staffIdRaw === 0 ? null : staffIdRaw;
  const date = data.get("d") ?? "";
  const timeLabel = data.get("t") ?? "";

  const { data: service } = await db.from("services").select("id, duration_min, price").eq("id", serviceId).single();
  if (!service) return { error: "ไม่พบบริการ" };

  const [hh, mm] = timeLabel.split(":").map(Number);
  const startUtc = fromZonedTime(`${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`, TZ);
  const endUtc = new Date(startUtc.getTime() + service.duration_min * 60_000);

  const { data: booking, error } = await db.from("bookings").insert({
    shop_id: SHOP_ID, customer_id: customer.id, service_id: serviceId, staff_id: staffId,
    starts_at: startUtc.toISOString(), ends_at: endUtc.toISOString(), status: "confirmed", price: service.price
  }).select("*, service:services(id,name,name_en,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id)").single();

  if (error) {
    if (error.code === "23P01") return { error: "⚠️ เวลานี้มีผู้จองแล้ว" };
    return { error: error.message };
  }

  // Push confirmation
  try { await pushMessage(customer.line_user_id, [bookingConfirmedMessage(booking as BookingWithJoins)]); } catch {}
  return { booking: booking as BookingWithJoins };
}

async function adminSetBookingStatus(id: number, newStatus: "confirmed" | "completed" | "cancelled" | "no_show") {
  const db = supabaseAdmin();
  const { data: current } = await db.from("bookings").select("*, customer:customers(id,line_user_id,points,visit_count)").eq("id", id).single();

  if (current?.customer?.line_user_id) {
    // Use the admin API endpoint logic
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "completed" && current.status !== "completed") {
      const { data: shop } = await db.from("shops").select("points_per_baht").eq("id", SHOP_ID).single();
      const earned = Math.round(Number(current.price) * Number(shop?.points_per_baht ?? 0));
      updates.points_earned = earned;
      await db.from("customers").update({
        points: (current.customer?.points ?? 0) + earned,
        visit_count: (current.customer?.visit_count ?? 0) + 1
      }).eq("id", current.customer_id);
    }
    await db.from("bookings").update(updates).eq("id", id);

    // Notify customer
    const statusMsg: Record<string, string> = {
      confirmed: "ร้านยืนยันคิวของคุณแล้ว ✅",
      completed: `ขอบคุณที่มาใช้บริการค่ะ 💚`,
      cancelled: "คิวของคุณถูกยกเลิกแล้ว",
      no_show: "ไม่พบคุณตามเวลานัด หากต้องการจองใหม่ทักร้านได้ค่ะ"
    };
    try { await pushMessage(current.customer.line_user_id, [textMessage(statusMsg[newStatus])]); } catch {}
  } else {
    await db.from("bookings").update({ status: newStatus }).eq("id", id);
  }

  const customerName = (current as any)?.customer?.full_name ?? (current as any)?.customer?.display_name ?? "ลูกค้า";
  return { customerName };
}

// ───────────────── Helpers ─────────────────

async function upsertCustomerFromLine(lineUserId: string): Promise<Customer | null> {
  const db = supabaseAdmin();
  const { data: existing } = await db.from("customers").select("*").eq("shop_id", SHOP_ID).eq("line_user_id", lineUserId).maybeSingle();
  if (existing) return existing as Customer;
  const p = await getProfile(lineUserId);
  const { data: inserted } = await db.from("customers").insert({ shop_id: SHOP_ID, line_user_id: lineUserId, display_name: p?.displayName ?? null, picture_url: p?.pictureUrl ?? null }).select("*").single();
  return (inserted ?? null) as Customer | null;
}

async function fetchMyBookings(customerId: number): Promise<BookingWithJoins[]> {
  const db = supabaseAdmin();
  const { data } = await db.from("bookings").select("*, service:services(id,name,name_en,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id)")
    .eq("customer_id", customerId).in("status", ["pending", "confirmed", "completed"])
    .gte("starts_at", new Date(Date.now() - 86400_000).toISOString())
    .order("starts_at", { ascending: true }).limit(10);
  return (data ?? []) as BookingWithJoins[];
}

async function cancelBookingByCustomer(bookingId: number, customerId: number) {
  const db = supabaseAdmin();
  await db.from("bookings").update({ status: "cancelled" }).eq("id", bookingId).eq("customer_id", customerId).in("status", ["pending", "confirmed"]);
}
