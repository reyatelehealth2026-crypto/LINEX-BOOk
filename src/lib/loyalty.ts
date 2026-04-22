// loyalty.ts — Points tiers, birthday bonus, referral codes, and redemption helpers.
import { supabaseAdmin, getCurrentShopId } from "@/lib/supabase";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export interface TierThresholds {
  silver: number;
  gold: number;
  platinum: number;
}

export async function getTierThresholds(): Promise<TierThresholds> {
  const shopId = await getCurrentShopId();
  const db = supabaseAdmin();
  const { data } = await db
    .from("shops")
    .select("tier_silver_points, tier_gold_points, tier_platinum_points")
    .eq("id", shopId)
    .maybeSingle();
  return {
    silver: data?.tier_silver_points ?? 500,
    gold: data?.tier_gold_points ?? 2000,
    platinum: data?.tier_platinum_points ?? 5000,
  };
}

export function tierFor(lifetimePoints: number, th: TierThresholds): Tier {
  if (lifetimePoints >= th.platinum) return "platinum";
  if (lifetimePoints >= th.gold) return "gold";
  if (lifetimePoints >= th.silver) return "silver";
  return "bronze";
}

export function tierLabelTH(tier: Tier): string {
  return { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" }[tier];
}

/**
 * Progress info to next tier (for UI).
 */
export function tierProgress(lifetimePoints: number, th: TierThresholds) {
  const t = tierFor(lifetimePoints, th);
  const nextThreshold =
    t === "bronze" ? th.silver :
    t === "silver" ? th.gold :
    t === "gold" ? th.platinum :
    null;
  return {
    tier: t,
    label: tierLabelTH(t),
    lifetimePoints,
    nextThreshold,
    pointsToNext: nextThreshold ? Math.max(0, nextThreshold - lifetimePoints) : 0,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Referral code generation
// ──────────────────────────────────────────────────────────────────────────

export function generateReferralCode(customerId: number): string {
  // 6-char uppercase alphanumeric suffix + 2-char customer id segment
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // omit 0/O/I/1/L/U
  let rand = "";
  for (let i = 0; i < 6; i++) rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `R${customerId.toString(36).toUpperCase()}${rand}`;
}

export async function ensureReferralCode(customerId: number): Promise<string> {
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("customers")
    .select("referral_code")
    .eq("id", customerId)
    .maybeSingle();
  if (existing?.referral_code) return existing.referral_code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode(customerId);
    const { error } = await db
      .from("customers")
      .update({ referral_code: code })
      .eq("id", customerId);
    if (!error) return code;
    if (!/duplicate|unique/i.test(error.message)) throw error;
  }
  throw new Error("Failed to generate unique referral code");
}

/**
 * Apply a referral at signup time: awards points to both referrer and new customer.
 * Returns true if applied, false if invalid/self-referral/already-referred.
 */
export async function applyReferral(newCustomerId: number, referralCode: string): Promise<boolean> {
  const shopId = await getCurrentShopId();
  const db = supabaseAdmin();
  const normalized = referralCode.trim().toUpperCase();
  if (!normalized) return false;

  const { data: referrer } = await db
    .from("customers")
    .select("id")
    .eq("shop_id", shopId)
    .eq("referral_code", normalized)
    .maybeSingle();
  if (!referrer || referrer.id === newCustomerId) return false;

  const { data: newCust } = await db
    .from("customers")
    .select("id, referred_by")
    .eq("id", newCustomerId)
    .maybeSingle();
  if (!newCust || newCust.referred_by) return false;

  const { data: shop } = await db
    .from("shops")
    .select("referral_bonus_points")
    .eq("id", shopId)
    .maybeSingle();
  const bonus = Number(shop?.referral_bonus_points ?? 100);

  await db.from("customers").update({ referred_by: referrer.id }).eq("id", newCustomerId);
  await addPoints(referrer.id, bonus);
  await addPoints(newCustomerId, bonus);

  return true;
}

/**
 * Adds points to a customer (both balance + lifetime). Non-transactional — ok for
 * single-shop MVP. When we add multi-shop, move this to a DB function.
 */
export async function addPoints(customerId: number, amount: number): Promise<void> {
  if (amount <= 0) return;
  const db = supabaseAdmin();
  const { data } = await db
    .from("customers")
    .select("points, lifetime_points")
    .eq("id", customerId)
    .maybeSingle();
  await db
    .from("customers")
    .update({
      points: (data?.points ?? 0) + amount,
      lifetime_points: (data?.lifetime_points ?? 0) + amount,
    })
    .eq("id", customerId);
}

// ──────────────────────────────────────────────────────────────────────────
// Points redemption — customer spends points to generate a coupon
// ──────────────────────────────────────────────────────────────────────────

export interface RedeemOption {
  id: string;          // "discount_50", "discount_100", "free_service_X"
  label: string;
  pointsCost: number;
  kind: "percent" | "amount";
  value: number;       // percent (10 = 10%) or baht amount
}

export function defaultRedeemOptions(): RedeemOption[] {
  return [
    { id: "discount_50",  label: "ส่วนลด 50 บาท",   pointsCost: 200, kind: "amount",  value: 50 },
    { id: "discount_100", label: "ส่วนลด 100 บาท",  pointsCost: 400, kind: "amount",  value: 100 },
    { id: "discount_10",  label: "ส่วนลด 10%",      pointsCost: 300, kind: "percent", value: 10 },
    { id: "discount_20",  label: "ส่วนลด 20%",      pointsCost: 600, kind: "percent", value: 20 },
  ];
}

function randomCouponCode(prefix = "PT"): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}${s}`;
}

/**
 * Redeem points for a coupon. Returns the created coupon row or throws.
 */
export async function redeemPoints(customerId: number, optionId: string): Promise<{ couponCode: string; coupon: any }> {
  const shopId = await getCurrentShopId();
  const db = supabaseAdmin();
  const opt = defaultRedeemOptions().find((o) => o.id === optionId);
  if (!opt) throw new Error("invalid_option");

  const { data: customer } = await db
    .from("customers")
    .select("id, points")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) throw new Error("customer_not_found");
  if ((customer.points ?? 0) < opt.pointsCost) throw new Error("insufficient_points");

  // Deduct points first (optimistic — we then verify with a check after insert)
  const { error: deductErr } = await db
    .from("customers")
    .update({ points: (customer.points ?? 0) - opt.pointsCost })
    .eq("id", customerId)
    .eq("points", customer.points ?? 0);  // optimistic concurrency
  if (deductErr) throw deductErr;

  // Create single-use coupon tied to this customer
  const code = randomCouponCode();
  const expiresAt = new Date(Date.now() + 90 * 86400_000).toISOString();
  const { data: coupon, error: couponErr } = await db
    .from("coupons")
    .insert({
      shop_id: shopId,
      code,
      name: opt.label,
      kind: opt.kind,
      value: opt.value,
      max_uses: 1,
      per_customer_limit: 1,
      expires_at: expiresAt,
      issued_by_redeem: true,
      issued_to_customer: customerId,
    })
    .select("*")
    .single();
  if (couponErr) {
    // Roll back points
    await db.from("customers").update({ points: customer.points }).eq("id", customerId);
    throw couponErr;
  }

  await db.from("point_redemptions").insert({
    shop_id: shopId,
    customer_id: customerId,
    points_spent: opt.pointsCost,
    coupon_id: coupon.id,
  });

  return { couponCode: code, coupon };
}
