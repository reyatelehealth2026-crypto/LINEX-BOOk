import { NextResponse } from "next/server";
import { supabaseAdmin, getCurrentShopId } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reviews/summary
 * Returns aggregate review stats grouped by service and by staff for the shop:
 *   { by_service: [{ service_id, avg, count }], by_staff: [...], shop: { avg, count } }
 *
 * Used on the public services list and staff profile pages.
 */
export async function GET() {
  const shopId = await getCurrentShopId();
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("reviews")
    .select("service_id, staff_id, rating")
    .eq("shop_id", shopId);

  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({
        by_service: [],
        by_staff: [],
        shop: { avg: 0, count: 0 },
        table_missing: true,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const bySvc = new Map<number, { sum: number; count: number }>();
  const byStf = new Map<number, { sum: number; count: number }>();
  let sum = 0;

  for (const r of rows) {
    const rating = Number(r.rating);
    sum += rating;
    if (r.service_id) {
      const e = bySvc.get(r.service_id) ?? { sum: 0, count: 0 };
      e.sum += rating;
      e.count += 1;
      bySvc.set(r.service_id, e);
    }
    if (r.staff_id) {
      const e = byStf.get(r.staff_id) ?? { sum: 0, count: 0 };
      e.sum += rating;
      e.count += 1;
      byStf.set(r.staff_id, e);
    }
  }

  const round = (n: number) => Math.round(n * 10) / 10;

  return NextResponse.json({
    by_service: Array.from(bySvc.entries()).map(([service_id, { sum, count }]) => ({
      service_id,
      avg: round(sum / count),
      count,
    })),
    by_staff: Array.from(byStf.entries()).map(([staff_id, { sum, count }]) => ({
      staff_id,
      avg: round(sum / count),
      count,
    })),
    shop: {
      avg: rows.length ? round(sum / rows.length) : 0,
      count: rows.length,
    },
  });
}
