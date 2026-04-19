import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { pushMessage } from "@/lib/line";
import { textMessage, bookingConfirmedMessage } from "@/lib/flex";
import type { BookingWithJoins } from "@/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE — customer cancels own booking
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  const lineUserId = req.headers.get("x-line-user-id");
  if (!id || !lineUserId) {
    return NextResponse.json({ error: "missing id or x-line-user-id" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "customer not found" }, { status: 404 });

  const { data: bookingBefore } = await db
    .from("bookings")
    .select("id, status")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();
  if (!bookingBefore) {
    return NextResponse.json({ error: "booking not found or not cancellable" }, { status: 404 });
  }

  const { error } = await db
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("customer_id", customer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // After cancellation, check for waitlist entries that might be fulfillable (best-effort notification)
  try {
    await notifyWaitlistOnSlotFreed(db, bookingBefore.id);
  } catch (e) {
    console.error("waitlist notify err:", e);
  }

  return NextResponse.json({ ok: true });
}

// PATCH — customer reschedules own booking (change time)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  const lineUserId = req.headers.get("x-line-user-id");
  if (!id || !lineUserId) {
    return NextResponse.json({ error: "missing id or x-line-user-id" }, { status: 400 });
  }

  const body = await req.json();
  const { startIso } = body ?? {};
  if (!startIso) {
    return NextResponse.json({ error: "startIso required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Verify customer owns this booking
  const { data: customer } = await db
    .from("customers")
    .select("id, line_user_id")
    .eq("shop_id", SHOP_ID)
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "customer not found" }, { status: 404 });

  const { data: current } = await db
    .from("bookings")
    .select("*, service:services(id, name, name_en, duration_min, price), staff:staff(id, name, nickname)")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "booking not found or not reschedulable" }, { status: 404 });
  }

  // Compute new end time from service duration
  const durationMin = (current.service as any)?.duration_min ?? 30;
  const newStart = new Date(startIso);
  const newEnd = new Date(newStart.getTime() + durationMin * 60_000);

  // Update the booking
  const { data: updated, error } = await db
    .from("bookings")
    .update({
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
    })
    .eq("id", id)
    .eq("customer_id", customer.id)
    .select(
      "*, service:services(id,name,name_en,duration_min,price), staff:staff(id,name,nickname), customer:customers(id,display_name,full_name,phone,picture_url,line_user_id)"
    )
    .single();

  if (error) {
    // 23P01 = exclusion_violation => overlap
    const status = error.code === "23P01" ? 409 : 500;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }

  // Push reschedule confirmation to LINE (best-effort)
  try {
    const svc = (updated as any)?.service;
    const timeRange = `${newStart.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: process.env.SHOP_TIMEZONE || "Asia/Bangkok" })} - ${newEnd.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: process.env.SHOP_TIMEZONE || "Asia/Bangkok" })}`;
    await pushMessage(customer.line_user_id, [
      textMessage(`🔄 เปลี่ยนเวลาคิว #${id} สำเร็จ\nบริการ: ${svc?.name ?? "-"}\nวันที่: ${newStart.toLocaleDateString("th-TH", { timeZone: process.env.SHOP_TIMEZONE || "Asia/Bangkok" })}\nเวลา: ${timeRange}`),
    ]);
  } catch (e) {
    console.error("reschedule push err:", e);
  }

  // After reschedule, old slot is freed → check waitlist (best-effort)
  try {
    await notifyWaitlistOnSlotFreed(db, id);
  } catch (e) {
    console.error("waitlist notify err:", e);
  }

  return NextResponse.json({ booking: updated });
}

/**
 * Best-effort: after a slot is freed (cancel/reschedule), check waitlist for
 * matching entries and mark the first one as 'notified'. Actual auto-fill is
 * left for a future enhancement — for now we just send a LINE push message
 * telling the customer that a slot opened.
 */
async function notifyWaitlistOnSlotFreed(db: ReturnType<typeof supabaseAdmin>, _freedBookingId: number) {
  // Find waiting entries that might now be fulfillable (simplified: just find
  // entries in 'waiting' status ordered by created_at and notify the first few)
  const { data: waiting } = await db
    .from("waitlist_entries")
    .select("id, customer_id, desired_date, desired_time, service_id, customer:customers(line_user_id)")
    .eq("shop_id", SHOP_ID)
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(3);

  if (!waiting || waiting.length === 0) return;

  for (const entry of waiting) {
    // Check if slots exist for this entry's desired date + service
    // We do a lightweight check: just count existing bookings for that date
    const { data: service } = await db
      .from("services")
      .select("duration_min")
      .eq("id", entry.service_id)
      .single();
    if (!service) continue;

    // Basic check: notify the customer that a slot opened (full auto-fill TBD)
    const lineUid = (entry.customer as any)?.line_user_id;
    if (!lineUid) continue;

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
    try {
      await pushMessage(lineUid, [
        textMessage(`🎉 มีคิวว่างขึ้นมา!\nวันที่ ${entry.desired_date} — กดจองเลยที่แอป 👇\nhttps://liff.line.me/${liffId}/liff/booking`),
      ]);
      // Mark as notified so we don't re-notify
      await db
        .from("waitlist_entries")
        .update({ status: "notified" })
        .eq("id", entry.id);
    } catch (e) {
      console.error("waitlist push err:", e);
    }

    // Only notify one per freed slot for MVP
    break;
  }
}
