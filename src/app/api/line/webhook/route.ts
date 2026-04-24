import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { verifySignature, replyMessage, getProfile, pushMessage, startLoading, getMessageContent } from "@/lib/line";
import { supabaseAdmin, SHOP_ID, getShopByLineOaId, getShopById } from "@/lib/supabase";
import { runWithShopContext } from "@/lib/request-context";
import { availableSlots } from "@/lib/booking";
import { parseAdminCommand } from "@/lib/thai-nlp";
import { resolveAiRoute } from "@/lib/ai/router";
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
  defaultQuickReply,
  adminAuthPromptMessage,
  adminAuthRecoveryMessage,
  adminAuthSuccessMessage,
  adminMenuMessage,
  adminSetupMenuMessage,
  adminTextExamplesMessage,
  adminWizardPromptMessage,
  adminWizardDayPickerMessage,
  adminWizardDoneMessage,
  adminWizardBatchResultMessage,
  adminWizardProgressMessage,
  adminSetupStatusMessage,
  setFlexTheme,
  bookInLiffMessage,
} from "@/lib/flex";
import { getShopThemeId } from "@/lib/shop-theme";
import { askGLM, askGLMWithImage } from "@/lib/zai";
import { generateImage, uploadGeneratedImage } from "@/lib/ai/image-gen";
import { getOpenHandoff, requestHandoff, takeHandoff, closeHandoff, notifyAdminsOfHandoff } from "@/lib/handoff";
import { verifyPassword } from "@/lib/admin-auth";
import type { BookingWithJoins, Customer, LineAdminSession } from "@/types/db";
import { formatDateTH, formatTimeRange } from "@/lib/format";
import { fromZonedTime } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = process.env.SHOP_TIMEZONE || "Asia/Bangkok";
const ADMIN_CHAT_SESSION_HOURS = Number(process.env.ADMIN_CHAT_SESSION_HOURS || 12);
const ADMIN_SESSION_GRACE_MS = 5 * 60 * 1000;
type AdminWizardStep = "shop_name" | "shop_phone" | "shop_address" | "service_name" | "service_price" | "service_duration" | "staff_name" | "hours_day" | "hours_time";

const lineEventQueues = ((globalThis as any).__lineEventQueues ??= new Map<string, Promise<unknown>>()) as Map<string, Promise<unknown>>;

// Dedup LINE webhook retries: store webhookEventId → received-at timestamp.
// LINE retries with the SAME webhookEventId — skip duplicates to prevent
// double-counting rate limits and double-sending replies.
const _seenWebhookEvents: Map<string, number> = (globalThis as any).__seenWebhookEvents ??= new Map();
const SEEN_WEBHOOK_TTL_MS = 5 * 60 * 1000; // 5 min — longer than LINE retry window

function markWebhookEventSeen(eventId: string): boolean {
  // Returns true if the event was already seen (i.e., this is a retry).
  purgeStaleSeenEvents();
  if (_seenWebhookEvents.has(eventId)) return true;
  _seenWebhookEvents.set(eventId, Date.now());
  return false;
}

function purgeStaleSeenEvents() {
  const cutoff = Date.now() - SEEN_WEBHOOK_TTL_MS;
  for (const [id, at] of _seenWebhookEvents) {
    if (at < cutoff) _seenWebhookEvents.delete(id);
  }
}

// 20 events per minute per LINE userId — prevents a single user from exhausting DB resources
const _userEventLimiter = createRateLimiter(20, 60 * 1000);

function rebookCtaFlex(params: { serviceId: number; staffId: number | null; serviceName: string; staffName: string }) {
  const { serviceId, staffId, serviceName, staffName } = params;
  const stf = staffId ?? 0;
  return {
    type: "flex" as const,
    altText: `อยากจอง ${serviceName} อีกไหมคะ?`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "อยากจองใหม่ไหมคะ?", weight: "bold", size: "md" },
          { type: "text", text: `${serviceName} · ${staffName}`, size: "sm", color: "#64748b", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06c755",
            action: { type: "postback", label: "📅 จองใหม่ (บริการเดิม)", data: `action=book_stf&svc=${serviceId}&id=${stf}` },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: "🔍 เลือกบริการอื่น", data: "action=book" },
          },
        ],
      },
    },
  };
}

const ADMIN_RECOVERY_ACTIONS: Record<string, string> = {
  adm_menu: "หน้าแรกแอดมิน",
  adm_setup: "เมนูตั้งค่าร้าน",
  adm_status: "สถานะร้าน",
  adm_wizard_start: "Setup Wizard",
  adm_wizard_more_service: "เพิ่มบริการ",
  adm_wizard_more_staff: "เพิ่มช่าง",
  adm_queue_today: "คิววันนี้",
  adm_revenue: "ยอดวันนี้",
  adm_logout: "ออกจากโหมดแอดมิน",
  adm_help_service: "ตัวอย่างเพิ่มบริการ",
  adm_help_staff: "ตัวอย่างเพิ่มช่าง",
  adm_help_shop: "ตัวอย่างตั้งค่าข้อมูลร้าน",
  adm_help_hours: "ตัวอย่างตั้งเวลาเปิดปิดร้าน",
  adm_help_staff_hours: "ตัวอย่างตั้งเวลารายช่าง",
};

async function getAdminIds(): Promise<Set<string>> {
  // Per-shop admin LINE IDs from admin_users (falls back to legacy env var
  // only when the shop has no linked admin rows yet).
  const db = supabaseAdmin();
  const { data } = await db
    .from("admin_users")
    .select("line_user_id")
    .eq("shop_id", SHOP_ID)
    .eq("active", true)
    .not("line_user_id", "is", null);
  const ids = new Set<string>(
    (data ?? []).map((a) => a.line_user_id as string).filter(Boolean)
  );
  if (ids.size > 0) return ids;
  const raw = process.env.ADMIN_LINE_IDS ?? process.env.ADMIN_LINE_USER_IDS ?? "";
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
  const { data, error } = await db
    .from("line_admin_sessions")
    .select("id, expires_at")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("hasActiveAdminSession error", { lineUserId, error: error.message });
    return false;
  }
  if (!data?.expires_at) return false;
  const expiresAtMs = new Date(data.expires_at).getTime();
  const nowMs = Date.now();
  const active = Number.isFinite(expiresAtMs) && expiresAtMs + ADMIN_SESSION_GRACE_MS > nowMs;
  if (!active) {
    console.warn("admin session expired or invalid", { lineUserId, expires_at: data.expires_at, now: new Date(nowMs).toISOString() });
  }
  return active;
}

