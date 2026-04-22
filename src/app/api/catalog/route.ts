import { NextResponse } from "next/server";
import { supabasePublic, getCurrentShopId } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const shopId = await getCurrentShopId();
  const db = supabasePublic();
  const [services, staff, hours, staffServices] = await Promise.all([
    db.from("services").select("*").eq("shop_id", shopId).eq("active", true).order("sort_order"),
    db.from("staff").select("*").eq("shop_id", shopId).eq("active", true).order("sort_order"),
    db.from("working_hours").select("*").eq("shop_id", shopId),
    db.from("staff_services").select("*")
  ]);
  return NextResponse.json({
    services: services.data ?? [],
    staff: staff.data ?? [],
    working_hours: hours.data ?? [],
    staff_services: staffServices.data ?? []
  });
}
