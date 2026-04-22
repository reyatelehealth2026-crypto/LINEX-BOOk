import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/working-hours — list all working hours for the shop
export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("working_hours")
    .select("*, staff:staff(id, name, nickname)")
    .eq("shop_id", identity.shopId)
    .order("day_of_week", { ascending: true })
    .order("staff_id", { ascending: true, nullsFirst: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hours: data });
}

// POST /api/admin/working-hours — create a new working_hours row
export async function POST(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const body = await req.json() as {
    day_of_week: number;
    open_time: string;
    close_time: string;
    staff_id?: number | null;
  };

  if (body.day_of_week == null || !body.open_time || !body.close_time) {
    return NextResponse.json({ error: "กรุณาระบุวัน, เวลาเปิด และเวลาปิด" }, { status: 400 });
  }
  if (body.day_of_week < 0 || body.day_of_week > 6) {
    return NextResponse.json({ error: "วันต้องอยู่ระหว่าง 0-6 (อาทิตย์-เสาร์)" }, { status: 400 });
  }
  if (body.close_time <= body.open_time) {
    return NextResponse.json({ error: "เวลาปิดต้องมากกว่าเวลาเปิด" }, { status: 400 });
  }

  const row = {
    shop_id: identity.shopId,
    staff_id: body.staff_id || null,
    day_of_week: body.day_of_week,
    open_time: body.open_time,
    close_time: body.close_time,
  };

  const { data, error } = await db
    .from("working_hours")
    .insert(row)
    .select("*, staff:staff(id, name, nickname)")
    .single();

  if (error) {
    // unique violation: duplicate (shop_id, staff_id, day_of_week)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "มีเวลาทำการของวันนี้อยู่แล้ว กรุณาแก้ไขแถวที่มีอยู่" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ hour: data }, { status: 201 });
}
