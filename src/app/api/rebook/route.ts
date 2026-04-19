import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import type { RebookInfo } from "@/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/rebook?line_user_id=xxx
 * Returns the customer's recent completed bookings suitable for quick rebook.
 * Each entry has service + staff info to pre-fill the booking flow.
 */
export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("line_user_id");
  if (!lineUserId) return NextResponse.json({ rebook_options: [] });

  const db = supabaseAdmin();

  type RebookBookingRow = {
    id: number;
    starts_at: string;
    service: {
      id: number;
      name: string;
      name_en: string | null;
      duration_min: number;
      price: number;
    } | null;
    staff: {
      id: number;
      name: string;
      nickname: string | null;
      avatar_url: string | null;
    } | null;
  };

  const { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ rebook_options: [] });

  // Get last 10 completed bookings for rebook suggestions
  const { data: bookings } = await db
    .from("bookings")
    .select(
      "id, service_id, staff_id, starts_at, status, " +
      "service:services(id, name, name_en, duration_min, price), " +
      "staff:staff(id, name, nickname, avatar_url)"
    )
    .eq("customer_id", customer.id)
    .eq("status", "completed")
    .order("starts_at", { ascending: false })
    .limit(10);

  const rows = (bookings ?? []) as unknown as RebookBookingRow[];

  // Deduplicate by service_id + staff_id combo (most recent first)
  const seen = new Set<string>();
  const deduped: RebookInfo[] = [];

  for (const b of rows) {
    const svc = b.service;
    const stf = b.staff;
    if (!svc) continue;
    const key = `${svc.id}-${stf?.id ?? "any"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      booking_id: b.id,
      service: { id: svc.id, name: svc.name, name_en: svc.name_en, duration_min: svc.duration_min, price: svc.price },
      staff: stf ? { id: stf.id, name: stf.name, nickname: stf.nickname, avatar_url: stf.avatar_url } : null,
      completed_at: b.starts_at,
    });
  }

  return NextResponse.json({ rebook_options: deduped });
}
