import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- row types ---------- */
interface BookingRow {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number;
  service: { id: number; name: string } | null;
  staff: { id: number; name: string; nickname: string | null } | null;
  customer: {
    id: number;
    display_name: string | null;
    full_name: string | null;
    phone: string | null;
    picture_url: string | null;
    line_user_id: string;
  } | null;
}

interface LightBookingRow {
  id: number;
  status: string;
  price: number;
  starts_at: string;
}

export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const shopId = identity.shopId;

  const db = supabaseAdmin();
  const tz = "Asia/Bangkok";

  // --- Today's range in Bangkok timezone ---
  const now = new Date();
  const todayStr = now.toLocaleDateString("sv-SE", { timeZone: tz }); // YYYY-MM-DD
  const dayStart = new Date(`${todayStr}T00:00:00+07:00`).toISOString();
  const dayEnd = new Date(`${todayStr}T23:59:59+07:00`).toISOString();

  // --- This week (Mon-Sun) ---
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const mondayStr = monday.toLocaleDateString("sv-SE", { timeZone: tz });
  const weekStart = new Date(`${mondayStr}T00:00:00+07:00`).toISOString();
  const weekEnd = dayEnd;

  // --- Fetch today's bookings with joins ---
  const { data: todayBookings, error: todayErr } = await db
    .from("bookings")
    .select(
      "id, starts_at, ends_at, status, price, service:services(id, name), staff:staff(id, name, nickname), customer:customers(id, display_name, full_name, phone, picture_url, line_user_id)"
    )
    .eq("shop_id", shopId)
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd)
    .order("starts_at", { ascending: true });

  if (todayErr) return NextResponse.json({ error: todayErr.message }, { status: 500 });

  // Cast to our row type
  const todayRows = (todayBookings ?? []) as unknown as BookingRow[];

  // --- Fetch week's bookings (lighter, for counts only) ---
  const { data: weekBookings } = await db
    .from("bookings")
    .select("id, status, price, starts_at")
    .eq("shop_id", shopId)
    .gte("starts_at", weekStart)
    .lte("starts_at", weekEnd);

  const weekRows = (weekBookings ?? []) as unknown as LightBookingRow[];

  // --- Total customers count ---
  const { count: totalCustomers } = await db
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId);

  // --- Active services & staff counts ---
  const { count: activeServices } = await db
    .from("services")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("active", true);

  const { count: activeStaff } = await db
    .from("staff")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("active", true);

  // --- Compute today stats ---
  const todayStatusCounts: Record<string, number> = {};
  let todayRevenue = 0;
  let todayEstimatedRevenue = 0;
  const serviceBreakdown: Record<string, { name: string; count: number; revenue: number }> = {};
  const staffBreakdown: Record<string, { name: string; count: number }> = {};

  for (const b of todayRows) {
    todayStatusCounts[b.status] = (todayStatusCounts[b.status] ?? 0) + 1;

    const price = Number(b.price ?? 0);
    if (b.status === "completed") {
      todayRevenue += price;
      todayEstimatedRevenue += price;
    } else if (b.status === "confirmed" || b.status === "pending") {
      todayEstimatedRevenue += price;
    }

    const svcName = b.service?.name ?? "ไม่ระบุ";
    if (!serviceBreakdown[svcName]) serviceBreakdown[svcName] = { name: svcName, count: 0, revenue: 0 };
    serviceBreakdown[svcName].count++;
    if (b.status === "completed") serviceBreakdown[svcName].revenue += price;

    const staffName = b.staff?.nickname ?? b.staff?.name ?? "ไม่ระบุช่าง";
    if (!staffBreakdown[staffName]) staffBreakdown[staffName] = { name: staffName, count: 0 };
    staffBreakdown[staffName].count++;
  }

  // --- Compute week stats ---
  const weekStatusCounts: Record<string, number> = {};
  let weekRevenue = 0;
  for (const b of weekRows) {
    weekStatusCounts[b.status] = (weekStatusCounts[b.status] ?? 0) + 1;
    if (b.status === "completed") weekRevenue += Number(b.price ?? 0);
  }

  // --- Upcoming bookings (not yet started, not cancelled/no_show) ---
  const nowIso = now.toISOString();
  const upcoming = todayRows
    .filter(b => b.starts_at > nowIso && !["cancelled", "no_show"].includes(b.status))
    .slice(0, 5);

  return NextResponse.json({
    today: {
      date: todayStr,
      total: todayRows.length,
      statusCounts: todayStatusCounts,
      revenue: todayRevenue,
      estimatedRevenue: todayEstimatedRevenue,
      serviceBreakdown: Object.values(serviceBreakdown).sort((a, b) => b.count - a.count),
      staffBreakdown: Object.values(staffBreakdown).sort((a, b) => b.count - a.count),
      upcoming,
    },
    week: {
      total: weekRows.length,
      statusCounts: weekStatusCounts,
      revenue: weekRevenue,
    },
    shop: {
      totalCustomers: totalCustomers ?? 0,
      activeServices: activeServices ?? 0,
      activeStaff: activeStaff ?? 0,
    },
  });
}
