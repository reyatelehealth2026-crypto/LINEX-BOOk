import { supabaseAdmin } from "@/lib/supabase";
import { detectHandoffIntent, parseBookingIntent, type BookingIntent } from "@/lib/thai-nlp";
import type { Service, Staff } from "@/types/db";

type CacheEntry<T> = {
  value: T;
  at: number;
};

type ActiveCatalog = {
  services: Array<Pick<Service, "id" | "name" | "name_en" | "duration_min" | "price">>;
  staff: Array<Pick<Staff, "id" | "name" | "nickname">>;
};

type HoursSummary = {
  message: string;
};

export type AiRouteDecision =
  | { kind: "booking_shortcut"; services: ActiveCatalog["services"] }
  | { kind: "ai_booking"; intent: BookingIntent; services: ActiveCatalog["services"]; staff: ActiveCatalog["staff"] }
  | { kind: "keyword_bookings" }
  | { kind: "keyword_profile" }
  | { kind: "keyword_cancel" }
  | { kind: "services" }
  | { kind: "hours"; message: string }
  | { kind: "image_gen"; prompt: string }
  | { kind: "handoff" }
  | { kind: "ai_fallback" };

const CATALOG_CACHE_TTL_MS = 60_000;
const HOURS_CACHE_TTL_MS = 60_000;

const activeCatalogCache = new Map<number, CacheEntry<ActiveCatalog>>();
const hoursSummaryCache = new Map<number, CacheEntry<HoursSummary>>();

