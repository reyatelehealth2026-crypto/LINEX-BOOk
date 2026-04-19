import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, SHOP_ID } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw && pw === process.env.ADMIN_PASSWORD;
}

const VALID_CATEGORIES = ["reminder", "promo", "follow_up", "custom"] as const;

// GET — list all message templates for this shop
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("message_templates")
    .select("*")
    .eq("shop_id", SHOP_ID)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data });
}

// POST — create a new message template
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, category, subject, body: tplBody, active, sort_order } = body;

  if (!name || !tplBody) {
    return NextResponse.json({ error: "name and body are required" }, { status: 400 });
  }

  const cat = category ?? "custom";
  if (!VALID_CATEGORIES.includes(cat)) {
    return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("message_templates")
    .insert({
      shop_id: SHOP_ID,
      name,
      category: cat,
      subject: subject ?? null,
      body: tplBody,
      active: active !== false,
      sort_order: Number(sort_order ?? 0),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
