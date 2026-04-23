import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH — update waitlist entry status (admin)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  const { status } = (await req.json()) as { status: string };

  const validStatuses = ["waiting", "notified", "fulfilled", "expired", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("waitlist_entries")
    .update({ status })
    .eq("id", id)
    .eq("shop_id", identity.shopId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ entry: data });
}

// DELETE — remove waitlist entry (admin)
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = Number(idStr);

  const db = supabaseAdmin();
  const { error } = await db
    .from("waitlist_entries")
    .delete()
    .eq("id", id)
    .eq("shop_id", identity.shopId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
