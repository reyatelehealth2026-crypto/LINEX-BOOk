import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/admin/working-hours/[id] — update a working_hours row
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const db = supabaseAdmin();
  const body = await req.json() as {
    day_of_week?: number;
    open_time?: string;
    close_time?: string;
    staff_id?: number | null;
  };

  // Validate time ordering if both provided
  if (body.open_time && body.close_time && body.close_time <= body.open_time) {
    return NextResponse.json({ error: "เวลาปิดต้องมากกว่าเวลาเปิด" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.day_of_week != null) {
    if (body.day_of_week < 0 || body.day_of_week > 6) {
      return NextResponse.json({ error: "วันต้องอยู่ระหว่าง 0-6" }, { status: 400 });
    }
    updates.day_of_week = body.day_of_week;
  }
  if (body.open_time) updates.open_time = body.open_time;
  if (body.close_time) updates.close_time = body.close_time;
  if ("staff_id" in body) updates.staff_id = body.staff_id || null;

  const { data, error } = await db
    .from("working_hours")
    .update(updates)
    .eq("id", id)
    .eq("shop_id", identity.shopId)
    .select("*, staff:staff(id, name, nickname)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "มีเวลาทำการของวัน+ช่างคนนี้อยู่แล้ว" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  return NextResponse.json({ hour: data });
}

// DELETE /api/admin/working-hours/[id] — delete a working_hours row
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("working_hours")
    .delete()
    .eq("id", id)
    .eq("shop_id", identity.shopId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