async function isAdminAuthorized(lineUserId: string) {
  const ids = await getAdminIds();
  return ids.has(lineUserId) || await hasActiveAdminSession(lineUserId);
}

async function grantAdminSession(lineUserId: string) {
  const db = supabaseAdmin();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_CHAT_SESSION_HOURS * 60 * 60 * 1000);
  const { error } = await db.from("line_admin_sessions").upsert({
    shop_id: SHOP_ID,
    line_user_id: lineUserId,
    authed_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }, { onConflict: "shop_id,line_user_id" });
  if (error) {
    console.error("grantAdminSession error", { lineUserId, error: error.message });
    throw new Error(`grantAdminSession failed: ${error.message}`);
  }
}

async function revokeAdminSession(lineUserId: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("line_admin_sessions").delete().eq("shop_id", SHOP_ID).eq("line_user_id", lineUserId);
  if (error) {
    console.error("revokeAdminSession error", { lineUserId, error: error.message });
  }
}

async function touchAdminSession(lineUserId: string) {
  const session = await getAdminSession(lineUserId);
  if (!session) return;
  await setAdminWizardState(lineUserId, (session.wizard_step as AdminWizardStep | null) ?? null, session.wizard_payload ?? {});
}

async function getAdminSession(lineUserId: string): Promise<LineAdminSession | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("line_admin_sessions")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("getAdminSession error", { lineUserId, error: error.message });
    return null;
  }
  return (data as LineAdminSession | null) ?? null;
}

async function setAdminWizardState(lineUserId: string, wizardStep: AdminWizardStep | null, wizardPayload: Record<string, any> = {}) {
  const db = supabaseAdmin();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_CHAT_SESSION_HOURS * 60 * 60 * 1000);
  const { error } = await db.from("line_admin_sessions").upsert({
    shop_id: SHOP_ID,
    line_user_id: lineUserId,
    authed_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    wizard_step: wizardStep,
    wizard_payload: wizardPayload,
  }, { onConflict: "shop_id,line_user_id" });
  if (error) {
    console.error("setAdminWizardState error", { lineUserId, wizardStep, error: error.message });
    throw new Error(`setAdminWizardState failed: ${error.message}`);
  }
}

async function clearAdminWizardState(lineUserId: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("line_admin_sessions").update({ wizard_step: null, wizard_payload: {} }).eq("shop_id", SHOP_ID).eq("line_user_id", lineUserId);
  if (error) {
    console.error("clearAdminWizardState error", { lineUserId, error: error.message });
    throw new Error(`clearAdminWizardState failed: ${error.message}`);
  }
}

async function rememberPendingAdminAction(lineUserId: string, action: string, label?: string) {
  const db = supabaseAdmin();
  const session = await getAdminSession(lineUserId);
  const wizardPayload = {
    ...(session?.wizard_payload ?? {}),
    pendingAdminAction: action,
    pendingAdminLabel: label ?? ADMIN_RECOVERY_ACTIONS[action] ?? action,
  };
  const expiresAt = session?.expires_at ?? new Date().toISOString();
  const authedAt = session?.authed_at ?? new Date().toISOString();
  const { error } = await db.from("line_admin_sessions").upsert({
    shop_id: SHOP_ID,
    line_user_id: lineUserId,
    authed_at: authedAt,
    expires_at: expiresAt,
    wizard_step: session?.wizard_step ?? null,
    wizard_payload: wizardPayload,
  }, { onConflict: "shop_id,line_user_id" });
  if (error) {
    console.error("rememberPendingAdminAction error", { lineUserId, action, error: error.message });
  }
}

function wizardBreadcrumb(step: AdminWizardStep) {
  const labels: Record<AdminWizardStep, string> = {
    shop_name: "ข้อมูลร้าน",
    shop_phone: "ข้อมูลร้าน",
    shop_address: "ข้อมูลร้าน",
    service_name: "บริการ",
    service_price: "บริการ",
    service_duration: "บริการ",
    staff_name: "ช่าง",
    hours_day: "เวลาทำการ",
    hours_time: "เวลาทำการ",
  };
  return `แอดมิน > ตั้งค่าร้าน > Setup Wizard > ${labels[step]}`;
}

function matchAdminTextIntent(text: string) {
  const normalized = text.trim();
  if (/^(?:เมนูแอดมิน|ตั้งค่าแอดมิน|admin|admin menu|setup)$/i.test(normalized)) return "adm_menu";
  if (/^(?:เปิดเมนูตั้งค่าร้าน|ตั้งค่าร้าน)$/i.test(normalized)) return "adm_setup";
  if (/^(?:เริ่ม setup wizard|setup wizard)$/i.test(normalized)) return "adm_wizard_start";
  if (/^(?:สถานะร้าน|setup status|status)$/i.test(normalized)) return "adm_status";
  if (/^(?:ดูตัวอย่างตั้งค่าข้อมูลร้าน)$/i.test(normalized)) return "adm_help_shop";
  if (/^(?:ดูตัวอย่างเพิ่มบริการ)$/i.test(normalized)) return "adm_help_service";
  if (/^(?:ดูตัวอย่างเพิ่มช่าง)$/i.test(normalized)) return "adm_help_staff";
  if (/^(?:ดูตัวอย่างตั้งเวลาเปิดปิดร้าน)$/i.test(normalized)) return "adm_help_hours";
  if (/^(?:ดูตัวอย่างตั้งเวลารายช่าง)$/i.test(normalized)) return "adm_help_staff_hours";
  if (/^(?:คิววันนี้)$/i.test(normalized)) return "adm_queue_today";
  if (/^(?:ยอดวันนี้)$/i.test(normalized)) return "adm_revenue";
  if (/^(?:ออกจากโหมดแอดมิน)$/i.test(normalized)) return "adm_logout";
  return null;
}

