import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/customers/[id] — customer detail + booking timeline
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = supabaseAdmin();

  const { data: customer, error: cErr } = await db
    .from("customers")
    .select("*")
    .eq("shop_id", identity.shopId)
    .eq("id", Number(id))
    .single();

  if (cErr || !customer) {
    return NextResponse.json({ error: "customer not found" }, { status: 404 });
  }

  // Booking timeline: all bookings for this customer, newest first
  const { data: bookings, error: bErr } = await db
    .from("bookings")
    .select(
      `id, starts_at, ends_at, status, price, points_earned, note, created_at, updated_at,
       service:services(id, name, name_en, duration_min, price),
       staff:staff(id, name, nickname)`
    )
    .eq("shop_id", identity.shopId)
    .eq("customer_id", Number(id))
    .order("starts_at", { ascending: false });

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  return NextResponse.json({
    customer,
    bookings: bookings ?? [],
  });
}
