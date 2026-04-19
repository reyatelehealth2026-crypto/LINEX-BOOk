import { NextRequest, NextResponse } from "next/server";
import { verifySignature, replyMessage, getProfile, pushMessage, startLoading } from "@/lib/line";
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
  adminAuthPromptMessage,
  adminAuthSuccessMessage,
  adminMenuMessage,
  adminSetupMenuMessage,
  adminTextExamplesMessage,
  adminWizardPromptMessage,
  adminWizardDayPickerMessage,
  adminWizardDoneMessage,
  adminWizardBatchResultMessage,
  adminWizardProgressMessage,
} from "@/lib/flex";
import type { BookingWithJoins, Customer, LineAdminSession } from "@/types/db";
import { formatDateTH, formatTimeRange } from "@/lib/format";
import { fromZonedTime } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = process.env.SHOP_TIMEZONE || "Asia/Bangkok";
const ADMIN_CHAT_SESSION_HOURS = Number(process.env.ADMIN_CHAT_SESSION_HOURS || 12);
type AdminWizardStep = "shop_name" | "shop_phone" | "shop_address" | "service_name" | "service_price" | "service_duration" | "staff_name" | "hours_day" | "hours_time";

function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_LINE_IDS ?? "";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

function extractAdminPassword(text: string): string | null {
  const m = text.match(/^(?:รหัสแอดมิน|admin password|login)\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function normalizeSqlTime(raw?: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function escapeIlike(value: string) {
  return value.replace(/[%_]/g, "");
}

async function hasActiveAdminSession(lineUserId: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("line_admin_sessions")
    .select("id")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function isAdminAuthorized(lineUserId: string) {
  return getAdminIds().has(lineUserId) || await hasActiveAdminSession(lineUserId);
}

async function grantAdminSession(lineUserId: string) {
  const db = supabaseAdmin();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_CHAT_SESSION_HOURS * 60 * 60 * 1000);
  await db.from("line_admin_sessions").upsert({
    shop_id: SHOP_ID,
    line_user_id: lineUserId,
    authed_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }, { onConflict: "shop_id,line_user_id" });
}

async function revokeAdminSession(lineUserId: string) {
  const db = supabaseAdmin();
  await db.from("line_admin_sessions").delete().eq("shop_id", SHOP_ID).eq("line_user_id", lineUserId);
}

async function getAdminSession(lineUserId: string): Promise<LineAdminSession | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("line_admin_sessions")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  return (data as LineAdminSession | null) ?? null;
}

async function setAdminWizardState(lineUserId: string, wizardStep: AdminWizardStep | null, wizardPayload: Record<string, any> = {}) {
  const db = supabaseAdmin();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_CHAT_SESSION_HOURS * 60 * 60 * 1000);
  await db.from("line_admin_sessions").upsert({
    shop_id: SHOP_ID,
    line_user_id: lineUserId,
    authed_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    wizard_step: wizardStep,
    wizard_payload: wizardPayload,
  }, { onConflict: "shop_id,line_user_id" });
}

async function clearAdminWizardState(lineUserId: string) {
  const db = supabaseAdmin();
  await db.from("line_admin_sessions").update({ wizard_step: null, wizard_payload: {} }).eq("shop_id", SHOP_ID).eq("line_user_id", lineUserId);
}

function wizardPromptForStep(step: AdminWizardStep) {
  return wizardPromptForStepWithState(step, {});
}

function wizardSavedItems(payload: Record<string, any>) {
  const items: string[] = [];
  if (payload.shopName) items.push(`ชื่อร้าน ${payload.shopName}`);
  if (payload.shopPhone) items.push(`เบอร์ ${payload.shopPhone}`);
  if (payload.shopAddress) items.push(`ที่อยู่ ${payload.shopAddress}`);
  if (payload.serviceName) items.push(`บริการ ${payload.serviceName}`);
  if (payload.servicePrice) items.push(`ราคา ${Number(payload.servicePrice).toLocaleString()} บาท`);
  if (payload.serviceDuration) items.push(`เวลา ${payload.serviceDuration} นาที`);
  if (payload.staffName) items.push(`ช่าง ${payload.staffName}`);
  if (payload.hoursDayLabel) items.push(`วัน ${payload.hoursDayLabel}`);
  return items.slice(-4);
}

function wizardPromptForStepWithState(step: AdminWizardStep, payload: Record<string, any>) {
  const savedItems = wizardSavedItems(payload);
  switch (step) {
    case "shop_name":
      return adminWizardPromptMessage({ title: "ตั้งชื่อร้าน", description: "พิมพ์ชื่อร้านที่ต้องการให้ลูกค้าเห็น", example: "Line X Book", stepLabel: "SETUP WIZARD · STEP 1/6", progressText: "● ○ ○ ○ ○ ○", tip: "ตอบเป็นข้อความสั้นๆ ได้เลย เดี๋ยวผมพาไปขั้นถัดไปทันที" });
    case "shop_phone":
      return adminWizardPromptMessage({ title: "ใส่เบอร์ร้าน", description: "ใส่เบอร์โทรร้าน หรือกดข้ามถ้ายังไม่พร้อม", example: "099-999-9999", stepLabel: "SETUP WIZARD · STEP 2/6", progressText: "● ● ○ ○ ○ ○", savedItems, allowSkip: true, tip: "ถ้ายังไม่อยากใส่ตอนนี้ กดข้ามได้" });
    case "shop_address":
      return adminWizardPromptMessage({ title: "ใส่ที่อยู่ร้าน", description: "ใส่ที่อยู่แบบสั้นๆ ก่อนก็ได้ หรือกดข้าม", example: "ลาดพร้าว 101 กรุงเทพ", stepLabel: "SETUP WIZARD · STEP 3/6", progressText: "● ● ● ○ ○ ○", savedItems, allowSkip: true, tip: "พิมพ์แบบย่อก่อนก็ได้ เดี๋ยวค่อยไปแก้ละเอียดทีหลัง" });
    case "service_name":
      return adminWizardPromptMessage({ title: "เพิ่มบริการแรก", description: "พิมพ์ชื่อบริการแรกของร้าน", example: "ตัดผมชาย", stepLabel: "SETUP WIZARD · STEP 4/6", progressText: "● ● ● ● ○ ○", savedItems, tip: "แนะนำให้เริ่มจากบริการที่ขายบ่อยที่สุด" });
    case "service_price":
      return adminWizardPromptMessage({ title: "ใส่ราคาบริการ", description: `บริการ: ${payload.serviceName ?? "-"} , พิมพ์เป็นตัวเลขอย่างเดียว`, example: "250", stepLabel: "SETUP WIZARD · STEP 4/6", progressText: "● ● ● ● ○ ○", savedItems, tip: "พิมพ์เลขอย่างเดียวพอ เช่น 250" });
    case "service_duration":
      return adminWizardPromptMessage({ title: "ใส่ระยะเวลา", description: `บริการ: ${payload.serviceName ?? "-"} , พิมพ์เป็นจำนวนนาทีของบริการนี้`, example: "45", stepLabel: "SETUP WIZARD · STEP 4/6", progressText: "● ● ● ● ○ ○", savedItems, tip: "เช่น 45, 60, 90, 120" });
    case "staff_name":
      return adminWizardPromptMessage({ title: "เพิ่มช่างคนแรก", description: "พิมพ์ชื่อหรือชื่อเล่นของช่างคนแรก", example: "พี่โอ๋", stepLabel: "SETUP WIZARD · STEP 5/6", progressText: "● ● ● ● ● ○", savedItems, tip: "ถ้าเป็นชื่อเล่นที่ลูกค้าคุ้น จะอ่านง่ายกว่า" });
    case "hours_day":
      return adminWizardDayPickerMessage(savedItems);
    case "hours_time":
      return adminWizardPromptMessage({ title: "ใส่เวลาเปิดปิด", description: `วัน${payload.hoursDayLabel ?? "ที่เลือก"} , พิมพ์ช่วงเวลาในรูปแบบ 10:00-20:00`, example: "10:00-20:00", stepLabel: "SETUP WIZARD · STEP 6/6", progressText: "● ● ● ● ● ●", savedItems, tip: "ถ้าร้านเปิดทุกวัน เดี๋ยวค่อยมาเพิ่มวันอื่นต่อได้หลังจบ wizard" });
  }
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
    try { await startLoading(userId, 5); } catch {}
    return handlePostback(ev, customer);
  }

  if (ev.type === "message" && ev.message?.type === "text") {
    try { await startLoading(userId, 5); } catch {}
    return handleMessage(ev, customer);
  }
}