async function handleAdminIntent(rt: string, intent: string, lineUserId?: string) {
  switch (intent) {
    case "adm_menu":
      return replyMessage(rt, [adminMenuMessage()]);
    case "adm_setup":
      return replyMessage(rt, [adminSetupMenuMessage()]);
    case "adm_status": {
      const status = await buildAdminSetupStatus();
      return replyMessage(rt, [adminSetupStatusMessage(status)]);
    }
    case "adm_wizard_start": {
      if (!lineUserId) return;
      await grantAdminSession(lineUserId);
      await setAdminWizardState(lineUserId, "shop_name", { flow: "full_setup" });
      return replyMessage(rt, [adminWizardProgressMessage({ title: "เริ่ม Setup Wizard", currentStep: 1, totalSteps: 6, description: "เดี๋ยวผมพาไล่ตั้งค่าร้านทีละขั้น", savedItems: [], breadcrumb: wizardBreadcrumb("shop_name") }), wizardPromptForStepWithState("shop_name", { flow: "full_setup" })]);
    }
    case "adm_queue_today":
      return sendAdminQueue(rt, new Date().toISOString().slice(0, 10));
    case "adm_revenue":
      return sendAdminRevenue(rt);
    case "adm_logout":
      if (lineUserId) await revokeAdminSession(lineUserId);
      return replyMessage(rt, [textMessage("ออกจากโหมดแอดมินแล้ว 🔒")]);
    case "adm_help_service":
      return replyMessage(rt, [adminTextExamplesMessage("เพิ่มบริการผ่านแชท", [
        "เพิ่มบริการ ตัดผมชาย 250 บาท 45 นาที",
        "เพิ่มบริการ ทำสีผม 1200 บาท 120 นาที"
      ])]);
    case "adm_help_staff":
      return replyMessage(rt, [adminTextExamplesMessage("เพิ่มช่างผ่านแชท", [
        "เพิ่มช่าง พี่โอ๋",
        "เพิ่มช่าง พี่มิ้น"
      ])]);
    case "adm_help_shop":
      return replyMessage(rt, [adminTextExamplesMessage("ตั้งค่าข้อมูลร้าน", [
        "ตั้งชื่อร้าน Line X Book",
        "เบอร์ร้าน 099-999-9999",
        "ที่อยู่ร้าน ลาดพร้าว 101 กรุงเทพ"
      ])]);
    case "adm_help_hours":
      return replyMessage(rt, [adminTextExamplesMessage("ตั้งเวลาเปิดปิดร้าน", [
        "ตั้งเวลา จันทร์ 10:00-20:00",
        "ตั้งเวลา เสาร์ 09:00-21:00"
      ])]);
    case "adm_help_staff_hours":
      return replyMessage(rt, [adminTextExamplesMessage("ตั้งเวลารายช่าง", [
        "ตั้งเวลาช่าง พี่โอ๋ จันทร์ 10:00-20:00",
        "ตั้งเวลาช่าง พี่มิ้น เสาร์ 09:00-18:00"
      ])]);
  }
}

