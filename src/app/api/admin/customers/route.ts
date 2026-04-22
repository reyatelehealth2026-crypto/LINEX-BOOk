import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/customers — list all customers with latest booking date
export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const sp = req.nextUrl.searchParams;
  const search = sp.get("q")?.trim() ?? "";

  let q = db
    .from("customers")
    .select(`
      id, shop_id, line_user_id, display_name, picture_url,
      full_name, phone, birthday, points, visit_count,
      registered_at, created_at
    `)
    .eq("shop_id", identity.shopId)
    .order("created_at", { ascending: false });

  if (search) {
    // Supabase PostgREST or/and on related fields is limited;
    // use ilike on known text columns, chain with or()
    q = q.or(
      `full_name.ilike.%${search}%,display_name.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch latest booking date per customer (one query)
  const customerIds = (data ?? []).map((c: { id: number }) => c.id);
  let latestMap: Record<number, string> = {};

  if (customerIds.length > 0) {
    const { data: bookings } = await db
      .from("bookings")
      .select("customer_id, starts_at")
      .in("customer_id", customerIds)
      .order("starts_at", { ascending: false });

    if (bookings && bookings.length > 0) {
      // Take first occurrence per customer (already sorted desc)
      for (const b of bookings as { customer_id: number; starts_at: string }[]) {
        if (!latestMap[b.customer_id]) {
          latestMap[b.customer_id] = b.starts_at;
        }
      }
    }
  }

  const customers = (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    latest_booking_at: latestMap[c.id as number] ?? null,
  }));

  return NextResponse.json({ customers });
}