// ───────────────── postback handler ─────────────────

async function handlePostback(ev: any, customer: Customer) {
  const data = new URLSearchParams(ev.postback?.data ?? "");
  const action = data.get("action");
  const rt = ev.replyToken;
  const userId: string | undefined = ev.source?.userId;
  const db = supabaseAdmin();
  const canAdmin = userId ? await isAdminAuthorized(userId) : false;

  if (action?.startsWith("adm_") && !canAdmin) {
    return replyMessage(rt, [adminAuthPromptMessage()]);
  }

  // ── Menu ──
  if (action === "menu") {
    return replyMessage(rt, [mainMenuMessage(customer.display_name ?? "คุณ")]);
  }

  if (action === "adm_menu") {
    return replyMessage(rt, [adminMenuMessage()]);
  }

  if (action === "adm_setup") {
    return replyMessage(rt, [adminSetupMenuMessage()]);
  }

  if (action === "adm_wizard_start") {
    if (!userId) return;
    await grantAdminSession(userId);
    await setAdminWizardState(userId, "shop_name", { flow: "full_setup" });
    return replyMessage(rt, [adminWizardProgressMessage({ title: "เริ่ม Setup Wizard", currentStep: 1, totalSteps: 6, description: "เดี๋ยวผมพาไล่ตั้งค่าร้านทีละขั้น", savedItems: [] }), wizardPromptForStepWithState("shop_name", { flow: "full_setup" })]);
  }

  if (action === "adm_wizard_more_service") {
    if (!userId) return;
    const session = await getAdminSession(userId);
    await grantAdminSession(userId);
    await setAdminWizardState(userId, "service_name", { ...(session?.wizard_payload ?? {}), flow: "service_batch" });
    return replyMessage(rt, [adminWizardProgressMessage({ title: "โหมดเพิ่มบริการ", currentStep: 4, totalSteps: 6, description: "ตอนนี้จะพาเพิ่มบริการต่อแบบเร็วๆ", savedItems: wizardSavedItems({ ...(session?.wizard_payload ?? {}), flow: "service_batch" }) }), wizardPromptForStepWithState("service_name", { ...(session?.wizard_payload ?? {}), flow: "service_batch" })]);
  }

  if (action === "adm_wizard_more_staff") {
    if (!userId) return;
    const session = await getAdminSession(userId);
    await grantAdminSession(userId);
    await setAdminWizardState(userId, "staff_name", { ...(session?.wizard_payload ?? {}), flow: "staff_batch" });
    return replyMessage(rt, [adminWizardProgressMessage({ title: "โหมดเพิ่มช่าง", currentStep: 5, totalSteps: 6, description: "ตอนนี้จะพาเพิ่มช่างต่อแบบเร็วๆ", savedItems: wizardSavedItems({ ...(session?.wizard_payload ?? {}), flow: "staff_batch" }) }), wizardPromptForStepWithState("staff_name", { ...(session?.wizard_payload ?? {}), flow: "staff_batch" })]);
  }

  if (action === "adm_wizard_cancel") {
    if (!userId) return;
    await clearAdminWizardState(userId);
    return replyMessage(rt, [textMessage("ยกเลิก setup wizard แล้ว"), adminSetupMenuMessage()]);
  }

  if (action === "adm_wizard_skip") {
    if (!userId) return;
    const session = await getAdminSession(userId);
    if (!session?.wizard_step) return replyMessage(rt, [adminSetupMenuMessage()]);
    if (session.wizard_step === "shop_phone") {
      await setAdminWizardState(userId, "shop_address", session.wizard_payload ?? {});
      return replyMessage(rt, [adminWizardProgressMessage({ title: "ข้ามเบอร์ร้านแล้ว", currentStep: 3, totalSteps: 6, description: "ไปต่อขั้นที่อยู่ร้าน", savedItems: wizardSavedItems(session.wizard_payload ?? {}) }), wizardPromptForStepWithState("shop_address", session.wizard_payload ?? {})]);
    }
    if (session.wizard_step === "shop_address") {
      await setAdminWizardState(userId, "service_name", session.wizard_payload ?? {});
      return replyMessage(rt, [adminWizardProgressMessage({ title: "ข้ามที่อยู่ร้านแล้ว", currentStep: 4, totalSteps: 6, description: "ไปต่อขั้นเพิ่มบริการแรก", savedItems: wizardSavedItems(session.wizard_payload ?? {}) }), wizardPromptForStepWithState("service_name", session.wizard_payload ?? {})]);
    }
    return replyMessage(rt, [textMessage("ขั้นตอนนี้ข้ามไม่ได้")]);
  }

  if (action === "adm_wizard_day") {
    if (!userId) return;
    const session = await getAdminSession(userId);
    if (session?.wizard_step !== "hours_day") return replyMessage(rt, [adminSetupMenuMessage()]);
    const value = Number(data.get("value"));
    const label = decodeURIComponent(data.get("label") ?? "");
    const payload = { ...(session.wizard_payload ?? {}), hoursDayOfWeek: value, hoursDayLabel: label };
    await setAdminWizardState(userId, "hours_time", payload);
    return replyMessage(rt, [adminWizardProgressMessage({ title: `เลือกวัน${label}แล้ว`, currentStep: 6, totalSteps: 6, description: "เหลือแค่ใส่เวลาเปิดปิดของวันนั้น", savedItems: wizardSavedItems(payload) }), wizardPromptForStepWithState("hours_time", payload)]);
  }

  if (action === "adm_queue_today") {
    return sendAdminQueue(rt, new Date().toISOString().slice(0, 10));
  }

  if (action === "adm_revenue") {
    return sendAdminRevenue(rt);
  }

  if (action === "adm_logout") {
    if (userId) await revokeAdminSession(userId);
    return replyMessage(rt, [textMessage("ออกจากโหมดแอดมินแล้ว 🔒")]);
  }

  if (action === "adm_help_service") {
    return replyMessage(rt, [adminTextExamplesMessage("เพิ่มบริการผ่านแชท", [
      "เพิ่มบริการ ตัดผมชาย 250 บาท 45 นาที",
      "เพิ่มบริการ ทำสีผม 1200 บาท 120 นาที"
    ])]);
  }

  if (action === "adm_help_staff") {
    return replyMessage(rt, [adminTextExamplesMessage("เพิ่มช่างผ่านแชท", [
      "เพิ่มช่าง พี่โอ๋",
      "เพิ่มช่าง พี่มิ้น"
    ])]);
  }

  if (action === "adm_help_shop") {
    return replyMessage(rt, [adminTextExamplesMessage("ตั้งค่าข้อมูลร้าน", [
      "ตั้งชื่อร้าน Line X Book",
      "เบอร์ร้าน 099-999-9999",
      "ที่อยู่ร้าน ลาดพร้าว 101 กรุงเทพ"
    ])]);
  }

  if (action === "adm_help_hours") {
    return replyMessage(rt, [adminTextExamplesMessage("ตั้งเวลาเปิดปิดร้าน", [
      "ตั้งเวลา จันทร์ 10:00-20:00",
      "ตั้งเวลา เสาร์ 09:00-21:00"
    ])]);
  }

  if (action === "adm_help_staff_hours") {
    return replyMessage(rt, [adminTextExamplesMessage("ตั้งเวลารายช่าง", [
      "ตั้งเวลาช่าง พี่โอ๋ จันทร์ 10:00-20:00",
      "ตั้งเวลาช่าง พี่มิ้น เสาร์ 09:00-18:00"
    ])]);
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

  // ── Reschedule: open LIFF reschedule page with booking info ──
  if (action === "reschedule_booking") {
    const id = Number(data.get("id"));
    if (!id) return replyMessage(rt, [textMessage("ไม่พบข้อมูลคิว")]);
    const db = supabaseAdmin();
    const { data: booking } = await db
      .from("bookings")
      .select("id, service_id, staff_id, starts_at, service:services(id,name), staff:staff(id,nickname,name)")
      .eq("id", id)
      .eq("customer_id", customer.id)
      .in("status", ["pending", "confirmed"])
      .maybeSingle();
    if (!booking) return replyMessage(rt, [textMessage("ไม่พบคิวที่สามารถเปลี่ยนเวลาได้")]);
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
    const params = new URLSearchParams({
      id: String(booking.id),
      service_id: String(booking.service_id),
      service_name: (booking.service as any)?.name ?? "",
      staff_id: String(booking.staff_id ?? ""),
      staff_name: (booking.staff as any)?.nickname ?? (booking.staff as any)?.name ?? "",
      current_start: booking.starts_at,
    });
    return replyMessage(rt, [{
      type: "flex",
      altText: "เปลี่ยนเวลาคิว",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          paddingAll: "20px",
          contents: [
            { type: "text", text: "🔄 เปลี่ยนเวลาคิว", weight: "bold", size: "lg" },
            { type: "text", text: `คิว #${booking.id} · ${(booking.service as any)?.name ?? "-"}`, size: "sm", color: "#666" },
            {
              type: "button",
              style: "primary",
              color: "#06c755",
              margin: "md",
              action: {
                type: "uri",
                label: "📅 เลือกเวลาใหม่",
                uri: `https://liff.line.me/${liffId}/liff/reschedule?${params}`
              }
            }
          ]
        }
      }
    }]);
  }

  // ── Join waitlist from chat ──
  if (action === "join_waitlist") {
    const serviceId = Number(data.get("svc"));
    const date = data.get("d") ?? "";
    const staffIdRaw = Number(data.get("stf"));
    const staffId = staffIdRaw === 0 ? null : staffIdRaw;
    if (!serviceId || !date) return replyMessage(rt, [textMessage("ข้อมูลไม่ครบ")]);
    const db = supabaseAdmin();
    // Check for duplicate
    const { data: existing } = await db.from("waitlist_entries").select("id")
      .eq("customer_id", customer.id).eq("service_id", serviceId).eq("desired_date", date).eq("status", "waiting").maybeSingle();
    if (existing) return replyMessage(rt, [textMessage("คุณอยู่ในรายการรออยู่แล้วสำหรับวันนี้ 🔔")]);
    const { error } = await db.from("waitlist_entries").insert({
      shop_id: SHOP_ID, customer_id: customer.id, service_id: serviceId, staff_id: staffId, desired_date: date, status: "waiting"
    });
    if (error) return replyMessage(rt, [textMessage(`เกิดข้อผิดพลาด: ${error.message}`)]);
    return replyMessage(rt, [textMessage(`🔔 ลงทะเบียนรอคิวว่างสำเร็จ!\nเราจะแจ้งเตือนเมื่อมีคิวว่างในวันที่ ${date}`)]);
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

  const suppliedPassword = extractAdminPassword(text);
  if (suppliedPassword !== null) {
    const expected = process.env.ADMIN_PASSWORD ?? "";
    if (!expected) return replyMessage(rt, [textMessage("ยังไม่ได้ตั้ง ADMIN_PASSWORD ในระบบ")]);
    if (suppliedPassword === expected) {
      await grantAdminSession(userId);
      return replyMessage(rt, [adminAuthSuccessMessage(), adminMenuMessage()]);
    }
    return replyMessage(rt, [textMessage("รหัสแอดมินไม่ถูกต้อง ลองใหม่อีกครั้ง")]);
  }

  // ── Check if admin ──
  const isAdmin = await isAdminAuthorized(userId);
  const adminSession = isAdmin ? await getAdminSession(userId) : null;

  if (/^(?:ตั้งค่าแอดมิน|เมนูแอดมิน|admin|admin menu|setup)$/i.test(text)) {
    return replyMessage(rt, [isAdmin ? adminMenuMessage() : adminAuthPromptMessage()]);
  }

  if (isAdmin && adminSession?.wizard_step) {
    if (/^(?:ยกเลิก|cancel)$/i.test(text)) {
      await clearAdminWizardState(userId);
      return replyMessage(rt, [textMessage("ยกเลิก setup wizard แล้ว"), adminSetupMenuMessage()]);
    }
    if (/^(?:ข้าม|skip)$/i.test(text) && (adminSession.wizard_step === "shop_phone" || adminSession.wizard_step === "shop_address")) {
      const nextStep = adminSession.wizard_step === "shop_phone" ? "shop_address" : "service_name";
      const nextPayload = adminSession.wizard_payload ?? {};
      await setAdminWizardState(userId, nextStep, nextPayload);
      return replyMessage(rt, [adminWizardProgressMessage({ title: "ไปขั้นถัดไป", currentStep: nextStep === "shop_address" ? 3 : 4, totalSteps: 6, description: "ระบบรับรู้คำสั่งแล้ว", savedItems: wizardSavedItems(nextPayload) }), wizardPromptForStepWithState(nextStep, nextPayload)]);
    }
    return handleAdminWizardInput(rt, userId, text, adminSession);
  }

  if (isAdmin) {
    const adminCmd = parseAdminCommand(text);
    if (adminCmd) {
      return handleAdminCommand(rt, adminCmd, userId);
    }
  }

  const { data: services } = await db.from("services").select("id, name, name_en, duration_min, price").eq("shop_id", SHOP_ID).eq("active", true);
  const { data: staff } = await db.from("staff").select("id, name, nickname").eq("shop_id", SHOP_ID).eq("active", true);

  // ── Direct booking shortcut for simple commands ──
  if (/^(จอง|จองคิว|book|booking)$/i.test(text.trim())) {
    const svcList = (services ?? []).map((s: any) => ({ id: s.id, name: s.name, duration_min: s.duration_min, price: s.price }));
    if (!svcList.length) return replyMessage(rt, [textMessage("ยังไม่มีบริการในระบบ")]);
    return replyMessage(rt, [serviceCarouselMessage(svcList)]);
  }

  // ── AI Natural Language Booking ──
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
        { type: "button", style: "primary", color: "#06c755", margin: "md", action: { type: "uri", label: "🔍 ดูบริการ/ราคา", uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID ?? ""}/services` } }
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

// ───────────────── Admin Setup Wizard ─────────────────

async function handleAdminWizardInput(rt: string, lineUserId: string, text: string, session: LineAdminSession) {
  const db = supabaseAdmin();
  const payload = (session.wizard_payload ?? {}) as Record<string, any>;
  const flow = String(payload.flow ?? "full_setup");

  switch (session.wizard_step as AdminWizardStep) {
    case "shop_name": {
      await db.from("shops").update({ name: text }).eq("id", SHOP_ID);
      await setAdminWizardState(lineUserId, "shop_phone", { ...payload, shopName: text });
      const nextPayload = { ...payload, shopName: text };
      return replyMessage(rt, [textMessage(`✅ ตั้งชื่อร้านเป็น "${text}" แล้ว`), adminWizardProgressMessage({ title: "ไปต่อขั้นเบอร์ร้าน", currentStep: 2, totalSteps: 6, description: "ชื่อร้านถูกบันทึกแล้ว", savedItems: wizardSavedItems(nextPayload) }), wizardPromptForStepWithState("shop_phone", nextPayload)]);
    }

    case "shop_phone": {
      await db.from("shops").update({ phone: text }).eq("id", SHOP_ID);
      await setAdminWizardState(lineUserId, "shop_address", { ...payload, shopPhone: text });
      const nextPayload = { ...payload, shopPhone: text };
      return replyMessage(rt, [textMessage(`✅ บันทึกเบอร์ร้าน ${text} แล้ว`), adminWizardProgressMessage({ title: "ไปต่อขั้นที่อยู่ร้าน", currentStep: 3, totalSteps: 6, description: "เบอร์ร้านถูกบันทึกแล้ว", savedItems: wizardSavedItems(nextPayload) }), wizardPromptForStepWithState("shop_address", nextPayload)]);
    }

    case "shop_address": {
      await db.from("shops").update({ address: text }).eq("id", SHOP_ID);
      await setAdminWizardState(lineUserId, "service_name", { ...payload, shopAddress: text });
      const nextPayload = { ...payload, shopAddress: text };
      return replyMessage(rt, [textMessage("✅ บันทึกที่อยู่ร้านแล้ว"), adminWizardProgressMessage({ title: "ไปต่อขั้นบริการแรก", currentStep: 4, totalSteps: 6, description: "ข้อมูลร้านพื้นฐานเริ่มครบแล้ว", savedItems: wizardSavedItems(nextPayload) }), wizardPromptForStepWithState("service_name", nextPayload)]);
    }

    case "service_name": {
      await setAdminWizardState(lineUserId, "service_price", { ...payload, serviceName: text });
      const nextPayload = { ...payload, serviceName: text };
      return replyMessage(rt, [adminWizardProgressMessage({ title: `รับชื่อบริการแล้ว`, currentStep: 4, totalSteps: 6, description: "เหลือราคาและระยะเวลา", savedItems: wizardSavedItems(nextPayload) }), wizardPromptForStepWithState("service_price", nextPayload)]);
    }

    case "service_price": {
      const price = Number(text.replace(/[^\d.]/g, ""));
      if (!Number.isFinite(price) || price <= 0) return replyMessage(rt, [textMessage("กรุณาใส่ราคาด้วยตัวเลข เช่น 250")]);
      await setAdminWizardState(lineUserId, "service_duration", { ...payload, servicePrice: price });
      const nextPayload = { ...payload, servicePrice: price };
      return replyMessage(rt, [adminWizardProgressMessage({ title: `รับราคาบริการแล้ว`, currentStep: 4, totalSteps: 6, description: "เหลือใส่ระยะเวลาเพื่อสร้างบริการนี้", savedItems: wizardSavedItems(nextPayload) }), wizardPromptForStepWithState("service_duration", nextPayload)]);
    }

    case "service_duration": {
      const duration = Number(text.replace(/[^\d]/g, ""));
      if (!Number.isFinite(duration) || duration <= 0) return replyMessage(rt, [textMessage("กรุณาใส่ระยะเวลาเป็นนาที เช่น 45")]);
      const serviceName = String(payload.serviceName ?? "").trim();
      const servicePrice = Number(payload.servicePrice ?? 0);
      const { error } = await db.from("services").insert({
        shop_id: SHOP_ID,
        name: serviceName,
        price: servicePrice,
        duration_min: duration,
      });
      if (error) return replyMessage(rt, [textMessage(`เพิ่มบริการไม่สำเร็จ: ${error.message}`)]);

      if (flow === "service_batch") {
        await clearAdminWizardState(lineUserId);
        return replyMessage(rt, [adminWizardBatchResultMessage({
          title: "เพิ่มบริการเรียบร้อยแล้ว",
          lines: [
            `บริการ: ${serviceName}`,
            `ราคา: ${servicePrice.toLocaleString()} บาท`,
            `ระยะเวลา: ${duration} นาที`,
          ],
          primaryLabel: "➕ เพิ่มบริการอีก",
          primaryAction: "action=adm_wizard_more_service",
          secondaryLabel: "➕ ไปเพิ่มช่าง",
          secondaryAction: "action=adm_wizard_more_staff",
          tertiaryLabel: "⬅️ กลับเมนูแอดมิน",
          tertiaryAction: "action=adm_menu",
        })]);
      }

      await setAdminWizardState(lineUserId, "staff_name", { ...payload, serviceDuration: duration });
      const nextPayload = { ...payload, serviceDuration: duration };
      return replyMessage(rt, [textMessage(`✅ เพิ่มบริการ "${serviceName}" แล้ว`), adminWizardProgressMessage({ title: "ไปต่อขั้นช่างคนแรก", currentStep: 5, totalSteps: 6, description: "บริการแรกพร้อมแล้ว", savedItems: wizardSavedItems(nextPayload) }), wizardPromptForStepWithState("staff_name", nextPayload)]);
    }

    case "staff_name": {
      const { error } = await db.from("staff").insert({ shop_id: SHOP_ID, name: text });
      if (error) return replyMessage(rt, [textMessage(`เพิ่มช่างไม่สำเร็จ: ${error.message}`)]);
      const { data: svcs } = await db.from("services").select("id").eq("shop_id", SHOP_ID);
      const { data: stf } = await db.from("staff").select("id").eq("shop_id", SHOP_ID).order("id", { ascending: false }).limit(1).single();
      if (stf && svcs?.length) {
        await db.from("staff_services").insert(svcs.map(s => ({ staff_id: stf.id, service_id: s.id }))).then(() => {});
      }

      if (flow === "staff_batch") {
        await clearAdminWizardState(lineUserId);
        return replyMessage(rt, [adminWizardBatchResultMessage({
          title: "เพิ่มช่างเรียบร้อยแล้ว",
          lines: [
            `ช่าง: ${text}`,
            `ผูกกับบริการในร้านอัตโนมัติแล้ว`,
          ],
          primaryLabel: "➕ เพิ่มช่างอีก",
          primaryAction: "action=adm_wizard_more_staff",
          secondaryLabel: "➕ ไปเพิ่มบริการ",
          secondaryAction: "action=adm_wizard_more_service",
          tertiaryLabel: "⬅️ กลับเมนูแอดมิน",
          tertiaryAction: "action=adm_menu",
        })]);
      }

      await setAdminWizardState(lineUserId, "hours_day", { ...payload, staffName: text });
      const nextPayload = { ...payload, staffName: text };
      return replyMessage(rt, [textMessage(`✅ เพิ่มช่าง "${text}" แล้ว`), adminWizardProgressMessage({ title: "ไปต่อขั้นเลือกวันทำการ", currentStep: 6, totalSteps: 6, description: "เหลือกำหนดเวลาเปิดปิด", savedItems: wizardSavedItems(nextPayload) }), wizardPromptForStepWithState("hours_day", nextPayload)]);
    }

    case "hours_day": {
      return replyMessage(rt, [adminWizardProgressMessage({ title: "เลือกวันก่อน", currentStep: 6, totalSteps: 6, description: "กดวันจากปุ่มด้านล่างได้เลย", savedItems: wizardSavedItems(payload) }), wizardPromptForStepWithState("hours_day", payload)]);
    }

    case "hours_time": {
      const m = text.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
      if (!m) return replyMessage(rt, [textMessage("รูปแบบเวลาไม่ถูกต้อง ใช้เช่น 10:00-20:00")]);
      const openTime = normalizeSqlTime(m[1]);
      const closeTime = normalizeSqlTime(m[2]);
      if (!openTime || !closeTime) return replyMessage(rt, [textMessage("รูปแบบเวลาไม่ถูกต้อง ใช้เช่น 10:00-20:00")]);

      await db.from("working_hours").delete().eq("shop_id", SHOP_ID).is("staff_id", null).eq("day_of_week", payload.hoursDayOfWeek);
      const { error } = await db.from("working_hours").insert({
        shop_id: SHOP_ID,
        staff_id: null,
        day_of_week: payload.hoursDayOfWeek,
        open_time: openTime,
        close_time: closeTime,
      });
      if (error) return replyMessage(rt, [textMessage(`ตั้งเวลาไม่สำเร็จ: ${error.message}`)]);

      await clearAdminWizardState(lineUserId);

      const summary = [
        `ชื่อร้าน: ${payload.shopName ?? "-"}`,
        `บริการแรก: ${payload.serviceName ?? "-"}`,
        `ช่างคนแรก: ${payload.staffName ?? "-"}`,
        `เวลาทำการ: ${payload.hoursDayLabel ?? "-"} ${m[1]}-${m[2]}`,
      ];
      if (payload.shopPhone) summary.splice(1, 0, `เบอร์ร้าน: ${payload.shopPhone}`);
      if (payload.shopAddress) summary.splice(payload.shopPhone ? 2 : 1, 0, `ที่อยู่ร้าน: ${payload.shopAddress}`);

      return replyMessage(rt, [adminWizardDoneMessage(summary), adminMenuMessage()]);
    }
  }

  return replyMessage(rt, [adminSetupMenuMessage()]);
}

// ───────────────── Admin Command Handler ─────────────────

async function handleAdminCommand(rt: string, cmd: any, lineUserId?: string) {
  const db = supabaseAdmin();

  if (cmd.action === "setup_menu" || cmd.action === "help") {
    return replyMessage(rt, [adminMenuMessage(), adminSetupMenuMessage()]);
  }

  if (cmd.action === "logout") {
    if (lineUserId) await revokeAdminSession(lineUserId);
    return replyMessage(rt, [textMessage("ออกจากโหมดแอดมินแล้ว 🔒")]);
  }

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

  if (cmd.action === "set_shop_name") {
    const { error } = await db.from("shops").update({ name: cmd.args.name }).eq("id", SHOP_ID);
    if (error) return replyMessage(rt, [textMessage(`อัปเดตชื่อร้านไม่สำเร็จ: ${error.message}`)]);
    return replyMessage(rt, [textMessage(`✅ เปลี่ยนชื่อร้านเป็น "${cmd.args.name}" แล้ว`)]);
  }

  if (cmd.action === "set_shop_phone") {
    const { error } = await db.from("shops").update({ phone: cmd.args.phone }).eq("id", SHOP_ID);
    if (error) return replyMessage(rt, [textMessage(`อัปเดตเบอร์ร้านไม่สำเร็จ: ${error.message}`)]);
    return replyMessage(rt, [textMessage(`✅ บันทึกเบอร์ร้าน ${cmd.args.phone} แล้ว`)]);
  }

  if (cmd.action === "set_shop_address") {
    const { error } = await db.from("shops").update({ address: cmd.args.address }).eq("id", SHOP_ID);
    if (error) return replyMessage(rt, [textMessage(`อัปเดตที่อยู่ร้านไม่สำเร็จ: ${error.message}`)]);
    return replyMessage(rt, [textMessage(`✅ บันทึกที่อยู่ร้านแล้ว`)]);
  }

  if (cmd.action === "set_hours") {
    const openTime = normalizeSqlTime(cmd.args.openTime);
    const closeTime = normalizeSqlTime(cmd.args.closeTime);
    if (!openTime || !closeTime) return replyMessage(rt, [textMessage("รูปแบบเวลาไม่ถูกต้อง ใช้เช่น 10:00-20:00")]);

    await db.from("working_hours").delete().eq("shop_id", SHOP_ID).is("staff_id", null).eq("day_of_week", cmd.args.dayOfWeek);
    const { error } = await db.from("working_hours").insert({
      shop_id: SHOP_ID,
      staff_id: null,
      day_of_week: cmd.args.dayOfWeek,
      open_time: openTime,
      close_time: closeTime,
    });
    if (error) return replyMessage(rt, [textMessage(`ตั้งเวลาไม่สำเร็จ: ${error.message}`)]);
    return replyMessage(rt, [textMessage(`✅ ตั้งเวลาร้านวัน${cmd.args.dayLabel} ${cmd.args.openTime}-${cmd.args.closeTime} แล้ว`)]);
  }

  if (cmd.action === "set_staff_hours") {
    const openTime = normalizeSqlTime(cmd.args.openTime);
    const closeTime = normalizeSqlTime(cmd.args.closeTime);
    if (!openTime || !closeTime) return replyMessage(rt, [textMessage("รูปแบบเวลาไม่ถูกต้อง ใช้เช่น 10:00-20:00")]);

    const { data: staffRow } = await db
      .from("staff")
      .select("id, name, nickname")
      .eq("shop_id", SHOP_ID)
      .or(`name.ilike.%${escapeIlike(cmd.args.staffName)}%,nickname.ilike.%${escapeIlike(cmd.args.staffName)}%`)
      .limit(1)
      .maybeSingle();

    if (!staffRow) return replyMessage(rt, [textMessage(`ไม่พบช่างชื่อ "${cmd.args.staffName}"`)]);

    await db.from("working_hours").delete().eq("shop_id", SHOP_ID).eq("staff_id", staffRow.id).eq("day_of_week", cmd.args.dayOfWeek);
    const { error } = await db.from("working_hours").insert({
      shop_id: SHOP_ID,
      staff_id: staffRow.id,
      day_of_week: cmd.args.dayOfWeek,
      open_time: openTime,
      close_time: closeTime,
    });
    if (error) return replyMessage(rt, [textMessage(`ตั้งเวลาช่างไม่สำเร็จ: ${error.message}`)]);
    const label = staffRow.nickname ?? staffRow.name;
    return replyMessage(rt, [textMessage(`✅ ตั้งเวลา ${label} วัน${cmd.args.dayLabel} ${cmd.args.openTime}-${cmd.args.closeTime} แล้ว`)]);
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
