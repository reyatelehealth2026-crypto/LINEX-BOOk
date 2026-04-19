import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw && pw === process.env.ADMIN_PASSWORD;
}

// GET /api/admin/customers/[id] — customer detail + booking timeline
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Re-extract req from closure — _req is the actual request
  const req = _req;
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  const { data: customer, error: cErr } = await db
    .from("customers")
    .select("*")
    .eq("shop_id", SHOP_ID)
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
    .eq("shop_id", SHOP_ID)
    .eq("customer_id", Number(id))
    .order("starts_at", { ascending: false });

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  return NextResponse.json({
    customer,
    bookings: bookings ?? [],
  });
}
