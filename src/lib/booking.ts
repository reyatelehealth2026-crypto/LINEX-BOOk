// Slot availability calculation.
// Given a target date, service duration, and staff, compute 15-min-granular
// free slots within the shop's working hours for that staff.
import { supabaseAdmin, SHOP_ID } from "./supabase";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const TZ = process.env.SHOP_TIMEZONE || "Asia/Bangkok";
const GRANULARITY_MIN = 15;

export type Slot = { startIso: string; endIso: string; label: string };

export async function availableSlots(args: {
  dateYmd: string;          // '2026-04-20' (shop-local)
  serviceId: number;
  staffId?: number | null;  // null/undefined = any staff
}): Promise<Slot[]> {
  const db = supabaseAdmin();

  const { data: service, error: svcErr } = await db
    .from("services")
    .select("id, duration_min, shop_id, active")
    .eq("id", args.serviceId)
    .single();
  if (svcErr || !service || !service.active) return [];

  const duration = service.duration_min;

  // Resolve candidate staff
  let staffIds: (number | null)[] = [];
  if (args.staffId) {
    staffIds = [args.staffId];
  } else {
    const { data } = await db.from("staff").select("id").eq("shop_id", SHOP_ID).eq("active", true);
    staffIds = (data ?? []).map((r) => r.id as number);
    if (staffIds.length === 0) staffIds = [null]; // fallback: shop-wide slot
  }

  const [y, m, d] = args.dateYmd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  const { data: hours } = await db
    .from("working_hours")
    .select("staff_id, open_time, close_time")
    .eq("shop_id", SHOP_ID)
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
    .eq("shop_id", SHOP_ID)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString());

  const { data: offs } = await db
    .from("time_off")
    .select("staff_id, starts_at, ends_at")
    .eq("shop_id", SHOP_ID)
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
