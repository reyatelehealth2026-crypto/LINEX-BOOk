import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { validateCoupon } from "@/lib/coupons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/coupons
 *   - ?validate=CODE&line_user_id=U...&service_id=N&price=N → public validation
 *   - (no params, admin auth)                               → list all coupons
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("validate");
  if (code) {
    const lineUserId = sp.get("line_user_id") ?? "";
    const serviceId = Number(sp.get("service_id"));
    const price = Number(sp.get("price"));
    if (!lineUserId || !serviceId || !Number.isFinite(price)) {
      return NextResponse.json({ error: "line_user_id, service_id, price required" }, { status: 400 });
    }
    const db = supabaseAdmin();
    const { data: customer } = await db
      .from("customers")
      .select("id")
      .eq("shop_id", SHOP_ID)
      .eq("line_user_id", lineUserId)
      .maybeSingle();
    if (!customer) return NextResponse.json({ valid: false, reason: "customer_not_found" });
    const result = await validateCoupon({ code, customerId: customer.id, serviceId, price });
    return NextResponse.json(result);
  }

  // Admin list
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("coupons")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data ?? [] });
}

/**
 * POST /api/coupons   (admin)
 * Create a new coupon.
 */
export async function POST(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) ?? {};
  const { code, name, kind, value, service_id, min_amount, max_uses, per_customer_limit, starts_at, expires_at } = body;

  if (!code || !name || !kind || value == null) {
    return NextResponse.json({ error: "code, name, kind, value required" }, { status: 400 });
  }
  if (!["percent", "amount", "free_service"].includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("coupons")
    .insert({
      shop_id: SHOP_ID,
      code: String(code).trim(),
      name,
      kind,
      value: Number(value),
      service_id: service_id ? Number(service_id) : null,
      min_amount: Number(min_amount ?? 0),
      max_uses: max_uses != null ? Number(max_uses) : null,
      per_customer_limit: Number(per_customer_limit ?? 1),
      starts_at: starts_at || null,
      expires_at: expires_at || null,
    })
    .select("*")
    .single();

  if (error) {
    const status = /duplicate|unique/i.test(error.message) ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ coupon: data }, { status: 201 });
}

/**
 * PATCH /api/coupons   (admin) — toggle active / update fields
 * Body: { id, active?, name?, expires_at? }
 */
export async function PATCH(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, ...updates } = (await req.json()) ?? {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("coupons")
    .update(updates)
    .eq("id", Number(id))
    .eq("shop_id", SHOP_ID)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupon: data });
}

/**
 * DELETE /api/coupons?id=N   (admin)
 */
export async function DELETE(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from("coupons").delete().eq("id", id).eq("shop_id", SHOP_ID);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
