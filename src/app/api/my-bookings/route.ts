import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fetch bookings for a LINE user (LIFF client). We trust the userId claim here
// for MVP; for stricter security, verify id_token via LINE's verify endpoint.
export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("line_user_id");
  if (!lineUserId) return NextResponse.json({ bookings: [] });
  const db = supabaseAdmin();
  const { data: customer } = await db
    .from("customers").select("id")
    .eq("shop_id", SHOP_ID).eq("line_user_id", lineUserId).maybeSingle();
  if (!customer) return NextResponse.json({ bookings: [] });

  const { data } = await db
    .from("bookings")
    .select("id, starts_at, ends_at, status, price, note, service:services(id,name,name_en), staff:staff(id,nickname,name)")
    .eq("customer_id", customer.id)
    .order("starts_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ bookings: data ?? [] });
}
