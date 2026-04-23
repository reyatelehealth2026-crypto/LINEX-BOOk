// Slot availability calculation.
// Given a target date, service duration, and staff, compute 15-min-granular
// free slots within the shop's working hours for that staff.
import { supabaseAdmin, getCurrentShopId } from "./supabase";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const TZ = process.env.SHOP_TIMEZONE || "Asia/Bangkok";
const GRANULARITY_MIN = 15;

export type Slot = { startIso: string; endIso: string; label: string };

export async function availableSlots(args: {
  dateYmd: string;          // '2026-04-20' (shop-local)
  serviceId: number;
  staffId?: number | null;  // null/undefined = any staff
}): Promise<Slot[]> {
  const shopId = await getCurrentShopId();
  const db = supabaseAdmin();

  const { data: service, error: svcErr } = await db
    .from("services")
    .select("id, duration_min, shop_id, active")
    .eq("id", args.serviceId)
    .eq("shop_id", shopId)
    .single();
  if (svcErr || !service || !service.active) return [];

  const duration = service.duration_min;

  // Resolve candidate staff
  let staffIds: (number | null)[] = [];
  if (args.staffId) {
    staffIds = [args.staffId];
  } else {
    const { data } = await db.from("staff").select("id").eq("shop_id", shopId).eq("active", true);
    staffIds = (data ?? []).map((r) => r.id as number);
    if (staffIds.length === 0) staffIds = [null]; // fallback: shop-wide slot
  }

  const [y, m, d] = args.dateYmd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  const { data: hours } = await db
    .from("working_hours")
    .select("staff_id, open_time, close_time")
    .eq("shop_id", shopId)
    .eq("day_of_week", dow);

  function hoursFor(staffId: number | null): Array<[string, string]> {
    const specific = (hours ?? []).filter((h) => h.staff_id === staffId);
    const fallback = (hours ?? []).filter((h) => h.staff_id === null);
    const src = specific.length ? specific : fallback;
    return src.map((h) => [h.open_time, h.close_time]);
  }

  // Day window in UTC
  const dayStart = fromZonedTime(`${args.dateYmd}T00:00:00`, TZ);
  const dayEnd = fromZonedTime(`${args.dateYmd}T23:59:59`, TZ);

  const { data: existing } = await db
    .from("bookings")
    .select("staff_id, starts_at, ends_at, status")
    .eq("shop_id", shopId)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString());

  const { data: offs } = await db
    .from("time_off")
    .select("staff_id, starts_at, ends_at")
    .eq("shop_id", shopId)
    .lte("starts_at", dayEnd.toISOString())
    .gte("ends_at", dayStart.toISOString());

  const slotSet = new Set<string>();

  for (const sid of staffIds) {
    for (const [openT, closeT] of hoursFor(sid)) {
      const open = fromZonedTime(`${args.dateYmd}T${openT}`, TZ);
      const close = fromZonedTime(`${args.dateYmd}T${closeT}`, TZ);
      const now = new Date();

      for (
        let t = new Date(Math.max(open.getTime(), roundUp(now, GRANULARITY_MIN).getTime()));
        t.getTime() + duration * 60_000 <= close.getTime();
        t = new Date(t.getTime() + GRANULARITY_MIN * 60_000)
      ) {
        const slotStart = new Date(t);
        const slotEnd = new Date(t.getTime() + duration * 60_000);

        if (conflicts(existing ?? [], sid, slotStart, slotEnd)) continue;
        if (isTimeOff(offs ?? [], sid, slotStart, slotEnd)) continue;

        slotSet.add(slotStart.toISOString());
      }
    }
  }

  const sorted = Array.from(slotSet).sort();
  return sorted.map((iso) => {
    const start = new Date(iso);
    const end = new Date(start.getTime() + duration * 60_000);
    const zoned = toZonedTime(start, TZ);
    const hh = String(zoned.getHours()).padStart(2, "0");
    const mm = String(zoned.getMinutes()).padStart(2, "0");
    return { startIso: start.toISOString(), endIso: end.toISOString(), label: `${hh}:${mm}` };
  });
}

