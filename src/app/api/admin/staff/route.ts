import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/staff — list all staff for admin management
export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("staff")
    .select("*")
    .eq("shop_id", identity.shopId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

// POST /api/admin/staff — create a new staff member
export async function POST(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, nickname, bio, avatar_url, active, sort_order } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("staff")
    .insert({
      shop_id: identity.shopId,
      name,
      nickname: nickname ?? null,
      bio: bio ?? null,
      avatar_url: avatar_url ?? null,
      active: active !== false,
      sort_order: Number(sort_order ?? 0),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data }, { status: 201 });
}
