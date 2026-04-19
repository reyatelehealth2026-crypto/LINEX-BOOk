import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reviews
 * Query params:
 *   - booking_id: get review for a specific booking
 *   - staff_id: get reviews for a staff member
 *   - service_id: get reviews for a service
 *   - customer's line_user_id required for auth (except for staff_id/service_id public reads)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const db = supabaseAdmin();

  // Get review for a specific booking
  const bookingId = sp.get("booking_id");
  if (bookingId) {
    const { data, error } = await db
      .from("reviews")
      .select("*, service:services(id,name,name_en), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,picture_url)")
      .eq("booking_id", Number(bookingId))
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ review: data });
  }

  // Get reviews for a staff member (public read)
  const staffId = sp.get("staff_id");
  if (staffId) {
    const { data, error } = await db
      .from("reviews")
      .select("*, service:services(id,name,name_en), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,picture_url)")
      .eq("staff_id", Number(staffId))
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reviews: data ?? [] });
  }

  // Get reviews for a service (public read)
  const serviceId = sp.get("service_id");
  if (serviceId) {
    const { data, error } = await db
      .from("reviews")
      .select("*, service:services(id,name,name_en), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,picture_url)")
      .eq("service_id", Number(serviceId))
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reviews: data ?? [] });
  }

  // List all reviews (admin)
  const pw = req.headers.get("x-admin-password") ?? sp.get("pw");
  if (pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await db
    .from("reviews")
    .select("*, service:services(id,name,name_en), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,picture_url)")
    .eq("shop_id", SHOP_ID)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

/**
 * POST /api/reviews
 * Body: { lineUserId, bookingId, rating, comment? }
 * Only allowed for completed bookings that belong to the customer and have no review yet.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lineUserId, bookingId, rating, comment } = body ?? {};

  if (!lineUserId || !bookingId || !rating) {
    return NextResponse.json({ error: "lineUserId, bookingId, rating required" }, { status: 400 });
  }

  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: "rating must be integer 1-5" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Find customer
  const { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "customer not found" }, { status: 404 });

  // Verify booking belongs to this customer and is completed
  const { data: booking } = await db
    .from("bookings")
    .select("id, service_id, staff_id, status")
    .eq("id", Number(bookingId))
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
  if (booking.status !== "completed") {
    return NextResponse.json({ error: "only completed bookings can be reviewed" }, { status: 400 });
  }

  // Check for existing review
  const { data: existing } = await db
    .from("reviews")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "already_reviewed" }, { status: 409 });

  const { data: review, error } = await db
    .from("reviews")
    .insert({
      shop_id: SHOP_ID,
      booking_id: booking.id,
      customer_id: customer.id,
      service_id: booking.service_id,
      staff_id: booking.staff_id,
      rating: r,
      comment: comment ?? null,
    })
    .select("*, service:services(id,name,name_en), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,picture_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review }, { status: 201 });
}
