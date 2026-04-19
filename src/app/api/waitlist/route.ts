import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — join waitlist (customer-facing)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { lineUserId, serviceId, staffId, desiredDate, desiredTime, note } = body ?? {};

  if (!lineUserId || !serviceId || !desiredDate) {
    return NextResponse.json(
      { error: "lineUserId, serviceId, desiredDate required" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Ensure customer exists
  const { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: "customer not found" }, { status: 404 });
  }

  // Prevent duplicate waitlist entries for same customer+service+date
  const { data: existing } = await db
    .from("waitlist_entries")
    .select("id")
    .eq("customer_id", customer.id)
    .eq("service_id", serviceId)
    .eq("desired_date", desiredDate)
    .eq("status", "waiting")
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "already_on_waitlist", id: existing.id });
  }

  const { data: entry, error } = await db
    .from("waitlist_entries")
    .insert({
      shop_id: SHOP_ID,
      customer_id: customer.id,
      service_id: serviceId,
      staff_id: staffId ?? null,
      desired_date: desiredDate,
      desired_time: desiredTime ?? null,
      status: "waiting",
      note: note ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry });
}

// GET — list waitlist (admin)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const pw = req.headers.get("x-admin-password") ?? sp.get("pw");
  if (pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = sp.get("date"); // YYYY-MM-DD
  const status = sp.get("status"); // waiting, notified, etc.
  const db = supabaseAdmin();

  let q = db
    .from("waitlist_entries")
    .select(
      "*, service:services(id,name,name_en,duration_min), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,line_user_id)"
    )
    .eq("shop_id", SHOP_ID)
    .order("created_at", { ascending: true });

  if (date) q = q.eq("desired_date", date);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}
