import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — list all services for this shop (including inactive)
export async function GET(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("shop_id", identity.shopId)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

// POST — create a new service
export async function POST(req: NextRequest) {
  const identity = await verifyAdmin(req);
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, name_en, description, duration_min, price, active, sort_order, image_url } = body;

  if (!name || !duration_min || price == null) {
    return NextResponse.json({ error: "name, duration_min, price are required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("services")
    .insert({
      shop_id: identity.shopId,
      name,
      name_en: name_en ?? null,
      description: description ?? null,
      duration_min: Number(duration_min),
      price: Number(price),
      image_url: image_url ?? null,
      active: active !== false,
      sort_order: Number(sort_order ?? 0),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}
