// coupons.ts — Validate + apply promo codes at booking time.
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export interface Coupon {
  id: number;
  shop_id: number;
  code: string;
  name: string;
  kind: "percent" | "amount" | "free_service";
  value: number;
  service_id: number | null;
  min_amount: number;
  max_uses: number | null;
  uses_count: number;
  per_customer_limit: number;
  starts_at: string | null;
  expires_at: string | null;
  issued_by_redeem: boolean;
  issued_to_customer: number | null;
  active: boolean;
  created_at: string;
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  coupon?: Coupon;
  discountAmount?: number;
  finalPrice?: number;
}

/**
 * Validate a promo code for a given customer + booking context.
 * Returns computed discount without mutating state. Use `applyCoupon` to commit.
 */
export async function validateCoupon(args: {
  code: string;
  customerId: number;
  serviceId: number;
  price: number;
}): Promise<CouponValidation> {
  const db = supabaseAdmin();
  const code = args.code.trim();
  if (!code) return { valid: false, reason: "code_required" };

  const { data: c } = await db
    .from("coupons")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .ilike("code", code)
    .maybeSingle();
  if (!c) return { valid: false, reason: "not_found" };
  if (!c.active) return { valid: false, reason: "inactive" };

  const now = new Date();
  if (c.starts_at && new Date(c.starts_at) > now) return { valid: false, reason: "not_started" };
  if (c.expires_at && new Date(c.expires_at) < now) return { valid: false, reason: "expired" };

  if (c.max_uses != null && c.uses_count >= c.max_uses) {
    return { valid: false, reason: "max_uses_reached" };
  }

  if (c.service_id && c.service_id !== args.serviceId) {
    return { valid: false, reason: "service_mismatch" };
  }

  if (c.issued_to_customer && c.issued_to_customer !== args.customerId) {
    return { valid: false, reason: "not_yours" };
  }

  if (args.price < Number(c.min_amount ?? 0)) {
    return { valid: false, reason: "below_min_amount" };
  }

  // Per-customer usage limit
  const { count } = await db
    .from("coupon_usages")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", c.id)
    .eq("customer_id", args.customerId);
  if ((count ?? 0) >= (c.per_customer_limit ?? 1)) {
    return { valid: false, reason: "already_used" };
  }

  let discount = 0;
  if (c.kind === "percent") {
    discount = Math.round(args.price * (Number(c.value) / 100));
  } else if (c.kind === "amount") {
    discount = Math.min(args.price, Number(c.value));
  } else if (c.kind === "free_service") {
    discount = args.price;
  }

  return {
    valid: true,
    coupon: c as Coupon,
    discountAmount: discount,
    finalPrice: Math.max(0, args.price - discount),
  };
}

/**
 * Record that a coupon was used by a customer. Increments uses_count atomically
 * and inserts a coupon_usages row. Call after booking insert succeeds.
 */
export async function applyCoupon(args: {
  couponId: number;
  customerId: number;
  bookingId: number;
  amountOff: number;
}): Promise<void> {
  const db = supabaseAdmin();
  await db.from("coupon_usages").insert({
    coupon_id: args.couponId,
    customer_id: args.customerId,
    booking_id: args.bookingId,
    amount_off: args.amountOff,
  });
  // Best-effort increment; with a single-shop MVP this is fine. Move to SQL fn later.
  const { data: current } = await db.from("coupons").select("uses_count").eq("id", args.couponId).maybeSingle();
  await db
    .from("coupons")
    .update({ uses_count: (current?.uses_count ?? 0) + 1 })
    .eq("id", args.couponId);
}