function getCached<T>(cache: Map<number, CacheEntry<T>>, key: number, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached<T>(cache: Map<number, CacheEntry<T>>, key: number, value: T) {
  cache.set(key, { value, at: Date.now() });
}

export function invalidateAiRouterCache(shopId?: number) {
  if (typeof shopId === "number") {
    activeCatalogCache.delete(shopId);
    hoursSummaryCache.delete(shopId);
    return;
  }
  activeCatalogCache.clear();
  hoursSummaryCache.clear();
}

async function getActiveCatalog(shopId: number): Promise<ActiveCatalog> {
  const cached = getCached(activeCatalogCache, shopId, CATALOG_CACHE_TTL_MS);
  if (cached) return cached;

  const db = supabaseAdmin();
  const [servicesRes, staffRes] = await Promise.all([
    db.from("services").select("id, name, name_en, duration_min, price").eq("shop_id", shopId).eq("active", true),
    db.from("staff").select("id, name, nickname").eq("shop_id", shopId).eq("active", true),
  ]);

  const catalog: ActiveCatalog = {
    services: (servicesRes.data ?? []) as ActiveCatalog["services"],
    staff: (staffRes.data ?? []) as ActiveCatalog["staff"],
  };

  setCached(activeCatalogCache, shopId, catalog);
  return catalog;
}

async function getHoursSummary(shopId: number): Promise<HoursSummary> {
  const cached = getCached(hoursSummaryCache, shopId, HOURS_CACHE_TTL_MS);
  if (cached) return cached;

  const db = supabaseAdmin();
  const [shopRes, hoursRes] = await Promise.all([
    db.from("shops").select("name, phone").eq("id", shopId).maybeSingle(),
    db.from("working_hours").select("day_of_week, open_time, close_time").eq("shop_id", shopId).is("staff_id", null).order("day_of_week"),
  ]);

  const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const lines = (hoursRes.data ?? []).map((h: any) => {
    const open = String(h.open_time).slice(0, 5);
    const close = String(h.close_time).slice(0, 5);
    return `วัน${days[h.day_of_week]}. ${open}-${close}`;
  });
  const body = lines.length ? lines.join("\n") : "ยังไม่ได้ตั้งเวลาทำการในระบบ";
  const shopName = shopRes.data?.name ?? "ร้าน";
  const phone = shopRes.data?.phone ? `\n📞 ${shopRes.data.phone}` : "";

  const summary = { message: `⏰ เวลาทำการ ${shopName}\n${body}${phone}` };
  setCached(hoursSummaryCache, shopId, summary);
  return summary;
}

export async function resolveAiRoute(params: { shopId: number; text: string }): Promise<AiRouteDecision> {
  const { shopId, text } = params;
  const trimmed = text.trim();

  const catalog = await getActiveCatalog(shopId);

  if (/^(จอง|จองคิว|book|booking)$/i.test(trimmed)) {
    return { kind: "booking_shortcut", services: catalog.services };
  }

  const intent = parseBookingIntent(trimmed, catalog.services, catalog.staff);
  if (intent && intent.confidence !== "low") {
    return { kind: "ai_booking", intent, services: catalog.services, staff: catalog.staff };
  }

  if (/คิว|บุ๊ค|queue/i.test(trimmed)) {
    return { kind: "keyword_bookings" };
  }
  if (/แต้ม|point|profile|โปรไฟล์/i.test(trimmed)) {
    return { kind: "keyword_profile" };
  }
  if (/ยกเลิก|cancel/i.test(trimmed)) {
    return { kind: "keyword_cancel" };
  }
  if (/^(?:ดูบริการ|เมนูบริการ|list service|รายการบริการ)$/i.test(trimmed)) {
    return { kind: "services" };
  }

  if (/(?:เปิด(?:กี่โมง|ตอน[กก]ี่|วันไหน)|ปิดกี่โมง|เวลาทำการ|เวลาเปิดปิด|opening hours|hours)/i.test(trimmed)) {
    const hours = await getHoursSummary(shopId);
    return { kind: "hours", message: hours.message };
  }

  // image_gen: สร้างรูป/ภาพ/ตัวอย่าง/AI, วาด, ออกแบบ/สไตล์, ดีไซน์, ขอรูป, อยากเห็นแบบ, มีดีไซน์ไหน, เล็บแบบไหน, ทรงผมแบบ, สปาสไตล์, โชว์รูป, AI วาด/สร้าง, render
  // Booking signal guard: if text also contains จอง|นัด|booking, booking intent already matched above — skip image_gen.
  const hasBookingSignal = /จอง|นัด|booking/i.test(trimmed);
  if (
    !hasBookingSignal &&
    /(?:สร้าง(?:รูป|ภาพ|ตัวอย่าง|AI)|วาด(?:รูป|ภาพ|ให้|หน่อย)?|ออกแบบ(?:เล็บ|ทรง|ผม|รูป|ภาพ|สไตล์)?|ดีไซน์(?:เล็บ|ทรง|ผม|รูป|ภาพ)?|เจน(?:รูป|ภาพ)|เจนเนอร์เรท|gen(?:erate)?\s*(?:รูป|ภาพ|image|img|pic)?|(?:รูป|ภาพ)ตัวอย่าง|ตัวอย่าง(?:เล็บ|ทรงผม|รูป|ภาพ)|ขอ(?:รูป|ภาพ|ตัวอย่าง|pic|image)|อยาก(?:เห็น|ดู)(?:แบบ|รูป|ภาพ|ตัวอย่าง)|มี(?:แบบ|ดีไซน์|รูป|ภาพ)ไหน|เล็บแบบไหน|ทรงผมแบบ|สปาสไตล์|โชว์(?:รูป|ภาพ)|ทำ(?:รูป|ภาพ)(?:ให้)?|AI\s*(?:วาด|สร้าง|generate|gen)|banana\b|nano\s*banana|dalle\b|imagen\b|preview.*(?:เล็บ|ทรง|ผม|nail|hair)|create.*image|draw.*(?:nail|hair|เล็บ|ทรง|me\b|a\b|an\b)|\bimagine\b|\brender\b|\bpicture\b|\bphoto\b)/i.test(trimmed)
  ) {
    return { kind: "image_gen", prompt: trimmed };
  }

  if (detectHandoffIntent(trimmed)) {
    return { kind: "handoff" };
  }

  return { kind: "ai_fallback" };
}
