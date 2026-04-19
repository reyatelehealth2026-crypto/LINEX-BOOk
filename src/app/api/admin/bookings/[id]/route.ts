import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";
import { pushMessage } from "@/lib/line";
import { textMessage } from "@/lib/flex";
import { verifyAdmin } from "@/lib/admin-auth";
import type { BookingStatus } from "@/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH — change status / confirm / complete / cancel / no_show
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  const { status } = (await req.json()) as { status: BookingStatus };
  if (!["pending", "confirmed", "completed", "cancelled", "no_show"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const db = supabaseAdmin();

  const { data: current } = await db
    .from("bookings")
    .select("*, customer:customers(id,line_user_id,points,visit_count), service:services(name,price)")
    .eq("id", id)
    .single();
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updates: Record<string, unknown> = { status };

  // On completion: add points + increment visit count
  if (status === "completed" && current.status !== "completed") {
    const { data: shop } = await db.from("shops").select("points_per_baht").eq("id", SHOP_ID).single();
    const earned = Math.round(Number(current.price) * Number(shop?.points_per_baht ?? 0));
    updates.points_earned = earned;
    await db
      .from("customers")
      .update({
        points: (current.customer?.points ?? 0) + earned,
        visit_count: (current.customer?.visit_count ?? 0) + 1
      })
      .eq("id", current.customer_id);
  }

  const { data, error } = await db.from("bookings").update(updates).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify customer
  if (current.customer?.line_user_id) {
    const map: Record<BookingStatus, string> = {
      pending: "คิวของคุณถูกเปลี่ยนเป็นรอยืนยัน",
      confirmed: "ร้านยืนยันคิวของคุณแล้ว ✅",
      completed: `ขอบคุณที่มาใช้บริการค่ะ 💚 ได้รับ ${updates.points_earned ?? 0} แต้มสะสม`,
      cancelled: "คิวของคุณถูกยกเลิกแล้ว",
      no_show: "ไม่พบคุณตามเวลานัด หากต้องการจองใหม่ทักร้านได้ค่ะ"
    };
    try {
      await pushMessage(current.customer.line_user_id, [textMessage(map[status])]);
    } catch (e) {
      console.error("notify err:", e);
    }
  }

  return NextResponse.json({ booking: data });
}