async function maybeResumePendingAdminAction(rt: string, lineUserId: string) {
  const session = await getAdminSession(lineUserId);
  const pendingAction = String(session?.wizard_payload?.pendingAdminAction ?? "").trim();
  if (!pendingAction) return null;
  const nextPayload = { ...(session?.wizard_payload ?? {}) };
  delete nextPayload.pendingAdminAction;
  delete nextPayload.pendingAdminLabel;
  await setAdminWizardState(lineUserId, (session?.wizard_step as AdminWizardStep | null) ?? null, nextPayload);
  return handleAdminIntent(rt, pendingAction, lineUserId);
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
  const breadcrumb = wizardBreadcrumb(step);
  switch (step) {
    case "shop_name":
      return adminWizardPromptMessage({ title: "ตั้งชื่อร้าน", description: "พิมพ์ชื่อร้านที่ต้องการให้ลูกค้าเห็น", example: "Line X Book", stepLabel: "SETUP WIZARD · STEP 1/6", progressText: "● ○ ○ ○ ○ ○", tip: "ตอบเป็นข้อความสั้นๆ ได้เลย เดี๋ยวผมพาไปขั้นถัดไปทันที", breadcrumb });
    case "shop_phone":
      return adminWizardPromptMessage({ title: "ใส่เบอร์ร้าน", description: "ใส่เบอร์โทรร้าน หรือกดข้ามถ้ายังไม่พร้อม", example: "099-999-9999", stepLabel: "SETUP WIZARD · STEP 2/6", progressText: "● ● ○ ○ ○ ○", savedItems, allowSkip: true, tip: "ถ้ายังไม่อยากใส่ตอนนี้ กดข้ามได้", breadcrumb });
    case "shop_address":
      return adminWizardPromptMessage({ title: "ใส่ที่อยู่ร้าน", description: "ใส่ที่อยู่แบบสั้นๆ ก่อนก็ได้ หรือกดข้าม", example: "ลาดพร้าว 101 กรุงเทพ", stepLabel: "SETUP WIZARD · STEP 3/6", progressText: "● ● ● ○ ○ ○", savedItems, allowSkip: true, tip: "พิมพ์แบบย่อก่อนก็ได้ เดี๋ยวค่อยไปแก้ละเอียดทีหลัง", breadcrumb });
    case "service_name":
      return adminWizardPromptMessage({ title: "เพิ่มบริการแรก", description: "พิมพ์ชื่อบริการแรกของร้าน", example: "ตัดผมชาย", stepLabel: "SETUP WIZARD · STEP 4/6", progressText: "● ● ● ● ○ ○", savedItems, tip: "แนะนำให้เริ่มจากบริการที่ขายบ่อยที่สุด", breadcrumb });
    case "service_price":
      return adminWizardPromptMessage({ title: "ใส่ราคาบริการ", description: `บริการ: ${payload.serviceName ?? "-"} , พิมพ์เป็นตัวเลขอย่างเดียว`, example: "250", stepLabel: "SETUP WIZARD · STEP 4/6", progressText: "● ● ● ● ○ ○", savedItems, tip: "พิมพ์เลขอย่างเดียวพอ เช่น 250", breadcrumb });
    case "service_duration":
      return adminWizardPromptMessage({ title: "ใส่ระยะเวลา", description: `บริการ: ${payload.serviceName ?? "-"} , พิมพ์เป็นจำนวนนาทีของบริการนี้`, example: "45", stepLabel: "SETUP WIZARD · STEP 4/6", progressText: "● ● ● ● ○ ○", savedItems, tip: "เช่น 45, 60, 90, 120", breadcrumb });
    case "staff_name":
      return adminWizardPromptMessage({ title: "เพิ่มช่างคนแรก", description: "พิมพ์ชื่อหรือชื่อเล่นของช่างคนแรก", example: "พี่โอ๋", stepLabel: "SETUP WIZARD · STEP 5/6", progressText: "● ● ● ● ● ○", savedItems, tip: "ถ้าเป็นชื่อเล่นที่ลูกค้าคุ้น จะอ่านง่ายกว่า", breadcrumb });
    case "hours_day":
      return adminWizardDayPickerMessage(savedItems);
    case "hours_time":
      return adminWizardPromptMessage({ title: "ใส่เวลาเปิดปิด", description: `วัน${payload.hoursDayLabel ?? "ที่เลือก"} , พิมพ์ช่วงเวลาในรูปแบบ 10:00-20:00`, example: "10:00-20:00", stepLabel: "SETUP WIZARD · STEP 6/6", progressText: "● ● ● ● ● ●", savedItems, tip: "ถ้าร้านเปิดทุกวัน เดี๋ยวค่อยมาเพิ่มวันอื่นต่อได้หลังจบ wizard", breadcrumb });
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-line-signature");

  // Multi-tenant: resolve shop from LINE `destination` field (the OA's user
  // id that the event was sent to). Each tenant has its own channel secret
  // + access token, so we must load the shop row before signature verify.
  const body = JSON.parse(raw) as { destination?: string; events?: any[] };
  const destination = body.destination;
  let shop =
    destination ? await getShopByLineOaId(destination) : null;
  // Legacy single-tenant fallback: only kicks in when there's NO destination
  // field (older LINE API payloads). A destination that simply doesn't match
  // any shop row is rejected outright — otherwise a stray/forged webhook would
  // silently write to shop 1.
  if (!shop && !destination) {
    shop = await getShopById(Number(process.env.DEFAULT_SHOP_ID ?? 1));
  }
  if (!shop) {
    return NextResponse.json({ ok: false, error: "shop not found" }, { status: 404 });
  }

  return runWithShopContext(
    {
      shop,
      accessToken: shop.line_channel_access_token ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
      channelSecret: shop.line_channel_secret ?? process.env.LINE_CHANNEL_SECRET ?? "",
      liffId: shop.liff_id,
    },
    async () => {
      // Verify with the shop's own secret (falls back to env if shop has none).
      if (!verifySignature(raw, sig)) {
        return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
      }

      try {
        setFlexTheme(await getShopThemeId());
      } catch (err) {
        console.error("[flex-theme] failed to load shop theme:", err);
      }

      const events = body.events ?? [];
      for (const e of events) {
        try {
          await enqueueLineEvent(e);
        } catch (err) {
          console.error("event err:", err);
        }
      }
      return NextResponse.json({ ok: true });
    },
  );
}

async function enqueueLineEvent(ev: any) {
  // Skip LINE webhook retries — same webhookEventId means we already queued
  // this event. Without dedup, slow ops (image gen ~35s) cause LINE to retry
  // 3×, tripling rate-limit counters before the user sees any reply.
  const webhookEventId: string | undefined = ev.webhookEventId;
  if (webhookEventId) {
    const isDuplicate = markWebhookEventSeen(webhookEventId);
    if (isDuplicate) {
      console.warn("[line-webhook] duplicate event skipped", { webhookEventId, type: ev.type, userId: ev.source?.userId });
      return;
    }
  }

  const userId: string | undefined = ev.source?.userId;
  if (!userId) {
    return handleEvent(ev);
  }

  const { allowed } = _userEventLimiter.check(userId);
  if (!allowed) {
    console.warn(`[rate-limit] dropped event for userId=${userId} type=${ev.type}`);
    return;
  }

  const enqueuedAt = Date.now();
  const previous = lineEventQueues.get(userId) ?? Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(async () => {
      const queueWaitMs = Date.now() - enqueuedAt;
      if (queueWaitMs >= 1000) {
        console.warn("[line-queue] event waited in per-user queue", {
          userId,
          type: ev.type,
          queueWaitMs,
        });
      }
      return handleEvent(ev);
    });

  lineEventQueues.set(userId, current);

  try {
    await current;
  } finally {
    if (lineEventQueues.get(userId) === current) {
      lineEventQueues.delete(userId);
    }
  }
}

async function buildAdminSetupStatus() {
  const db = supabaseAdmin();
  const [shopRes, servicesRes, staffRes, hoursRes] = await Promise.all([
    db.from("shops").select("name, phone, address").eq("id", SHOP_ID).maybeSingle(),
    db.from("services").select("id", { count: "exact", head: true }).eq("shop_id", SHOP_ID),
    db.from("staff").select("id", { count: "exact", head: true }).eq("shop_id", SHOP_ID),
    db.from("working_hours").select("id", { count: "exact", head: true }).eq("shop_id", SHOP_ID),
  ]);

  const checks = [
    { ok: !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET), label: "เชื่อม LINE OA" },
    { ok: !!process.env.NEXT_PUBLIC_LIFF_ID, label: "มี LIFF ID" },
    { ok: !!process.env.NEXT_PUBLIC_APP_URL, label: "มี APP URL" },
    { ok: !!shopRes.data?.name && shopRes.data.name !== "My Shop", label: "ตั้งชื่อร้านแล้ว" },
    { ok: Number(servicesRes.count ?? 0) > 0, label: "มีบริการ" },
    { ok: Number(staffRes.count ?? 0) > 0, label: "มีช่าง" },
    { ok: Number(hoursRes.count ?? 0) > 0, label: "มีเวลาทำการ" },
  ];

  const readyCount = checks.filter((c) => c.ok).length;
  const totalCount = checks.length;
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);

  let summary = "ยังต้องตั้งค่าเพิ่มอีกนิดก่อนใช้งานจริง";
  if (readyCount === totalCount) summary = "ร้านพร้อมใช้งานพื้นฐานแล้ว";
  else if (readyCount >= totalCount - 2) summary = "ใกล้พร้อมแล้ว เหลือไม่กี่จุด";

  return { readyCount, totalCount, missing, summary };
}

function replyWizardNext(rt: string, nextStep: AdminWizardStep, payload: Record<string, any>, ackText?: string) {
  const messages: any[] = [];
  if (ackText) messages.push(textMessage(ackText));
  messages.push(wizardPromptForStepWithState(nextStep, payload));
  return replyMessage(rt, messages);
}

// ───────────────── event router ─────────────────

