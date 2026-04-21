import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { pushMessage, getProfile } from "@/lib/line";
import { bookingConfirmedMessage } from "@/lib/flex";
import { verifyAdmin } from "@/lib/admin-auth";
import { validateCoupon, applyCoupon } from "@/lib/coupons";
import { suggestLeastBusyStaff } from "@/lib/analytics";
import type { BookingWithJoins } from "@/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lineUserId, serviceId, staffId, startIso, note, couponCode } = body ?? {};

  if (!lineUserId || !serviceId || !startIso) {
    return NextResponse.json({ error: "lineUserId, serviceId, startIso required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // ensure customer
  let { data: customer } = await db
    .from("customers")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!customer) {
    const p = await getProfile(lineUserId);
    const { data: inserted } = await db
      .from("customers")
      .insert({
        shop_id: SHOP_ID,
        line_user_id: lineUserId,
        display_name: p?.displayName ?? null,
        picture_url: p?.pictureUrl ?? null
      })
      .select("*")
      .single();
    customer = inserted;
  }

  // Block check — customers with too many no-shows are temporarily blocked
  if (customer?.blocked_until && new Date(customer.blocked_until) > new Date()) {
    const until = new Date(customer.blocked_until).toLocaleDateString("th-TH", {
      day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok",
    });
    return NextResponse.json(
      {
        error: "customer_blocked",
        message: `ไม่สามารถจองได้ เนื่องจากมีประวัติไม่มาตามนัด ${customer.no_show_count ?? 0} ครั้ง — จะกลับมาจองได้ในวันที่ ${until}`,
        blocked_until: customer.blocked_until,
      },
      { status: 403 }
    );
  }

  const { data: service, error: svcErr } = await db
    .from("services")
    .select("id, duration_min, price")
    .eq("id", serviceId)
    .single();
  if (svcErr || !service) {
    return NextResponse.json({ error: "service not found" }, { status: 404 });
  }

  const start = new Date(startIso);
  const end = new Date(start.getTime() + service.duration_min * 60_000);

  // Auto-assign least-busy staff when not specified by the customer
  let effectiveStaffId: number | null = staffId ?? null;
  if (!effectiveStaffId && body?.autoAssign !== false) {
    const dateYmd = start.toISOString().slice(0, 10);
    const suggestion = await suggestLeastBusyStaff({ serviceId, dateYmd });
    effectiveStaffId = suggestion.staffId;
  }

  // Apply coupon (if provided) — compute final price, fail early if invalid
  let finalPrice = Number(service.price);
  let couponInfo: { id: number; amountOff: number } | null = null;
  if (couponCode) {
    const v = await validateCoupon({
      code: couponCode,
      customerId: customer!.id,
      serviceId,
      price: finalPrice,
    });
    if (!v.valid) {
      return NextResponse.json({ error: "invalid_coupon", reason: v.reason }, { status: 400 });
    }
    finalPrice = v.finalPrice ?? finalPrice;
    couponInfo = { id: v.coupon!.id, amountOff: v.discountAmount ?? 0 };
  }

  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      shop_id: SHOP_ID,
      customer_id: customer!.id,
      service_id: serviceId,
      staff_id: effectiveStaffId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "confirmed",
      note: note ?? null,
      price: finalPrice
    })
    .select(
      "*, service:services(id,name,name_en,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id)"
    )
    .single();

  if (error) {
    // 23P01 = exclusion_violation => overlap
    const status = error.code === "23P01" ? 409 : 500;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }

  // Commit coupon usage after successful booking
  if (couponInfo && booking) {
    await applyCoupon({
      couponId: couponInfo.id,
      customerId: customer!.id,
      bookingId: booking.id,
      amountOff: couponInfo.amountOff,
    });
  }

  // Push confirmation to LINE (best-effort)
  try {
    await pushMessage(lineUserId, [bookingConfirmedMessage(booking as BookingWithJoins)]);
  } catch (e) {
    console.error("push confirm err:", e);
  }

  return NextResponse.json({ booking });
}

export async function GET(req: NextRequest) {
  // List bookings — admin use. Accepts either x-admin-password (desktop)
  // or x-line-id-token (LIFF admin area).
  const identity = await verifyAdmin(req);
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date"); // YYYY-MM-DD local shop
  const db = supabaseAdmin();
  let q = db
    .from("bookings")
    .select(
      "*, service:services(id,name,name_en,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id,points,visit_count)"
    )
    .eq("shop_id", SHOP_ID)
    .order("starts_at", { ascending: true });
  if (date) {
    const start = new Date(`${date}T00:00:00+07:00`).toISOString();
    const end = new Date(`${date}T23:59:59+07:00`).toISOString();
    q = q.gte("starts_at", start).lte("starts_at", end);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data ?? [] });
}
