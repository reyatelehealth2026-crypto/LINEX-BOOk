import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

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

  const { error } = await db
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("customer_id", customer.id)
    .in("status", ["pending", "confirmed"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