async function handleEvent(ev: any) {
  const userId: string | undefined = ev.source?.userId;
  if (!userId) return;

  const eventStartedAt = Date.now();
  const customer = await upsertCustomerFromLine(userId);
  if (!customer) return;

  if (ev.type === "follow") {
    const name = customer.display_name ?? customer.full_name ?? "คุณ";
    return replyMessage(ev.replyToken, [
      welcomeMessage(name),
      textMessage("ถ้าต้องการเริ่มแบบเร็ว แตะเมนูลัดด้านล่างได้เลยค่ะ", defaultQuickReply())
    ]);
  }

  if (ev.type === "postback") {
    try { await startLoading(userId, 3); } catch {}
    try {
      return await handlePostback(ev, customer);
    } finally {
      const totalMs = Date.now() - eventStartedAt;
      if (totalMs >= 1500) {
        console.info("[line-webhook] slow postback handled", { userId, totalMs });
      }
    }
  }

  if (ev.type === "message" && ev.message?.type === "text") {
    try {
      return await handleMessage(ev, customer);
    } finally {
      const totalMs = Date.now() - eventStartedAt;
      if (totalMs >= 1500) {
        console.info("[line-webhook] slow text handled", { userId, totalMs });
      }
    }
  }

  if (ev.type === "message" && ev.message?.type === "image") {
    try {
      return await handleImageMessage(ev, customer);
    } finally {
      const totalMs = Date.now() - eventStartedAt;
      if (totalMs >= 2000) {
        console.info("[line-webhook] slow image handled", { userId, totalMs });
      }
    }
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
    if (userId && action) await rememberPendingAdminAction(userId, action);
    return replyMessage(rt, [adminAuthRecoveryMessage({ pendingLabel: action ? (ADMIN_RECOVERY_ACTIONS[action] ?? action) : undefined })]);
  }

  if (canAdmin && userId) {
    await touchAdminSession(userId);
  }

  // ── Menu ──
  if (action === "menu") {
    return replyMessage(rt, [mainMenuMessage(customer.display_name ?? "คุณ")]);
  }

  if (action === "adm_menu") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_setup") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_status") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_wizard_start") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_wizard_more_service") {
    if (!userId) return;
    const session = await getAdminSession(userId);
    await grantAdminSession(userId);
    await setAdminWizardState(userId, "service_name", { ...(session?.wizard_payload ?? {}), flow: "service_batch" });
    return replyMessage(rt, [adminWizardProgressMessage({ title: "โหมดเพิ่มบริการ", currentStep: 4, totalSteps: 6, description: "ตอนนี้จะพาเพิ่มบริการต่อแบบเร็วๆ", savedItems: wizardSavedItems({ ...(session?.wizard_payload ?? {}), flow: "service_batch" }), breadcrumb: wizardBreadcrumb("service_name") }), wizardPromptForStepWithState("service_name", { ...(session?.wizard_payload ?? {}), flow: "service_batch" })]);
  }

  if (action === "adm_wizard_more_staff") {
    if (!userId) return;
    const session = await getAdminSession(userId);
    await grantAdminSession(userId);
    await setAdminWizardState(userId, "staff_name", { ...(session?.wizard_payload ?? {}), flow: "staff_batch" });
    return replyMessage(rt, [adminWizardProgressMessage({ title: "โหมดเพิ่มช่าง", currentStep: 5, totalSteps: 6, description: "ตอนนี้จะพาเพิ่มช่างต่อแบบเร็วๆ", savedItems: wizardSavedItems({ ...(session?.wizard_payload ?? {}), flow: "staff_batch" }), breadcrumb: wizardBreadcrumb("staff_name") }), wizardPromptForStepWithState("staff_name", { ...(session?.wizard_payload ?? {}), flow: "staff_batch" })]);
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
      return replyWizardNext(rt, "shop_address", session.wizard_payload ?? {}, "ข้ามเบอร์ร้านแล้ว");
    }
    if (session.wizard_step === "shop_address") {
      await setAdminWizardState(userId, "service_name", session.wizard_payload ?? {});
      return replyWizardNext(rt, "service_name", session.wizard_payload ?? {}, "ข้ามที่อยู่ร้านแล้ว");
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
    return replyWizardNext(rt, "hours_time", payload, `เลือกวัน${label}แล้ว`);
  }

  if (action === "adm_queue_today") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_revenue") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_logout") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_help_service") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_help_staff") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_help_shop") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_help_hours") {
    return handleAdminIntent(rt, action, userId);
  }

  if (action === "adm_help_staff_hours") {
    return handleAdminIntent(rt, action, userId);
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
    let rebookCtx: { serviceId: number; staffId: number | null; serviceName: string; staffName: string } | null = null;
    if (id) {
      // Load context before cancelling so we can offer a rebook CTA for the same setup.
      const { data: prev } = await db
        .from("bookings")
        .select("service_id, staff_id, service:services(name), staff:staff(nickname, name)")
        .eq("id", id)
        .eq("customer_id", customer.id)
        .maybeSingle();
      if (prev) {
        rebookCtx = {
          serviceId: prev.service_id,
          staffId: prev.staff_id,
          serviceName: (prev.service as any)?.name ?? "บริการ",
          staffName: (prev.staff as any)?.nickname ?? (prev.staff as any)?.name ?? "ช่างคนไหนก็ได้",
        };
      }
      await cancelBookingByCustomer(id, customer.id);
    }
    const messages: any[] = [textMessage("ยกเลิกคิวเรียบร้อย ✅")];
    if (rebookCtx) {
      messages.push(rebookCtaFlex(rebookCtx));
    }
    return replyMessage(rt, messages);
  }

  // ── Customer confirms attendance from 2h reminder Flex ──
  if (action === "confirm_attendance") {
    const id = Number(data.get("id"));
    if (!id) return replyMessage(rt, [textMessage("ไม่พบข้อมูลคิว")]);
    const { data: booking } = await db
      .from("bookings")
      .select("id, status")
      .eq("id", id)
      .eq("customer_id", customer.id)
      .maybeSingle();
    if (!booking) return replyMessage(rt, [textMessage("ไม่พบคิวนี้")]);
    if (booking.status === "cancelled" || booking.status === "no_show") {
      return replyMessage(rt, [textMessage("คิวนี้ถูกยกเลิกไปแล้ว")]);
    }
    // Mark a lightweight confirmation; reuse reminded_2h_at if not yet stamped
    await db.from("bookings").update({ status: "confirmed" }).eq("id", id);
    return replyMessage(rt, [textMessage("ขอบคุณค่ะ 🙏 ร้านรับทราบแล้ว เจอกันตามนัดนะคะ ✨")]);
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
    const { data: services } = await db.from("services").select("id").eq("shop_id", SHOP_ID).eq("active", true).limit(1);
    if (!services?.length) return replyMessage(rt, [textMessage("ยังไม่มีบริการในระบบ")]);
    return replyMessage(rt, [bookInLiffMessage()]);
  }

  if (action === "chat_prompt") {
    return replyMessage(rt, [textMessage(
      "พิมพ์มาได้เลยค่ะ เช่น “อยากจองตัดผมพรุ่งนี้ 14:00” หรือถามเรื่องร้านได้เลยนะ 😊",
      defaultQuickReply()
    )]);
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

  // ── AI Human Handoff ──
  if (action === "handoff_take") {
    if (!canAdmin) {
      return replyMessage(rt, [adminAuthPromptMessage()]);
    }
    const id = Number(data.get("id"));
    if (!id) return replyMessage(rt, [textMessage("ไม่พบเคส handoff")]);
    const ok = await takeHandoff(id, userId ?? "");
    if (!ok) return replyMessage(rt, [textMessage("รับเคสไม่สำเร็จ — เคสอาจถูกปิดแล้ว")]);
    return replyMessage(rt, [textMessage(`✋ รับเคส #${id} แล้ว — บอทหยุดตอบลูกค้าคนนี้จนกว่าจะกด "ปิดเคส"`)]);
  }
  if (action === "handoff_close") {
    if (!canAdmin) {
      return replyMessage(rt, [adminAuthPromptMessage()]);
    }
    const id = Number(data.get("id"));
    if (!id) return replyMessage(rt, [textMessage("ไม่พบเคส handoff")]);
    const closed = await closeHandoff(id, userId ?? "");
    if (!closed) return replyMessage(rt, [textMessage("ปิดเคสไม่สำเร็จ")]);
    // Notify the customer that the bot is active again
    try {
      await pushMessage(closed.line_user_id, [textMessage("ร้านปิดเคสแล้ว หากต้องการความช่วยเหลือเพิ่ม พิมพ์ได้เลยค่ะ 💬")]);
    } catch {}
    return replyMessage(rt, [textMessage(`✅ ปิดเคส #${id} แล้ว — บอทกลับมาตอบลูกค้าคนนี้ต่อได้`)]);
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

// ───────────────── image message handler ─────────────────

// Simple per-user cooldown: 1 vision request per 30 seconds to control cost.
const _visionLastAt = new Map<string, number>();

async function handleImageMessage(ev: any, customer: Customer) {
  const rt: string = ev.replyToken;
  const userId: string = ev.source?.userId;
  const messageId: string = ev.message?.id;

  if (process.env.AI_VISION_ENABLED === "false") {
    return replyMessage(rt, [textMessage("ขออภัยค่ะ ฟีเจอร์วิเคราะห์รูปยังไม่เปิดใช้งานในตอนนี้", defaultQuickReply())]);
  }

  const now = Date.now();
  const lastAt = _visionLastAt.get(userId) ?? 0;
  if (now - lastAt < 30_000) {
    return replyMessage(rt, [textMessage("กรุณารอสักครู่ก่อนส่งรูปใหม่นะคะ 🙏", defaultQuickReply())]);
  }
  _visionLastAt.set(userId, now);

  try { await startLoading(userId, 10); } catch {}

  const content = await getMessageContent(messageId);
  if (!content) {
    return replyMessage(rt, [textMessage("ขออภัยค่ะ ดาวน์โหลดรูปไม่สำเร็จ ลองส่งใหม่อีกครั้งนะคะ", defaultQuickReply())]);
  }

  let aiReply: string | null = null;
  try {
    aiReply = await askGLMWithImage(userId, content.buffer, content.contentType);
  } catch (err) {
    console.error("[line-webhook] askGLMWithImage threw", err);
  }

  if (aiReply) {
    return replyMessage(rt, [textMessage(aiReply, defaultQuickReply())]);
  }
  return replyMessage(rt, [textMessage(
    "ขออภัยค่ะ วิเคราะห์รูปไม่สำเร็จในขณะนี้ ลองส่งรูปอื่นหรือพิมพ์ถามมาได้เลยค่ะ ☺️",
    defaultQuickReply(),
  )]);
}

// ───────────────── image generation handler ─────────────────

// Max 3 image generations per user per hour to control cost.
const _imageGenUsage = new Map<string, { count: number; resetAt: number }>();

function isImageGenRateLimited(userId: string): boolean {
  const entry = _imageGenUsage.get(userId);
  if (!entry || Date.now() > entry.resetAt) return false;
  const limited = entry.count >= 3;
  if (limited) {
    console.warn("[image-gen] rate limited", { userId, count: entry.count, resetAt: new Date(entry.resetAt).toISOString() });
  }
  return limited;
}

function incrementImageGenUsage(userId: string): void {
  const entry = _imageGenUsage.get(userId);
  if (!entry || Date.now() > entry.resetAt) {
    _imageGenUsage.set(userId, { count: 1, resetAt: Date.now() + 3_600_000 });
  } else {
    entry.count += 1;
  }
}

async function handleImageGen(rt: string, prompt: string, userId: string) {
  if (process.env.AI_IMAGE_GEN_ENABLED === "false") {
    return replyMessage(rt, [textMessage("ขออภัยค่ะ ฟีเจอร์สร้างรูปยังไม่เปิดใช้งาน", defaultQuickReply())]);
  }

  if (isImageGenRateLimited(userId)) {
    return replyMessage(rt, [textMessage("ใช้งานฟีเจอร์สร้างรูปได้สูงสุด 3 ครั้ง/ชั่วโมงนะคะ ลองใหม่ในอีกสักครู่ค่ะ 🙏", defaultQuickReply())]);
  }

  const currentEntry = _imageGenUsage.get(userId);
  console.log("[image-gen] starting", { userId, currentCount: currentEntry?.count ?? 0, prompt: prompt.slice(0, 60) });

  try { await startLoading(userId, 15); } catch {}

  // Fetch shop name to use as style context
  const db = supabaseAdmin();
  const { data: shop } = await db.from("shops").select("name, business_type").eq("id", SHOP_ID).maybeSingle();
  const shopContext = shop?.name ? `ร้าน${shop.name}` : undefined;

  const genStart = Date.now();
  const result = await generateImage(prompt, shopContext);
  console.log("[image-gen] generateImage done", { userId, ok: result.ok, elapsedMs: Date.now() - genStart });

  if (!result.ok) {
    console.warn("[image-gen] failed", { userId, code: result.code, message: result.message });
    return replyMessage(rt, [textMessage(
      result.code === "not_configured"
        ? "ขออภัยค่ะ ฟีเจอร์สร้างรูปยังไม่ได้ตั้งค่า GEMINI_API_KEY"
        : "ขออภัยค่ะ สร้างรูปไม่สำเร็จในขณะนี้ ลองใหม่อีกครั้งนะคะ ☺️",
      defaultQuickReply(),
    )]);
  }

  incrementImageGenUsage(userId);
  console.log("[image-gen] incremented usage", { userId, newCount: (_imageGenUsage.get(userId)?.count ?? 0) });

  const imageUrl = await uploadGeneratedImage(result.imageBase64, result.mimeType, Number(SHOP_ID));
  if (!imageUrl) {
    return replyMessage(rt, [textMessage(
      "สร้างรูปสำเร็จแล้วค่ะ แต่อัพโหลดไม่สำเร็จ ลองใหม่อีกครั้งนะคะ ☺️",
      defaultQuickReply(),
    )]);
  }

  const messages: any[] = [
    { type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl },
  ];
  if (result.caption) {
    messages.push(textMessage(result.caption, defaultQuickReply()));
  } else {
    messages.push(textMessage("นี่คือตัวอย่างที่สร้างให้ค่ะ 🎨 ถ้าสนใจบริการนี้ พิมพ์ว่า 'จอง' ได้เลยค่ะ", defaultQuickReply()));
  }
  return replyMessage(rt, messages);
}

// ───────────────── message handler ─────────────────

async function handleMessage(ev: any, customer: Customer) {
  const text: string = ev.message.text.trim();
  const rt = ev.replyToken;
  const userId: string = ev.source?.userId;
  const db = supabaseAdmin();

  const suppliedPassword = extractAdminPassword(text);
  if (suppliedPassword !== null) {
    // Check password against the current shop's admin_users rows first.
    // Fall back to the global ADMIN_PASSWORD env var only when the shop has
    // no admin rows yet (legacy single-tenant mode).
    const { data: adminRows } = await db
      .from("admin_users")
      .select("password_hash")
      .eq("shop_id", SHOP_ID)
      .eq("active", true)
      .not("password_hash", "is", null);
    let ok = false;
    if (adminRows && adminRows.length > 0) {
      for (const u of adminRows) {
        if (u.password_hash && verifyPassword(suppliedPassword, u.password_hash)) {
          ok = true;
          break;
        }
      }
    } else {
      const expected = process.env.ADMIN_PASSWORD ?? "";
      if (!expected) return replyMessage(rt, [textMessage("ยังไม่ได้ตั้งรหัสผ่านแอดมินของร้าน — สร้าง admin_users แถวแรกก่อนนะคะ")]);
      ok = suppliedPassword === expected;
    }
    if (ok) {
      try {
        await grantAdminSession(userId);
      } catch (error: any) {
        return replyMessage(rt, [textMessage(`รหัสผ่านถูกต้อง แต่ระบบบันทึก session แอดมินไม่สำเร็จ: ${error?.message ?? "unknown error"}\nเช็ก schema ล่าสุดของ Supabase โดยเฉพาะตาราง line_admin_sessions ก่อน`)]);
      }
      const verified = await isAdminAuthorized(userId);
      if (!verified) {
        return replyMessage(rt, [textMessage("รหัสผ่านถูกต้อง แต่ระบบยืนยัน session แอดมินไม่ผ่าน ลองเช็ก schema ล่าสุดของ Supabase และ unique key ของ line_admin_sessions ก่อน")]);
      }
      const resumed = await maybeResumePendingAdminAction(rt, userId);
      if (resumed) return resumed;
      return replyMessage(rt, [adminAuthSuccessMessage(), adminMenuMessage()]);
    }
    return replyMessage(rt, [textMessage("รหัสแอดมินไม่ถูกต้อง ลองใหม่อีกครั้ง")]);
  }

  // ── AI Human Handoff: pause bot if customer has an open handoff session ──
  const openHandoff = await getOpenHandoff(userId);
  if (openHandoff) {
    // Log the latest message so admin can see context, but do not reply with bot.
    const db2 = supabaseAdmin();
    await db2
      .from("ai_handoff_sessions")
      .update({ last_message: text })
      .eq("id", openHandoff.id);
    // Silent — admin is handling this conversation.
    return;
  }

  // ── Check if admin ──
  const isAdmin = await isAdminAuthorized(userId);
  const adminSession = isAdmin ? await getAdminSession(userId) : null;
  const adminTextIntent = matchAdminTextIntent(text);

  if (isAdmin) {
    await touchAdminSession(userId);
  }

  if (adminTextIntent && !isAdmin) {
    if (userId) await rememberPendingAdminAction(userId, adminTextIntent);
    return replyMessage(rt, [adminTextIntent === "adm_menu" ? adminAuthPromptMessage() : adminAuthRecoveryMessage({ pendingLabel: ADMIN_RECOVERY_ACTIONS[adminTextIntent] })]);
  }

  if (isAdmin && adminTextIntent) {
    return handleAdminIntent(rt, adminTextIntent, userId);
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
      return replyMessage(rt, [adminWizardProgressMessage({ title: "ไปขั้นถัดไป", currentStep: nextStep === "shop_address" ? 3 : 4, totalSteps: 6, description: "ระบบรับรู้คำสั่งแล้ว", savedItems: wizardSavedItems(nextPayload), breadcrumb: wizardBreadcrumb(nextStep) }), wizardPromptForStepWithState(nextStep, nextPayload)]);
    }
    return handleAdminWizardInput(rt, userId, text, adminSession);
  }

  if (isAdmin) {
    const adminCmd = parseAdminCommand(text);
    if (adminCmd) {
      return handleAdminCommand(rt, adminCmd, userId);
    }
  }

  const route = await resolveAiRoute({ shopId: Number(SHOP_ID), text });

  if (route.kind === "booking_shortcut") {
    if (!route.services.length) return replyMessage(rt, [textMessage("ยังไม่มีบริการในระบบ")]);
    return replyMessage(rt, [bookInLiffMessage()]);
  }

  if (route.kind === "ai_booking") {
    return handleAIBooking(rt, route.intent, customer, route.services, route.staff);
  }

  if (route.kind === "keyword_bookings") {
    return replyMessage(rt, [textMessage("กดปุ่มด้านล่างเพื่อดูเวลานัดหมายของคุณได้เลยค่ะ 📅", defaultQuickReply())]);
  }

  if (route.kind === "keyword_profile") {
    return replyMessage(rt, [textMessage("กดปุ่มด้านล่างเพื่อดูโปรไฟล์และแต้มสะสมได้เลยค่ะ ⭐", defaultQuickReply())]);
  }

  if (route.kind === "keyword_cancel") {
    return replyMessage(rt, [textMessage("เปิดคิวของฉันเพื่อยกเลิกคิวได้เลยค่ะ 📋", defaultQuickReply())]);
  }

  if (route.kind === "services") {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
    return replyMessage(rt, [textMessage("ดูบริการและราคาทั้งหมดได้เลยค่ะ 👇", {
      items: [{ type: "action", action: { type: "uri", label: "🔍 ดูบริการ/ราคา", uri: `https://liff.line.me/${liffId}/services` } }],
    })]);
  }

  if (route.kind === "hours") {
    return replyMessage(rt, [textMessage(route.message, defaultQuickReply())]);
  }

  if (route.kind === "image_gen") {
    return handleImageGen(rt, route.prompt, userId);
  }

  if (route.kind === "handoff") {
    const session = await requestHandoff(customer.id, userId, text);
    if (session) {
      notifyAdminsOfHandoff(session, customer.full_name ?? customer.display_name ?? "ลูกค้า", customer.picture_url ?? null).catch((err) => {
        console.error("[handoff] notify admins error", err);
      });
    }
    return replyMessage(rt, [textMessage("รับทราบค่ะ 🙏 กำลังแจ้งพนักงานให้มาคุยกับคุณ ระหว่างรอ บอทจะหยุดตอบชั่วคราวนะคะ")]);
  }

  // ── Default: AI chat reply via Z.AI GLM ──
  try { await startLoading(userId, 5); } catch {} // show "..." only when AI is working
  const aiStartedAt = Date.now();
  let aiReply: string | null = null;
  try {
    aiReply = await askGLM(userId, text);
  } catch (err) {
    console.error("[line-webhook] askGLM threw", err);
  }
  const aiMs = Date.now() - aiStartedAt;
  if (aiMs >= 1500) {
    console.info("[line-webhook] ai fallback latency", {
      shopId: Number(SHOP_ID),
      userId,
      aiMs,
      gotReply: !!aiReply,
    });
  }
  if (aiReply) {
    return replyMessage(rt, [textMessage(aiReply as string, defaultQuickReply())]);
  }
  // AI failed — give a helpful fallback instead of generic "sorry"
  console.warn("[line-webhook] AI returned null, using smart fallback", { shopId: Number(SHOP_ID), userId, text });
  return replyMessage(rt, [textMessage(
    "ขออภัยค่ะ ตอนนี้ผู้ช่วยอัจฉริยะกำลังไม่สะดวก ลองกดเมนูด้านล่างเลือกบริการได้เลยค่ะ หรือโทรหาร้านก็ได้นะคะ ☎️",
    defaultQuickReply()
  )]);
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

  // MEDIUM confidence: have service but missing date → push to LIFF with service prefilled
  if (intent.serviceId && !intent.date) {
    const { data: service } = await db.from("services").select("name").eq("id", intent.serviceId).single();
    return replyMessage(rt, [bookInLiffMessage({
      variant: "ai-missing-date",
      serviceId: intent.serviceId,
      serviceName: service?.name ?? null,
      staffId: intent.staffId ?? null,
    })]);
  }

  // LOW confidence → short nudge + LIFF CTA (don't spam service carousel)
  return replyMessage(rt, [bookInLiffMessage({ variant: "ai-low" })]);
}

// ───────────────── Admin Setup Wizard ─────────────────

async function handleAdminWizardInput(rt: string, lineUserId: string, text: string, session: LineAdminSession) {
  const db = supabaseAdmin();
  const latestSession = await getAdminSession(lineUserId);
  const effectiveSession = latestSession?.wizard_step ? latestSession : session;
  const payload = (effectiveSession.wizard_payload ?? {}) as Record<string, any>;
  const flow = String(payload.flow ?? "full_setup");

  switch (effectiveSession.wizard_step as AdminWizardStep) {
    case "shop_name": {
      await db.from("shops").update({ name: text }).eq("id", SHOP_ID);
      await setAdminWizardState(lineUserId, "shop_phone", { ...payload, shopName: text });
      const nextPayload = { ...payload, shopName: text };
      return replyWizardNext(rt, "shop_phone", nextPayload, `✅ ตั้งชื่อร้านเป็น "${text}" แล้ว`);
    }

    case "shop_phone": {
      await db.from("shops").update({ phone: text }).eq("id", SHOP_ID);
      await setAdminWizardState(lineUserId, "shop_address", { ...payload, shopPhone: text });
      const nextPayload = { ...payload, shopPhone: text };
      return replyWizardNext(rt, "shop_address", nextPayload, `✅ บันทึกเบอร์ร้าน ${text} แล้ว`);
    }

    case "shop_address": {
      await db.from("shops").update({ address: text }).eq("id", SHOP_ID);
      await setAdminWizardState(lineUserId, "service_name", { ...payload, shopAddress: text });
      const nextPayload = { ...payload, shopAddress: text };
      return replyWizardNext(rt, "service_name", nextPayload, "✅ บันทึกที่อยู่ร้านแล้ว");
    }

    case "service_name": {
      await setAdminWizardState(lineUserId, "service_price", { ...payload, serviceName: text });
      const nextPayload = { ...payload, serviceName: text };
      return replyWizardNext(rt, "service_price", nextPayload, "รับชื่อบริการแล้ว");
    }

    case "service_price": {
      const price = Number(text.replace(/[^\d.]/g, ""));
      if (!Number.isFinite(price) || price <= 0) return replyMessage(rt, [textMessage("กรุณาใส่ราคาด้วยตัวเลข เช่น 250")]);
      await setAdminWizardState(lineUserId, "service_duration", { ...payload, servicePrice: price });
      const nextPayload = { ...payload, servicePrice: price };
      return replyWizardNext(rt, "service_duration", nextPayload, "รับราคาบริการแล้ว");
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
      return replyWizardNext(rt, "staff_name", nextPayload, `✅ เพิ่มบริการ "${serviceName}" แล้ว`);
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
      return replyWizardNext(rt, "hours_day", nextPayload, `✅ เพิ่มช่าง "${text}" แล้ว`);
    }

    case "hours_day": {
      return replyWizardNext(rt, "hours_day", payload, "เลือกวันก่อน");
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
        lifetime_points: ((current.customer as any)?.lifetime_points ?? 0) + earned,
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