function roundUp(d: Date, minutes: number) {
  const ms = minutes * 60_000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

function conflicts(
  list: Array<{ staff_id: number | null; starts_at: string; ends_at: string }>,
  staffId: number | null,
  a: Date,
  b: Date
) {
  if (staffId == null) return false;
  return list.some(
    (r) =>
      r.staff_id === staffId &&
      new Date(r.starts_at) < b &&
      new Date(r.ends_at) > a
  );
}

function isTimeOff(
  list: Array<{ staff_id: number | null; starts_at: string; ends_at: string }>,
  staffId: number | null,
  a: Date,
  b: Date
) {
  return list.some((r) => {
    if (r.staff_id !== null && r.staff_id !== staffId) return false;
    return new Date(r.starts_at) < b && new Date(r.ends_at) > a;
  });
}

/**
 * Bucket slots to coarse per-hour availability (e.g. 10:00, 11:00, 12:00 ...).
 * For each hour in the shop's working window, if *any* 15-min slot within that
 * hour is available for the given service+staff, the hour is marked available
 * and the first available startIso is returned for booking.
 *
 * This matches the product direction: customers don't pick a 15-min slot,
 * they pick an hour bucket ("10 โมงว่าง / 11 โมงไม่ว่าง").
 */
/**
 * Find free slots on nearby dates when the requested date is full / inconvenient.
 * Searches up to `daysAhead` forward, returning the first slot (by time) on each
 * day that has availability.
 */
export async function nearbySlotSuggestions(args: {
  fromDateYmd: string;
  serviceId: number;
  staffId?: number | null;
  daysAhead?: number;
  maxResults?: number;
}): Promise<Array<{ dateYmd: string; slot: Slot }>> {
  const daysAhead = args.daysAhead ?? 7;
  const maxResults = args.maxResults ?? 3;
  const [y, m, d] = args.fromDateYmd.split("-").map(Number);
  const out: Array<{ dateYmd: string; slot: Slot }> = [];
  for (let offset = 1; offset <= daysAhead && out.length < maxResults; offset++) {
    const next = new Date(Date.UTC(y, m - 1, d + offset));
    const ymd = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
    const slots = await availableSlots({ dateYmd: ymd, serviceId: args.serviceId, staffId: args.staffId });
    if (slots.length > 0) {
      out.push({ dateYmd: ymd, slot: slots[0] });
    }
  }
  return out;
}

/**
 * Compute popularity score per hour-of-day from historical bookings (last N days).
 * Returns a map {0..23 → count}. Used to highlight "popular times" on date picker.
 */
export async function popularTimesByHour(args: {
  serviceId?: number | null;
  lookbackDays?: number;
}): Promise<Record<number, number>> {
  const shopId = await getCurrentShopId();
  const db = supabaseAdmin();
  const lookback = args.lookbackDays ?? 60;
  const since = new Date(Date.now() - lookback * 86400_000).toISOString();
  let q = db
    .from("bookings")
    .select("starts_at, service_id")
    .eq("shop_id", shopId)
    .in("status", ["confirmed", "completed"])
    .gte("starts_at", since);
  if (args.serviceId) q = q.eq("service_id", args.serviceId);
  const { data } = await q;
  const counts: Record<number, number> = {};
  for (const r of data ?? []) {
    const zoned = toZonedTime(new Date(r.starts_at), TZ);
    const h = zoned.getHours();
    counts[h] = (counts[h] ?? 0) + 1;
  }
  return counts;
}

export type HourBucket = {
  hour: number;          // 0-23
  label: string;         // "10:00"
  periodLabel: string;   // "เช้า" | "บ่าย" | "เย็น"
  available: boolean;
  startIso: string | null;
  endIso: string | null;
};

export async function hourlyAvailability(args: {
  dateYmd: string;
  serviceId: number;
  staffId?: number | null;
}): Promise<HourBucket[]> {
  const slots = await availableSlots(args);

  // Compute working-hour window from the slots themselves (if empty, fall back to 9–20).
  // We also look at the shop's working_hours so we show hours that exist in the schedule
  // but are fully booked (available=false).
  const shopId = await getCurrentShopId();
  const db = supabaseAdmin();
  const [y, m, d] = args.dateYmd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const { data: hours } = await db
    .from("working_hours")
    .select("staff_id, open_time, close_time")
    .eq("shop_id", shopId)
    .eq("day_of_week", dow);

  // Candidate staff filter
  let allowedStaff: Set<number | null> | null = null;
  if (args.staffId) {
    allowedStaff = new Set([args.staffId]);
  }

  let earliest = 24;
  let latest = 0;
  for (const h of hours ?? []) {
    if (allowedStaff && h.staff_id !== null && !allowedStaff.has(h.staff_id)) continue;
    const [oh] = h.open_time.split(":").map(Number);
    const [ch, cm] = h.close_time.split(":").map(Number);
    earliest = Math.min(earliest, oh);
    const close = cm > 0 ? ch + 1 : ch;
    latest = Math.max(latest, close);
  }
  if (earliest === 24) { earliest = 9; latest = 20; }

  // Index available slots by hour (local shop TZ)
  const byHour = new Map<number, { startIso: string; endIso: string }[]>();
  for (const s of slots) {
    const zoned = toZonedTime(new Date(s.startIso), TZ);
    const h = zoned.getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push({ startIso: s.startIso, endIso: s.endIso });
  }

  const result: HourBucket[] = [];
  for (let h = earliest; h < latest; h++) {
    const list = byHour.get(h) ?? [];
    const first = list[0];
    result.push({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      periodLabel: h < 12 ? "เช้า" : h < 17 ? "บ่าย" : "เย็น",
      available: list.length > 0,
      startIso: first?.startIso ?? null,
      endIso: first?.endIso ?? null
    });
  }
  return result;
}
