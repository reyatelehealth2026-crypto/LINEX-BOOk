import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import {
  getTierThresholds,
  tierProgress,
  ensureReferralCode,
  applyReferral,
  defaultRedeemOptions,
  redeemPoints,
} from "@/lib/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/loyalty?lineUserId=...
 * Returns tier progress, balance, referral code, and redeem menu for the customer.
 */
export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) return NextResponse.json({ error: "lineUserId required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: customer } = await db
    .from("customers")
    .select("id, points, lifetime_points, referral_code, referred_by, birthday, full_name, display_name")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "customer_not_found" }, { status: 404 });

  const code = customer.referral_code ?? (await ensureReferralCode(customer.id));
  const th = await getTierThresholds();
  const progress = tierProgress(customer.lifetime_points ?? 0, th);

  return NextResponse.json({
    balance: customer.points ?? 0,
    tier: progress,
    referral_code: code,
    redeem_options: defaultRedeemOptions(),
  });
}

/**
 * POST /api/loyalty
 * Body: { lineUserId, action: "redeem" | "apply_referral", optionId?, code? }
 */
export async function POST(req: NextRequest) {
  const { lineUserId, action, optionId, code } = (await req.json()) ?? {};
  if (!lineUserId || !action) {
    return NextResponse.json({ error: "lineUserId and action required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data: customer } = await db
    .from("customers")
    .select("id, points")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "customer_not_found" }, { status: 404 });

  if (action === "redeem") {
    if (!optionId) return NextResponse.json({ error: "optionId required" }, { status: 400 });
    try {
      const result = await redeemPoints(customer.id, optionId);
      return NextResponse.json({ ok: true, coupon_code: result.couponCode, coupon: result.coupon });
    } catch (err: any) {
      const status = err?.message === "insufficient_points" ? 400 : 500;
      return NextResponse.json({ error: err?.message ?? "redeem_failed" }, { status });
    }
  }

  if (action === "apply_referral") {
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
    const ok = await applyReferral(customer.id, code);
    return NextResponse.json({ ok });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
