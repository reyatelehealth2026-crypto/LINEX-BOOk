// analytics.ts — Admin dashboard aggregates + customer segmentation + forecasting.
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export type Segment = "new" | "returning" | "at_risk" | "vip";

export interface CustomerWithStats {
  id: number;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  lifetime_points: number;
  visit_count: number;
  last_visit: string | null;
  total_spent: number;
  segment: Segment;
}

const DAY_MS = 86400_000;

function classifySegment(stats: {
  visitCount: number;
  lastVisit: Date | null;
  totalSpent: number;
}): Segment {
  const { visitCount, lastVisit, totalSpent } = stats;
  const daysSinceLast = lastVisit ? (Date.now() - lastVisit.getTime()) / DAY_MS : Infinity;

  if (visitCount >= 10 || totalSpent >= 10_000) return "vip";
  if (visitCount <= 1) return "new";
  if (daysSinceLast > 60) return "at_risk";
  return "returning";
}

/**
 * Compute per-customer stats (visit count, last visit, total spent) and attach a segment.
 */
export async function customerSegments(limit = 500): Promise<CustomerWithStats[]> {
  const db = supabaseAdmin();
  const { data: customers } = await db
    .from("customers")
    .select("id, full_name, display_name, phone, visit_count, lifetime_points")
    .eq("shop_id", SHOP_ID)
    .limit(limit);
  const ids = (customers ?? []).map((c: any) => c.id);
  if (ids.length === 0) return [];

  const { data: bookings } = await db
    .from("bookings")
    .select("customer_id, starts_at, status, price")
    .eq("shop_id", SHOP_ID)
    .in("customer_id", ids)
    .in("status", ["confirmed", "completed"]);

  const stats = new Map<number, { lastVisit: Date | null; totalSpent: number }>();
  for (const b of bookings ?? []) {
    const existing = stats.get(b.customer_id as number) ?? { lastVisit: null, totalSpent: 0 };
    const d = new Date(b.starts_at);
    if (!existing.lastVisit || d > existing.lastVisit) existing.lastVisit = d;
    if (b.status === "completed") existing.totalSpent += Number(b.price ?? 0);
    stats.set(b.customer_id as number, existing);
  }

  return (customers ?? []).map((c: any) => {
    const s = stats.get(c.id) ?? { lastVisit: null, totalSpent: 0 };
    return {
      id: c.id,
      full_name: c.full_name,
      display_name: c.display_name,
      phone: c.phone,
      lifetime_points: c.lifetime_points ?? 0,
      visit_count: c.visit_count ?? 0,
      last_visit: s.lastVisit?.toISOString() ?? null,
      total_spent: s.totalSpent,
      segment: classifySegment({ visitCount: c.visit_count ?? 0, lastVisit: s.lastVisit, totalSpent: s.totalSpent }),
    };
  });
}

/**
 * Shop-level KPIs: revenue, bookings, no-show rate, avg LTV, retention rate.
 */
export async function shopKPIs(options?: { days?: number }) {
  const db = supabaseAdmin();
  const days = options?.days ?? 30;
  const since = new Date(Date.now() - days * DAY_MS).toISOString();

  const [{ data: bookings }, { data: customers }, { count: totalCustomers }] = await Promise.all([
    db.from("bookings").select("id, starts_at, ends_at, status, price, customer_id, service_id, staff_id").eq("shop_id", SHOP_ID).gte("starts_at", since),
    db.from("customers").select("id, visit_count").eq("shop_id", SHOP_ID),
    db.from("customers").select("id", { count: "exact", head: true }).eq("shop_id", SHOP_ID),
  ]);

  const list = bookings ?? [];
  const completed = list.filter((b: any) => b.status === "completed");
  const noShow = list.filter((b: any) => b.status === "no_show").length;
  const cancelled = list.filter((b: any) => b.status === "cancelled").length;
  const totalBookings = list.length;
  const revenue = completed.reduce((s: number, b: any) => s + Number(b.price ?? 0), 0);
  const noShowRate = totalBookings ? noShow / totalBookings : 0;
  const cancelRate = totalBookings ? cancelled / totalBookings : 0;

  const repeatCustomers = (customers ?? []).filter((c: any) => (c.visit_count ?? 0) >= 2).length;
  const retentionRate = (totalCustomers ?? 0) ? repeatCustomers / (totalCustomers ?? 1) : 0;

  // LTV: sum of all completed booking prices / total customers
  const { data: allCompleted } = await db
    .from("bookings")
    .select("price, customer_id")
    .eq("shop_id", SHOP_ID)
    .eq("status", "completed");
  const totalLTV = (allCompleted ?? []).reduce((s: number, b: any) => s + Number(b.price ?? 0), 0);
  const avgLTV = (totalCustomers ?? 0) ? totalLTV / (totalCustomers ?? 1) : 0;

  // Group by service + staff
  const byService = new Map<number, { count: number; revenue: number }>();
  const byStaff = new Map<number | null, { count: number; revenue: number }>();
  const byDayOfWeek: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const b of completed as any[]) {
    const sv = byService.get(b.service_id) ?? { count: 0, revenue: 0 };
    sv.count++; sv.revenue += Number(b.price ?? 0);
    byService.set(b.service_id, sv);
    const sk = b.staff_id ?? null;
    const st = byStaff.get(sk) ?? { count: 0, revenue: 0 };
    st.count++; st.revenue += Number(b.price ?? 0);
    byStaff.set(sk, st);
    byDayOfWeek[new Date(b.starts_at).getDay()]++;
  }

  return {
    window_days: days,
    total_customers: totalCustomers ?? 0,
    total_bookings: totalBookings,
    completed: completed.length,
    no_show: noShow,
    cancelled,
    revenue,
    no_show_rate: Number(noShowRate.toFixed(3)),
    cancel_rate: Number(cancelRate.toFixed(3)),
    retention_rate: Number(retentionRate.toFixed(3)),
    avg_ltv: Math.round(avgLTV),
    by_service: Array.from(byService.entries()).map(([service_id, v]) => ({ service_id, ...v })),
    by_staff: Array.from(byStaff.entries()).map(([staff_id, v]) => ({ staff_id, ...v })),
    by_day_of_week: byDayOfWeek,
  };
}

