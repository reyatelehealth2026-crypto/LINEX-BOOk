import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, invalidateShopCache } from "@/lib/supabase";
import { verifySuperAdmin } from "@/lib/super-admin-auth";
import { getBotInfo } from "@/lib/line";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await verifySuperAdmin(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const shopId = Number(id);
  if (!Number.isFinite(shopId)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: shop } = await db.from("shops").select("*").eq("id", shopId).maybeSingle();
  if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { count: adminCount } = await db
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  const { count: bookingCount } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  return NextResponse.json({
    shop: {
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      timezone: shop.timezone,
      phone: shop.phone,
      address: shop.address,
      logo_url: shop.logo_url,
      business_type: shop.business_type,
      line_oa_id: shop.line_oa_id,
      liff_id: shop.liff_id,
      has_access_token: !!shop.line_channel_access_token,
      has_channel_secret: !!shop.line_channel_secret,
      onboarding_status: shop.onboarding_status,
      created_by_line_id: shop.created_by_line_id,
      theme_id: shop.theme_id,
      points_per_baht: shop.points_per_baht,
    },
    stats: {
      admin_count: adminCount ?? 0,
      booking_count: bookingCount ?? 0,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await verifySuperAdmin(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const shopId = Number(id);
  if (!Number.isFinite(shopId)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: shop } = await db.from("shops").select("*").eq("id", shopId).maybeSingle();
  if (!shop) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const updates: Record<string, any> = {};
  for (const field of [
    "name", "phone", "address", "timezone", "logo_url", "liff_id",
    "business_type", "onboarding_status", "theme_id", "points_per_baht",
  ] as const) {
    if (field in body) updates[field] = body[field] ?? null;
  }

  if (body.line_channel_access_token || body.line_channel_secret) {
    const newToken = body.line_channel_access_token || shop.line_channel_access_token;
    if (!newToken) return NextResponse.json({ error: "missing_access_token" }, { status: 400 });
    const bot = await getBotInfo(newToken);
    if (!bot) return NextResponse.json({ error: "line_rejected_token" }, { status: 400 });
    updates.line_channel_access_token = newToken;
    if (body.line_channel_secret) updates.line_channel_secret = body.line_channel_secret;
    updates.line_oa_id = bot.userId;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true, updated: 0 });

  const { error } = await db.from("shops").update(updates).eq("id", shopId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateShopCache(shopId);

  return NextResponse.json({ ok: true, updated: Object.keys(updates).length });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await verifySuperAdmin(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const shopId = Number(id);
  if (!Number.isFinite(shopId) || shopId === 1) {
    return NextResponse.json({ error: "forbidden" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("shops").delete().eq("id", shopId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateShopCache(shopId);
  return NextResponse.json({ ok: true });
}
