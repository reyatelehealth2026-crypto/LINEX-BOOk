import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw && pw === process.env.ADMIN_PASSWORD;
}

// GET — list all services for this shop (including inactive)
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

// POST — create a new service
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, name_en, description, duration_min, price, active, sort_order } = body;

  if (!name || !duration_min || price == null) {
    return NextResponse.json({ error: "name, duration_min, price are required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("services")
    .insert({
      shop_id: SHOP_ID,
      name,
      name_en: name_en ?? null,
      description: description ?? null,
      duration_min: Number(duration_min),
      price: Number(price),
      active: active !== false,
      sort_order: Number(sort_order ?? 0),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}