/**
 * Simple demand forecast: for each day-of-week over the last N days, returns the
 * average # of bookings per day. Used to flag "likely busy" days in admin UI.
 */
export async function demandForecast(lookbackDays = 60) {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - lookbackDays * DAY_MS).toISOString();
  const { data } = await db
    .from("bookings")
    .select("starts_at")
    .eq("shop_id", SHOP_ID)
    .in("status", ["confirmed", "completed"])
    .gte("starts_at", since);

  const countsByDateKey = new Map<string, number>();
  const dowSet: Record<number, Set<string>> = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set() };

  for (const b of data ?? []) {
    const d = new Date(b.starts_at);
    const key = d.toISOString().slice(0, 10);
    countsByDateKey.set(key, (countsByDateKey.get(key) ?? 0) + 1);
    dowSet[d.getDay()].add(key);
  }

  const avgByDow: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (let dow = 0; dow < 7; dow++) {
    const dates = dowSet[dow];
    let total = 0;
    for (const k of dates) total += countsByDateKey.get(k) ?? 0;
    avgByDow[dow] = dates.size ? Number((total / dates.size).toFixed(1)) : 0;
  }

  // Next 7 days prediction
  const predictions: Array<{ date: string; dow: number; expected: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * DAY_MS);
    predictions.push({
      date: d.toISOString().slice(0, 10),
      dow: d.getDay(),
      expected: avgByDow[d.getDay()],
    });
  }

  return { avg_by_dow: avgByDow, next_7_days: predictions, lookback_days: lookbackDays };
}

/**
 * Smart staff assignment: pick the staff with the LEAST bookings in the target
 * window. Falls back to any available staff.
 */
export async function suggestLeastBusyStaff(args: {
  serviceId: number;
  dateYmd: string;
}): Promise<{ staffId: number | null; workloadByStaff: Record<number, number> }> {
  const db = supabaseAdmin();
  const { data: eligible } = await db
    .from("staff_services")
    .select("staff_id, staff:staff!inner(id, shop_id, active)")
    .eq("service_id", args.serviceId);
  const candidateIds = (eligible ?? [])
    .map((r: any) => r.staff)
    .filter((s: any) => s && s.shop_id === SHOP_ID && s.active)
    .map((s: any) => s.id as number);
  if (candidateIds.length === 0) return { staffId: null, workloadByStaff: {} };

  const dayStart = new Date(`${args.dateYmd}T00:00:00+07:00`).toISOString();
  const dayEnd = new Date(`${args.dateYmd}T23:59:59+07:00`).toISOString();
  const { data: bookings } = await db
    .from("bookings")
    .select("staff_id")
    .eq("shop_id", SHOP_ID)
    .in("status", ["pending", "confirmed", "completed"])
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd)
    .in("staff_id", candidateIds);

  const workload: Record<number, number> = {};
  for (const id of candidateIds) workload[id] = 0;
  for (const b of bookings ?? []) {
    if (b.staff_id != null) workload[b.staff_id as number] = (workload[b.staff_id as number] ?? 0) + 1;
  }

  // Pick staff with min count; ties broken by lower id for stability
  const sorted = candidateIds.sort((a, b) => (workload[a] - workload[b]) || (a - b));
  return { staffId: sorted[0] ?? null, workloadByStaff: workload };
}
