import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { pushMessage, getProfile } from "@/lib/line";
import { bookingConfirmedMessage } from "@/lib/flex";
import type { BookingWithJoins } from "@/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lineUserId, serviceId, staffId, startIso, note } = body ?? {};

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

  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      shop_id: SHOP_ID,
      customer_id: customer!.id,
      service_id: serviceId,
      staff_id: staffId ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "confirmed",
      note: note ?? null,
      price: service.price
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

  // Push confirmation to LINE (best-effort)
  try {
    await pushMessage(lineUserId, [bookingConfirmedMessage(booking as BookingWithJoins)]);
  } catch (e) {
    console.error("push confirm err:", e);
  }

  return NextResponse.json({ booking });
}

export async function GET(req: NextRequest) {
  // List bookings — admin use (requires admin password)
  const sp = req.nextUrl.searchParams;
  const pw = req.headers.get("x-admin-password") ?? sp.get("pw");
  if (pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
