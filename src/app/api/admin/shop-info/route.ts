import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getCurrentShop, invalidateShopCache } from "@/lib/supabase";
import { verifyAdmin, unauthorized } from "@/lib/admin-auth";
import { getBotInfo } from "@/lib/line";

// GET  /api/admin/shop-info  — returns shop profile (minus secrets)
// PATCH /api/admin/shop-info — updates editable fields
//
// Editable fields: name, phone, address, timezone, logo_url,
//                  line_channel_access_token, line_channel_secret, liff_id

export async function GET(req: NextRequest) {
  const who = await verifyAdmin(req);
  if (!who) return unauthorized();
  const shop = await getCurrentShop();
  return NextResponse.json({
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    phone: shop.phone,
    address: shop.address,
    timezone: shop.timezone,
    logo_url: shop.logo_url,
    business_type: shop.business_type,
    line_oa_id: shop.line_oa_id,
    liff_id: shop.liff_id,
    // Never expose the raw token/secret. Indicate presence only.
    has_access_token: !!shop.line_channel_access_token,
    has_channel_secret: !!shop.line_channel_secret,
    onboarding_status: shop.onboarding_status,
  });
}

export async function PATCH(req: NextRequest) {
  const who = await verifyAdmin(req);
  if (!who) return unauthorized();
  const shop = await getCurrentShop();

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const updates: Record<string, any> = {};
  for (const field of ["name", "phone", "address", "timezone", "logo_url", "liff_id"] as const) {
    if (field in body) updates[field] = body[field] ?? null;
  }

  // Credential rotation — re-verify before saving so we don't brick the shop.
  let rotatingCreds = false;
  if (body.line_channel_access_token || body.line_channel_secret) {
    const newToken = body.line_channel_access_token || shop.line_channel_access_token;
    if (!newToken) return NextResponse.json({ error: "missing access token" }, { status: 400 });
    const bot = await getBotInfo(newToken);
    if (!bot) return NextResponse.json({ error: "LINE rejected the new token" }, { status: 400 });
    updates.line_channel_access_token = newToken;
    if (body.line_channel_secret) updates.line_channel_secret = body.line_channel_secret;
    updates.line_oa_id = bot.userId;
    rotatingCreds = true;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true, updated: 0 });

  const { error } = await supabaseAdmin().from("shops").update(updates).eq("id", shop.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateShopCache(shop.id);

  return NextResponse.json({ ok: true, updated: Object.keys(updates).length, rotatingCreds });
}
